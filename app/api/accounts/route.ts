import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { accounts } from '@/db/schema';

const owner = (request: Request) =>
  request.headers.get('oai-authenticated-user-id') || 'local-preview';

export async function GET(request: Request) {
  const rows = await getDb()
    .select()
    .from(accounts)
    .where(eq(accounts.ownerId, owner(request)));
  return Response.json(
    rows.map((row) => ({ ...row, equity: JSON.parse(row.equityJson) })),
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id || crypto.randomUUID());
  const values = {
    id,
    ownerId: owner(request),
    name: String(body.name || 'Trading account'),
    type: String(body.type || 'Personal'),
    platform: String(body.platform || ''),
    currency: String(body.currency || 'USD'),
    balance: Number(body.balance || 0),
    startingBalance: Number(body.startingBalance || body.balance || 0),
    riskPercent: Number(body.riskPercent || 0),
    dailyLossPercent: Number(body.dailyLossPercent || 0),
    maxLossPercent: Number(body.maxLossPercent || 0),
    pnl: Number(body.pnl || 0),
    equityJson: JSON.stringify(body.equity || [100, 100]),
    updatedAt: Date.now(),
  };
  await getDb()
    .insert(accounts)
    .values(values)
    .onConflictDoUpdate({ target: accounts.id, set: values });
  return Response.json({ id, status: 'saved' });
}
