import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BOOTSTRAPPED_ADMIN_EMAIL = 'junighkhan786@gmail.com';

interface FirebaseAppletConfig {
  apiKey?: string;
  projectId?: string;
  firestoreDatabaseId?: string;
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  idToken: string;
}

export interface OrderNotifyItem {
  titleEn?: string;
  titleMm?: string;
  variantLabelEn?: string;
  variantLabelMm?: string;
  quantity?: number;
  unitPriceMmk?: number;
}

export interface OrderNotifyPayload {
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
  status?: string;
  deliveryPayload?: string;
  adminNote?: string;
  customHeaderNote?: string;
  includeReceiptPhoto?: boolean;
  items?: OrderNotifyItem[];
  receiptImageDataUrl?: string;
}

function loadFirebaseAppletConfig(): FirebaseAppletConfig {
  const candidates: string[] = [path.resolve(process.cwd(), 'firebase-applet-config.json')];
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(path.resolve(currentDir, '../firebase-applet-config.json'));
  } catch {
    // Fallback to process.cwd() candidate only
  }
  for (const configPath of candidates) {
    try {
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(raw) as FirebaseAppletConfig;
      }
    } catch {
      // Try next candidate
    }
  }
  return {};
}

const FIREBASE_CONFIG = loadFirebaseAppletConfig();

export async function verifyFirebaseBearerToken(
  authHeader: string | null | undefined
): Promise<VerifiedFirebaseUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  const apiKey = FIREBASE_CONFIG.apiKey;
  if (!idToken || !apiKey) {
    return null;
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
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
      idToken,
    };
  } catch {
    return null;
  }
}

export async function isVerifiedAdminUser(user: VerifiedFirebaseUser | null): Promise<boolean> {
  if (!user || !user.emailVerified) {
    return false;
  }
  if (user.email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  const projectId = FIREBASE_CONFIG.projectId;
  const databaseId = FIREBASE_CONFIG.firestoreDatabaseId || '(default)';
  if (!projectId) {
    return false;
  }
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/admins/${encodeURIComponent(user.uid)}`,
      {
        headers: { Authorization: `Bearer ${user.idToken}` },
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMmkText(amount: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount))} MMK`;
}

function parseImageDataUrl(
  dataUrl: string
): { mimeType: string; extension: string; buffer: Buffer } | null {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl.trim()
  );
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

export async function sendTelegramText(botToken: string, chatId: string, htmlText: string) {
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

export async function sendTelegramPhoto(
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

export async function getTelegramIntegrationStatus() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() || '';
  const hasBotToken = Boolean(botToken);
  const hasChatId = Boolean(chatId);

  let botUsername = '';
  let botFirstName = '';
  let botReachable = false;
  let botError = '';

  if (botToken) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
        signal: AbortSignal.timeout(5000),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        description?: string;
        result?: { username?: string; first_name?: string };
      };
      if (res.ok && json.ok && json.result) {
        botReachable = true;
        botUsername = json.result.username || '';
        botFirstName = json.result.first_name || '';
      } else {
        botError = json.description || `Telegram getMe failed (${res.status})`;
      }
    } catch (err) {
      botError = err instanceof Error ? err.message : 'Unable to reach Telegram API';
    }
  }

  return {
    configured: hasBotToken && hasChatId,
    hasBotToken,
    hasChatId,
    botUsername,
    botFirstName,
    botReachable,
    botError,
  };
}

export async function sendTelegramTestAlert(params: {
  storeName?: string;
  customHeaderNote?: string;
}) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken || !chatId) {
    return {
      status: 400,
      body: {
        ok: false,
        error:
          'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment secrets to enable alerts.',
      },
    };
  }

  const storeName = escapeHtml(String(params.storeName || 'Aurelia Commerce').slice(0, 80));
  const headerNote = params.customHeaderNote?.trim()
    ? `<i>${escapeHtml(params.customHeaderNote.trim().slice(0, 120))}</i>\n`
    : '';
  try {
    await sendTelegramText(
      botToken,
      chatId,
      `${headerNote}<b>${storeName}</b> — Telegram order alert bot is connected and ready to receive payment verification screenshots.`
    );
    return { status: 200, body: { ok: true } };
  } catch (err) {
    return {
      status: 502,
      body: {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to send Telegram test message',
      },
    };
  }
}

