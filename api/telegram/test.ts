import {
  isVerifiedAdminUser,
  sendTelegramTestAlert,
  verifyFirebaseBearerToken,
} from '../../server/telegramService';

export async function POST(request: Request): Promise<Response> {
  const verifiedUser = await verifyFirebaseBearerToken(request.headers.get('authorization'));
  if (!(await isVerifiedAdminUser(verifiedUser))) {
    return Response.json({ ok: false, error: 'Admin authentication required' }, { status: 403 });
  }

  let body: { storeName?: string; customHeaderNote?: string } = {};
  try {
    body = (await request.json()) as { storeName?: string; customHeaderNote?: string };
  } catch {
    body = {};
  }
  const result = await sendTelegramTestAlert(body);
  return Response.json(result.body, { status: result.status });
}
