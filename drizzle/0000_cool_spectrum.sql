CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`platform` text DEFAULT '' NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`balance` real NOT NULL,
	`starting_balance` real NOT NULL,
	`risk_percent` real NOT NULL,
	`daily_loss_percent` real NOT NULL,
	`max_loss_percent` real NOT NULL,
	`pnl` real DEFAULT 0 NOT NULL,
	`equity_json` text DEFAULT '[100,100]' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `backtests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`account_id` text NOT NULL,
	`instrument` text NOT NULL,
	`assumptions_json` text NOT NULL,
	`results_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
