import {
  deliverTelegramOrderAlert,
  isVerifiedAdminUser,
  verifyFirebaseBearerToken,
  type OrderNotifyPayload,
} from '../../server/telegramService';

export async function POST(request: Request): Promise<Response> {
  const verifiedUser = await verifyFirebaseBearerToken(request.headers.get('authorization'));
  if (!verifiedUser || !(await isVerifiedAdminUser(verifiedUser))) {
    return Response.json({ ok: false, error: 'Admin authentication required' }, { status: 403 });
  }

  let body: OrderNotifyPayload = {};
  try {
    body = (await request.json()) as OrderNotifyPayload;
  } catch {
    body = {};
  }

  const result = await deliverTelegramOrderAlert(verifiedUser, body, 'admin_status');
  return Response.json(result.body, { status: result.status });
}
