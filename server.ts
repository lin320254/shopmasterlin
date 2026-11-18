import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  deliverTelegramOrderAlert,
  getTelegramIntegrationStatus,
  isVerifiedAdminUser,
  sendTelegramTestAlert,
  verifyFirebaseBearerToken,
  type OrderNotifyPayload,
} from './server/telegramService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/telegram/status', async (req, res) => {
    const verifiedUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!(await isVerifiedAdminUser(verifiedUser))) {
      res.status(403).json({ error: 'Admin authentication required' });
      return;
    }

    const status = await getTelegramIntegrationStatus();
    res.json(status);
  });

  app.post('/api/telegram/test', async (req, res) => {
    const verifiedUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!(await isVerifiedAdminUser(verifiedUser))) {
      res.status(403).json({ ok: false, error: 'Admin authentication required' });
      return;
    }

    const body = (req.body || {}) as { storeName?: string; customHeaderNote?: string };
    const result = await sendTelegramTestAlert(body);
    res.status(result.status).json(result.body);
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

    const result = await deliverTelegramOrderAlert(verifiedUser, body, 'new_order');
    res.status(result.status).json(result.body);
  });

  app.post('/api/telegram/notify-status', async (req, res) => {
    const verifiedUser = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!verifiedUser || !(await isVerifiedAdminUser(verifiedUser))) {
      res.status(403).json({ ok: false, error: 'Admin authentication required' });
      return;
    }

    const body = (req.body || {}) as OrderNotifyPayload;
    const result = await deliverTelegramOrderAlert(verifiedUser, body, 'admin_status');
    res.status(result.status).json(result.body);
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
