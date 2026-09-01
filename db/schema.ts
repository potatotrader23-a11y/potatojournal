import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  platform: text('platform').notNull().default(''),
  currency: text('currency').notNull().default('USD'),
  balance: real('balance').notNull(),
  startingBalance: real('starting_balance').notNull(),
  riskPercent: real('risk_percent').notNull(),
  dailyLossPercent: real('daily_loss_percent').notNull(),
  maxLossPercent: real('max_loss_percent').notNull(),
  pnl: real('pnl').notNull().default(0),
  equityJson: text('equity_json').notNull().default('[100,100]'),
  updatedAt: integer('updated_at').notNull(),
});

export const backtests = sqliteTable('backtests', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  instrument: text('instrument').notNull(),
  assumptionsJson: text('assumptions_json').notNull(),
  resultsJson: text('results_json').notNull(),
  createdAt: integer('created_at').notNull(),
});
