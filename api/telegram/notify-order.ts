import {
  deliverTelegramOrderAlert,
  verifyFirebaseBearerToken,
  type OrderNotifyPayload,
} from '../../server/telegramService';

export async function POST(request: Request): Promise<Response> {
  const verifiedUser = await verifyFirebaseBearerToken(request.headers.get('authorization'));
  if (!verifiedUser || !verifiedUser.emailVerified) {
    return Response.json({ ok: false, error: 'Verified authentication required' }, { status: 401 });
  }

  let body: OrderNotifyPayload = {};
  try {
    body = (await request.json()) as OrderNotifyPayload;
  } catch {
    body = {};
  }
  if (body.userId && body.userId !== verifiedUser.uid) {
    return Response.json({ ok: false, error: 'Order user mismatch' }, { status: 403 });
  }

  const result = await deliverTelegramOrderAlert(verifiedUser, body, 'new_order');
  return Response.json(result.body, { status: result.status });
}
