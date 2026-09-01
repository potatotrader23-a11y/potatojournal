import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { backtests } from '@/db/schema';

const owner = (request: Request) =>
  request.headers.get('oai-authenticated-user-id') || 'local-preview';

export async function GET(request: Request) {
  return Response.json(
    await getDb()
      .select()
      .from(backtests)
      .where(eq(backtests.ownerId, owner(request))),
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const id = crypto.randomUUID();
  await getDb()
    .insert(backtests)
    .values({
      id,
      ownerId: owner(request),
      accountId: String(body.accountId),
      instrument: String(body.instrument || 'Unknown'),
      assumptionsJson: JSON.stringify(body.assumptions || {}),
      resultsJson: JSON.stringify(body.results || {}),
      createdAt: Date.now(),
    });
  return Response.json({ id, status: 'saved' });
}
