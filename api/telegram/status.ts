import {
  getTelegramIntegrationStatus,
  isVerifiedAdminUser,
  verifyFirebaseBearerToken,
} from '../../server/telegramService';

export async function GET(request: Request): Promise<Response> {
  const verifiedUser = await verifyFirebaseBearerToken(request.headers.get('authorization'));
  if (!(await isVerifiedAdminUser(verifiedUser))) {
    return Response.json({ error: 'Admin authentication required' }, { status: 403 });
  }
  const status = await getTelegramIntegrationStatus();
  return Response.json(status);
}
