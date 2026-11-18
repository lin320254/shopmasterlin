import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const BOOTSTRAPPED_ADMIN_EMAIL = 'junighkhan786@gmail.com';

interface FirebaseAppletConfig {
  apiKey?: string;
}

interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

interface OrderNotifyItem {
  titleEn?: string;
  titleMm?: string;
  variantLabelEn?: string;
  variantLabelMm?: string;
  quantity?: number;
  unitPriceMmk?: number;
}

interface OrderNotifyPayload {
  orderNumber?: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryContact?: string;
  paymentMethodName?: string;
  receiptLast4?: string;
  totalMmk?: number;
  discountMmk?: number;
  promoCode?: string;
  storeName?: string;
  items?: OrderNotifyItem[];
  receiptImageDataUrl?: string;
}

function loadFirebaseApiKey(): string {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as FirebaseAppletConfig;
    return parsed.apiKey || '';
  } catch {
    return '';
  }
}

const FIREBASE_API_KEY = loadFirebaseApiKey();

async function verifyFirebaseBearerToken(authHeader: string | undefined): Promise<VerifiedFirebaseUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken || !FIREBASE_API_KEY) {
    return null;
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as {
      users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (!user?.localId) {
      return null;
    }
    return {
      uid: user.localId,
      email: user.email || '',
      emailVerified: Boolean(user.emailVerified),
    };
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMmkText(amount: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount))} MMK`;
}

function parseImageDataUrl(dataUrl: string): { mimeType: string; extension: string; buffer: Buffer } | null {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) {
    return null;
  }
  const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
    return null;
  }
  return { mimeType, extension, buffer };
}

async function sendTelegramText(botToken: string, chatId: string, htmlText: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: htmlText,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const json = (await res.json()) as { ok?: boolean; description?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.description || `Telegram sendMessage failed (${res.status})`);
  }
}

async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  image: { mimeType: string; extension: string; buffer: Buffer },
  captionHtml: string,
  filename: string
) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', captionHtml.slice(0, 1024));
  form.append('parse_mode', 'HTML');
  const blob = new Blob([new Uint8Array(image.buffer)], { type: image.mimeType });
  form.append('photo', blob, filename);

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
  const json = (await res.json()) as { ok?: boolean; description?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.description || `Telegram sendPhoto failed (${res.status})`);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/telegram/status', async (req, res) => {
    const verifiedUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!verifiedUser || !verifiedUser.emailVerified || verifiedUser.email !== BOOTSTRAPPED_ADMIN_EMAIL) {
      res.status(403).json({ error: 'Admin authentication required' });
      return;
    }

    const hasBotToken = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
    const hasChatId = Boolean(process.env.TELEGRAM_CHAT_ID?.trim());
    res.json({
      configured: hasBotToken && hasChatId,
      hasBotToken,
      hasChatId,
    });
  });

  app.post('/api/telegram/test', async (req, res) => {
    const verifiedUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!verifiedUser || !verifiedUser.emailVerified || verifiedUser.email !== BOOTSTRAPPED_ADMIN_EMAIL) {
      res.status(403).json({ ok: false, error: 'Admin authentication required' });
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (!botToken || !chatId) {
      res.status(400).json({
        ok: false,
        error: 'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment secrets to enable alerts.',
      });
      return;
    }

    const storeName = escapeHtml(String((req.body as { storeName?: string })?.storeName || 'Aurelia Commerce'));
    try {
      await sendTelegramText(
        botToken,
        chatId,
        `<b>${storeName}</b> — Telegram order alert bot is connected and ready to receive payment verification screenshots.`
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to send Telegram test message',
      });
    }
  });

  app.post('/api/telegram/notify-order', async (req, res) => {
    const verifiedUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!verifiedUser || !verifiedUser.emailVerified) {
      res.status(401).json({ ok: false, error: 'Verified authentication required' });
      return;
    }

    const body = (req.body || {}) as OrderNotifyPayload;
    if (body.userId && body.userId !== verifiedUser.uid) {
      res.status(403).json({ ok: false, error: 'Order user mismatch' });
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (!botToken || !chatId) {
      res.json({ ok: true, skipped: true, reason: 'telegram_not_configured' });
      return;
    }

    const storeName = escapeHtml((body.storeName || 'Aurelia Commerce').slice(0, 80));
    const orderNumber = escapeHtml((body.orderNumber || 'NEW-ORDER').slice(0, 40));
    const customerName = escapeHtml((body.customerName || 'Customer').slice(0, 100));
    const customerEmail = escapeHtml((body.customerEmail || verifiedUser.email || '').slice(0, 160));
    const customerPhone = escapeHtml((body.customerPhone || '').slice(0, 40));
    const deliveryContact = escapeHtml((body.deliveryContact || '').slice(0, 300));
    const paymentMethod = escapeHtml((body.paymentMethodName || 'QR Payment').slice(0, 60));
    const receiptLast4 = escapeHtml((body.receiptLast4 || '----').slice(0, 4));
    const totalText = formatMmkText(Number(body.totalMmk) || 0);
    const promoCode = body.promoCode ? escapeHtml(body.promoCode.slice(0, 40)) : '';

    const itemsLines = (Array.isArray(body.items) ? body.items : [])
      .slice(0, 15)
      .map((item) => {
        const title = escapeHtml((item.titleEn || item.titleMm || 'Item').slice(0, 80));
        const variant = escapeHtml((item.variantLabelEn || item.variantLabelMm || '').slice(0, 40));
        const qty = Number(item.quantity) || 1;
        const lineTotal = formatMmkText((Number(item.unitPriceMmk) || 0) * qty);
        return `• ${qty}x ${title}${variant ? ` (${variant})` : ''} — ${lineTotal}`;
      })
      .join('\n');

    const lines = [
      `<b>New Order · ${storeName}</b>`,
      `Order: <code>${orderNumber}</code>`,
      `Total: <b>${totalText}</b>${promoCode ? ` (Promo: <code>${promoCode}</code>)` : ''}`,
      `Payment: ${paymentMethod} · Slip Last 4: <code>#${receiptLast4}</code>`,
      ``,
      `<b>Customer</b>`,
      `${customerName} (${customerEmail})${customerPhone ? ` · ${customerPhone}` : ''}`,
      `Delivery: ${deliveryContact}`,
      ``,
      `<b>Items</b>`,
      itemsLines || '• Order items attached',
    ];

    const appUrl = process.env.APP_URL?.trim();
    if (appUrl && appUrl !== 'MY_APP_URL') {
      lines.push('', `<a href="${escapeHtml(appUrl)}">Open Admin Studio to Verify</a>`);
    }

    const fullHtml = lines.join('\n');
    const parsedImage = body.receiptImageDataUrl ? parseImageDataUrl(body.receiptImageDataUrl) : null;

    try {
      if (parsedImage) {
        if (fullHtml.length <= 1024) {
          await sendTelegramPhoto(
            botToken,
            chatId,
            parsedImage,
            fullHtml,
            `receipt-${orderNumber}.${parsedImage.extension}`
          );
        } else {
          const shortCaption = [
            `<b>New Order · ${storeName}</b>`,
            `Order: <code>${orderNumber}</code> · <b>${totalText}</b>`,
            `Payment: ${paymentMethod} · Slip Last 4: <code>#${receiptLast4}</code>`,
            `Customer: ${customerName} (${deliveryContact})`,
          ].join('\n');
          await sendTelegramPhoto(
            botToken,
            chatId,
            parsedImage,
            shortCaption,
            `receipt-${orderNumber}.${parsedImage.extension}`
          );
          await sendTelegramText(botToken, chatId, fullHtml);
        }
      } else {
        await sendTelegramText(botToken, chatId, fullHtml);
      }
      res.json({ ok: true });
    } catch (err) {
      // Fallback to plain text alert if photo upload failed
      try {
        await sendTelegramText(botToken, chatId, fullHtml);
        res.json({ ok: true, fallbackText: true });
      } catch (fallbackErr) {
        console.error('Telegram notification error:', err, fallbackErr);
        res.status(502).json({
          ok: false,
          error: fallbackErr instanceof Error ? fallbackErr.message : 'Telegram delivery failed',
        });
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