export async function deliverTelegramOrderAlert(
  verifiedUser: VerifiedFirebaseUser,
  body: OrderNotifyPayload,
  mode: 'new_order' | 'admin_status'
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken || !chatId) {
    if (mode === 'admin_status') {
      return {
        status: 400,
        body: {
          ok: false,
          error:
            'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in environment secrets to enable alerts.',
        },
      };
    }
    return {
      status: 200,
      body: { ok: true, skipped: true, reason: 'telegram_not_configured' },
    };
  }

  const storeName = escapeHtml((body.storeName || 'Aurelia Commerce').slice(0, 80));
  const orderNumber = escapeHtml((body.orderNumber || 'NEW-ORDER').slice(0, 40));
  const customerName = escapeHtml((body.customerName || 'Customer').slice(0, 100));
  const customerEmail = escapeHtml(
    (body.customerEmail || (mode === 'new_order' ? verifiedUser.email : '') || '').slice(0, 160)
  );
  const customerPhone = escapeHtml((body.customerPhone || '').slice(0, 40));
  const deliveryContact = escapeHtml((body.deliveryContact || '').slice(0, 300));
  const paymentMethod = escapeHtml((body.paymentMethodName || 'QR Payment').slice(0, 60));
  const receiptLast4 = escapeHtml((body.receiptLast4 || '----').slice(0, 4));
  const totalText = formatMmkText(Number(body.totalMmk) || 0);
  const promoCode = body.promoCode ? escapeHtml(body.promoCode.slice(0, 40)) : '';
  const headerNote = body.customHeaderNote?.trim()
    ? `<i>${escapeHtml(body.customHeaderNote.trim().slice(0, 120))}</i>`
    : '';

  const statusLabel =
    body.status === 'verified_delivered'
      ? 'Verified & Delivered'
      : body.status === 'rejected'
        ? 'Rejected'
        : 'Pending Verification';

  const heading =
    mode === 'new_order'
      ? `<b>New Order · ${storeName}</b>`
      : `<b>Order Update (${escapeHtml(statusLabel)}) · ${storeName}</b>`;

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

  const lines: string[] = [];
  if (headerNote) lines.push(headerNote);
  lines.push(
    heading,
    `Order: <code>${orderNumber}</code>`,
    `Total: <b>${totalText}</b>${promoCode ? ` (Promo: <code>${promoCode}</code>)` : ''}`,
    `Payment: ${paymentMethod} · Slip Last 4: <code>#${receiptLast4}</code>`
  );
  if (mode === 'admin_status') {
    lines.push(`Status: <b>${escapeHtml(statusLabel)}</b>`);
  }
  lines.push(
    '',
    `<b>Customer</b>`,
    `${customerName}${customerEmail ? ` (${customerEmail})` : ''}${customerPhone ? ` · ${customerPhone}` : ''}`,
    `Delivery: ${deliveryContact}`,
    '',
    `<b>Items</b>`,
    itemsLines || '• Order items attached'
  );

  if (body.deliveryPayload?.trim()) {
    lines.push('', `<b>Delivered Payload</b>`, `<code>${escapeHtml(body.deliveryPayload.trim().slice(0, 500))}</code>`);
  }
  if (body.adminNote?.trim()) {
    lines.push(`Note: ${escapeHtml(body.adminNote.trim().slice(0, 300))}`);
  }

  const appUrl = process.env.APP_URL?.trim();
  if (appUrl && appUrl !== 'MY_APP_URL') {
    lines.push('', `<a href="${escapeHtml(appUrl)}">Open Admin Studio to Verify</a>`);
  }

  const fullHtml = lines.join('\n');
  const shouldIncludePhoto = body.includeReceiptPhoto !== false;
  const parsedImage =
    shouldIncludePhoto && body.receiptImageDataUrl
      ? parseImageDataUrl(body.receiptImageDataUrl)
      : null;

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
          headerNote,
          heading,
          `Order: <code>${orderNumber}</code> · <b>${totalText}</b>`,
          `Payment: ${paymentMethod} · Slip Last 4: <code>#${receiptLast4}</code>`,
          `Customer: ${customerName} (${deliveryContact})`,
        ]
          .filter(Boolean)
          .join('\n');
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
    return { status: 200, body: { ok: true } };
  } catch (err) {
    try {
      await sendTelegramText(botToken, chatId, fullHtml);
      return { status: 200, body: { ok: true, fallbackText: true } };
    } catch (fallbackErr) {
      console.error('Telegram notification error:', err, fallbackErr);
      return {
        status: 502,
        body: {
          ok: false,
          error: fallbackErr instanceof Error ? fallbackErr.message : 'Telegram delivery failed',
        },
      };
    }
  }
}
