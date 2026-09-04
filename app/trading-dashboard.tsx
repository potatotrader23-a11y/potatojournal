'use client';

import { type SyntheticEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  ImagePlus,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type View = 'overview' | 'accounts' | 'backtesting' | 'journal' | 'analytics';
type AccountType = 'Personal' | 'Forex' | 'Prop firm';
type TradingAccount = {
  id: string;
  name: string;
  type: AccountType;
  platform: string;
  currency: string;
  balance: number;
  startingBalance: number;
  riskPercent: number;
  dailyLossPercent: number;
  maxLossPercent: number;
  pnl: number;
  equity: number[];
};
type SavedBacktest = {
  id: string;
  instrument: 'GBPUSD';
  resultR: number;
  backtestDate: string;
  imageUrl: string | null;
  createdAt: string;
};
type BacktestTab = 'log' | 'calendar' | 'analytics' | 'history';
const manilaToday = () =>
  new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
async function fetchBacktests() {
  const response = await fetch('/api/backtests');
  if (!response.ok) throw new Error('Unable to load backtests');
  return (await response.json()) as SavedBacktest[];
}

const nav: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'accounts', label: 'Accounts', icon: WalletCards },
  { id: 'backtesting', label: 'Backtesting', icon: FlaskConical },
  { id: 'journal', label: 'Journal', icon: BookOpenCheck },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];
const money = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);

export default function TradingDashboard({ userEmail }: { userEmail: string }) {
  const [view, setView] = useState<View>('overview');
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [backtests, setBacktests] = useState<SavedBacktest[]>([]);
  const [backtestsLoading, setBacktestsLoading] = useState(true);
  const [activeId, setActiveId] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [light, setLight] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<TradingAccount | null>(null);
  const active = accounts.find((a) => a.id === activeId) ?? accounts[0];
  const compared = accounts.filter((a) => compareIds.includes(a.id));
  const toggleTheme = () => {
    setLight((current) => {
      const next = !current;
      document.documentElement.classList.toggle('dark', !next);
      return next;
    });
  };
  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign('/login');
  };

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: {
              name: string;
              title: string;
              description: string;
              inputSchema: object;
              annotations: object;
              execute: () => object;
            },
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'start_account_creation',
          title: 'Add a trading account',
          description:
            'Open the trading-account form so the user can review and set balance and risk limits.',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: () => {
            setEditing(null);
            setDialog(true);
            return { status: 'ready', visibleForm: 'trading-account' };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    void fetch('/api/accounts')
      .then((response) => (response.ok ? response.json() : []))
      .then((saved: TradingAccount[]) => {
        setAccounts(saved);
        setActiveId(saved[0]?.id ?? '');
        setCompareIds(saved.slice(0, 2).map((account) => account.id));
      })
      .catch(() => setAccounts([]))
      .finally(() => setAccountsLoading(false));
    void fetchBacktests()
      .then(setBacktests)
      .catch(() => setBacktests([]))
      .finally(() => setBacktestsLoading(false));
  }, []);
  const openAccount = (account?: TradingAccount) => {
    setEditing(account ?? null);
    setDialog(true);
  };
  const saveAccount = (account: TradingAccount) => {
    setAccounts((current) =>
      editing
        ? current.map((item) => (item.id === account.id ? account : item))
        : [...current, account],
    );
    if (!editing) {
      setActiveId(account.id);
      setCompareIds((current) => [...current, account.id]);
    }
    setDialog(false);
    void fetch('/api/accounts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(account),
    }).catch(() => undefined);
  };
  return (
    <main className="app-canvas min-h-screen bg-background text-foreground transition-colors duration-300">
      <DesktopSidebar view={view} onView={setView} />
      <section className="lg:pl-[232px]">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/86 px-4 backdrop-blur-xl sm:px-6">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="mr-2 lg:hidden"
                  aria-label="Open navigation"
                />
              }
            >
              <Menu />
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-popover">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Logo /> Potato Journal
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-1 px-3">
                {nav.map((item) => (
                  <Button
                    key={item.id}
                    variant={view === item.id ? 'secondary' : 'ghost'}
                    className="h-11 w-full justify-start gap-3"
                    onClick={() => setView(item.id)}
                  >
                    <item.icon />
                    {item.label}
                  </Button>
                ))}
                <div className="mt-5 border-t border-border pt-4">
                  <p className="truncate px-3 text-xs text-muted-foreground">
                    {userEmail}
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-1 h-10 w-full justify-start gap-3"
                    onClick={signOut}
                  >
                    <LogOut /> Sign out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          {accountsLoading ? (
            <span className="px-2 text-xs text-muted-foreground">
              Loading accounts…
            </span>
          ) : active ? (
            <>
              <Select
                value={activeId}
                onValueChange={(value) => value && setActiveId(value)}
              >
                <SelectTrigger className="h-9 min-w-0 border-0 bg-transparent px-2 text-xs font-medium sm:min-w-[190px] sm:text-sm">
                  <BriefcaseBusiness className="hidden size-4 text-primary sm:block" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge
                variant="outline"
                className="ml-1 hidden border-secondary/35 bg-secondary/10 text-[10px] md:flex"
              >
                {active.type}
              </Badge>
            </>
          ) : (
            <Button
              variant="ghost"
              className="h-9 text-xs"
              onClick={() => openAccount()}
            >
              <Plus /> Add account
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={light ? 'Use dark mode' : 'Use light mode'}
              onClick={toggleTheme}
            >
              {light ? <Moon /> : <Sun />}
            </Button>
            {view === 'backtesting' && (
              <Badge variant="outline" className="hidden sm:flex">
                Backtest workspace
              </Badge>
            )}
            <button
              type="button"
              onClick={signOut}
              className="group ml-1 hidden h-10 items-center gap-2 rounded-xl border border-border bg-secondary/10 px-2.5 text-left transition hover:bg-secondary/20 sm:flex"
              title={`Signed in as ${userEmail}. Click to sign out.`}
            >
              <span className="grid size-6 place-items-center rounded-full bg-secondary/25 text-[10px] font-semibold">
                {userEmail.slice(0, 2).toUpperCase()}
              </span>
              <span className="max-w-24 truncate text-[11px] text-muted-foreground lg:max-w-32">
                {userEmail}
              </span>
              <LogOut className="size-3.5 text-muted-foreground group-hover:text-foreground" />
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-7 sm:py-8">
          {view === 'overview' && (
            <Overview
              accounts={accounts}
              active={active}
              compared={compared}
              compareIds={compareIds}
              onCompare={setCompareIds}
              onAdd={() => openAccount()}
              loading={accountsLoading}
            />
          )}
          {view === 'accounts' && (
            <Accounts
              accounts={accounts}
              onAdd={() => openAccount()}
              onEdit={openAccount}
              onActive={setActiveId}
              activeId={activeId}
              loading={accountsLoading}
            />
          )}
          {view === 'backtesting' && (
            <Backtesting
              backtests={backtests}
              setBacktests={setBacktests}
              loading={backtestsLoading}
            />
          )}{' '}
          {view === 'journal' && (
            <Journal
              backtests={backtests}
              loading={backtestsLoading}
              onLog={() => setView('backtesting')}
            />
          )}{' '}
          {view === 'analytics' && (
            <Analytics accounts={accounts} backtests={backtests} />
          )}
        </div>
      </section>
      <AccountDialog
        open={dialog}
        onOpenChange={setDialog}
        editing={editing}
        onSave={saveAccount}
      />
    </main>
  );
}

function Logo() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-[#3A86FF] to-[#706DFF] text-[15px] font-black text-white shadow-[0_8px_24px_rgba(58,134,255,.22)]">
      P
    </span>
  );
}
function DesktopSidebar({
  view,
  onView,
}: {
  view: View;
  onView: (v: View) => void;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] border-r border-border bg-sidebar p-4 lg:flex lg:flex-col">
      <div className="flex h-12 items-center gap-2.5 px-2">
        <Logo />
        <div>
          <p className="text-sm font-semibold">Potato Journal</p>
          <p className="text-[9px] uppercase tracking-[.18em] text-muted-foreground">
            Trading OS
          </p>
        </div>
      </div>
      <nav className="mt-7 space-y-1">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => onView(item.id)}
            className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] transition ${view === item.id ? 'bg-primary/12 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <item.icon className="size-4" />
            {item.label}
            {view === item.id && (
              <span className="ml-auto size-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
            )}
          </button>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl border border-accent/20 bg-accent/5 p-3.5">
        <div className="mb-3 flex items-center gap-2 text-accent-foreground dark:text-accent">
          <Sparkles className="size-4" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">
            Risk pulse
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Every account keeps its own balance, risk per trade, and loss limits.
        </p>
      </div>
    </aside>
  );
}

function Overview({
  accounts,
  active,
  compared,
  compareIds,
  onCompare,
  onAdd,
  loading,
}: {
  accounts: TradingAccount[];
  active: TradingAccount | undefined;
  compared: TradingAccount[];
  compareIds: string[];
  onCompare: (ids: string[]) => void;
  onAdd: () => void;
  loading: boolean;
}) {
  const totalBalance = compared.reduce(
    (sum, account) => sum + account.balance,
    0,
  );
  const totalPnl = compared.reduce((sum, account) => sum + account.pnl, 0);
  const oneCurrency =
    compared.length > 0 &&
    compared.every((account) => account.currency === compared[0].currency);
  const riskAmount = active ? (active.balance * active.riskPercent) / 100 : 0;
  const maxLossFloor = active
    ? active.startingBalance * (1 - active.maxLossPercent / 100)
    : 0;
  const lossBuffer = active ? active.balance - maxLossFloor : 0;
  const accountValue = !compared.length
    ? '—'
    : oneCurrency
      ? money(totalBalance, compared[0].currency)
      : 'Mixed';
  const pnlValue = !compared.length
    ? '—'
    : oneCurrency
      ? money(totalPnl, compared[0].currency)
      : 'Mixed';
  return (
    <>
      <PageHeading
        eyebrow="Portfolio command center"
        title="Trade the plan, not the noise."
        description="Every account keeps its own risk model. Compare them without mixing their rules or performance."
        action={
          <Button variant="outline" className="h-10 rounded-xl" onClick={onAdd}>
            <Plus /> Add account
          </Button>
        }
      />
      {accounts.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Compare
          </span>
          {accounts.map((account) => {
            const selected = compareIds.includes(account.id);
            return (
              <button
                key={account.id}
                type="button"
                onClick={() =>
                  onCompare(
                    selected
                      ? compareIds.filter((id) => id !== account.id)
                      : [...compareIds, account.id],
                  )
                }
                className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] ${selected ? 'border-primary/35 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}
              >
                {selected && <Check className="size-3" />}
                {account.name}
              </button>
            );
          })}
        </div>
      ) : !loading ? (
        <div className="surface mb-3 flex flex-wrap items-center justify-between gap-3 border-dashed p-4">
          <div>
            <p className="text-sm font-medium">No trading account yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add one to calculate balance-based risk and loss limits.
            </p>
          </div>
          <Button type="button" size="sm" onClick={onAdd}>
            <Plus /> Add account
          </Button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Account balance"
          value={loading ? '…' : accountValue}
          detail={
            compared.length
              ? `${compared.length} selected account${compared.length === 1 ? '' : 's'}`
              : 'No account data'
          }
          icon={WalletCards}
        />
        <Metric
          label="Account P&L"
          value={loading ? '…' : pnlValue}
          detail="Current balance minus starting balance"
          positive={totalPnl > 0}
          icon={totalPnl < 0 ? TrendingDown : TrendingUp}
        />
        <Metric
          label="Risk per trade"
          value={
            loading ? '…' : active ? money(riskAmount, active.currency) : '—'
          }
          detail={
            active
              ? `${active.riskPercent}% of ${active.name}`
              : 'No account selected'
          }
          icon={ShieldCheck}
        />
        <Metric
          label="Loss buffer"
          value={
            loading ? '…' : active ? money(lossBuffer, active.currency) : '—'
          }
          detail="Room before the account's maximum loss limit"
          positive={lossBuffer > 0}
          icon={lossBuffer < 0 ? TrendingDown : ShieldCheck}
        />
      </div>
      {active ? (
        <>
          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.75fr)]">
            <AccountEquityCurve
              accounts={compared.length ? compared : [active]}
            />
            <RiskCard account={active} />
          </div>
          <div className="mt-3">
            <AccountSnapshot accounts={accounts} active={active} />
          </div>
        </>
      ) : !loading ? (
        <div className="mt-3">
          <EmptyAccountCard onAdd={onAdd} />
        </div>
      ) : null}
    </>
  );
}

function Metric({
  label,
  value,
  detail,
  positive,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  positive?: boolean;
  icon: typeof Activity;
}) {
  return (
    <article className="surface p-4.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
        <Icon
          className={`size-4 ${positive ? 'text-emerald-500' : 'text-primary'}`}
        />
      </div>
      <p className="mt-3 text-[25px] font-semibold tracking-[-.045em]">
        {value}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>
    </article>
  );
}
function seriesPoints(values: number[]) {
  const min = Math.min(...values) - 1,
    max = Math.max(...values) + 1;
  return values
    .map(
      (v, i) =>
        `${(i / Math.max(values.length - 1, 1)) * 760},${210 - ((v - min) / (max - min)) * 185}`,
    )
    .join(' ');
}
function AccountEquityCurve({ accounts }: { accounts: TradingAccount[] }) {
  const colors = ['var(--primary)', 'var(--secondary)', 'var(--accent)'];
  const normalized = accounts.map((account) => {
    const saved = Array.isArray(account.equity)
      ? account.equity.filter((value) => Number.isFinite(value))
      : [];
    const current = account.startingBalance
      ? (account.balance / account.startingBalance) * 100
      : 100;
    const values = saved.length ? [...saved] : [100];
    if (Math.abs((values.at(-1) ?? 100) - current) > 0.001)
      values.push(current);
    if (values.length === 1) values.unshift(100);
    return { account, values };
  });
  const allValues = normalized.flatMap((item) => item.values);
  const min = Math.min(...allValues, 100) - 1;
  const max = Math.max(...allValues, 100) + 1;
  const points = (values: number[]) =>
    values
      .map(
        (value, index) =>
          `${(index / Math.max(values.length - 1, 1)) * 760},${210 - ((value - min) / Math.max(max - min, 1)) * 185}`,
      )
      .join(' ');

  return (
    <article className="surface overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Live account equity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Starting balance compared with each saved balance update.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          {normalized.map(({ account }, index) => (
            <span key={account.id} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              {account.name} · {money(account.balance, account.currency)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-5 h-48 sm:h-56">
        <svg
          viewBox="0 0 760 230"
          className="h-full w-full"
          preserveAspectRatio="none"
          aria-label="Live account equity curve"
        >
          <title>Live trading-account equity curve</title>
          {[35, 85, 135, 185].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="760"
              y2={y}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="4 6"
            />
          ))}
          {normalized.map(({ account, values }, index) => (
            <polyline
              key={account.id}
              points={points(values)}
              fill="none"
              stroke={colors[index % colors.length]}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>Starting balance</span>
        <span>Current balance</span>
      </div>
    </article>
  );
}
function RiskCard({ account }: { account: TradingAccount }) {
  const risk = (account.balance * account.riskPercent) / 100,
    daily = (account.balance * account.dailyLossPercent) / 100,
    max = (account.startingBalance * account.maxLossPercent) / 100;
  return (
    <article className="surface p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Automatic risk</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {account.name}
          </p>
        </div>
        <ShieldCheck className="size-4 text-primary" />
      </div>
      <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/[.055] p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Next trade risk
        </p>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-3xl font-semibold tracking-tight">
            {money(risk, account.currency)}
          </span>
          <span className="text-sm font-medium text-primary">
            {account.riskPercent}%
          </span>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        <RiskRow
          label="Daily stop"
          amount={money(daily, account.currency)}
          percent={account.dailyLossPercent}
        />
        <RiskRow
          label="Maximum loss"
          amount={money(max, account.currency)}
          percent={account.maxLossPercent}
        />
        <RiskRow
          label="Current cushion"
          amount={money(Math.max(account.pnl, 0), account.currency)}
          percent={Math.max((account.pnl / account.startingBalance) * 100, 0)}
        />
      </div>
      <p className="mt-5 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
        Position size is calculated from this account only. Other account rules
        never affect it.
      </p>
    </article>
  );
}
function RiskRow({
  label,
  amount,
  percent,
}: {
  label: string;
  amount: string;
  percent: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {amount} · {percent.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(percent * 10, 100)}%` }}
        />
      </div>
    </div>
  );
}
function RecentBacktests({
  backtests,
  loading,
  onOpen,
}: {
  backtests: SavedBacktest[];
  loading: boolean;
  onOpen: () => void;
}) {
  const recent = backtests.slice(0, 6);
  return (
    <article className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-medium">Recent backtests</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Your latest saved GBPUSD results
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onOpen}>
          Open backtesting <ArrowRight />
        </Button>
      </div>
      {loading ? (
        <div className="grid min-h-44 place-items-center">
          <Activity className="size-4 animate-spin text-primary" />
        </div>
      ) : recent.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead className="text-[10px] uppercase tracking-[.13em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="py-3 font-medium">Market</th>
                <th className="py-3 font-medium">Outcome</th>
                <th className="px-5 py-3 text-right font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((item) => (
                <tr key={item.id} className="border-t border-border text-xs">
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {formatBacktestDate(item.backtestDate)}
                  </td>
                  <td className="py-3.5 font-semibold">GBPUSD</td>
                  <td className="py-3.5">
                    <span
                      className={
                        item.resultR > 0
                          ? 'text-emerald-500'
                          : item.resultR < 0
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                      }
                    >
                      {item.resultR > 0
                        ? 'Win'
                        : item.resultR < 0
                          ? 'Loss'
                          : 'Breakeven'}
                    </span>
                  </td>
                  <td
                    className={`px-5 py-3.5 text-right font-semibold ${item.resultR > 0 ? 'text-emerald-500' : item.resultR < 0 ? 'text-destructive' : ''}`}
                  >
                    {item.resultR > 0 ? '+' : ''}
                    {item.resultR}R
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <BookOpenCheck className="mx-auto size-5 text-primary" />
          <p className="mt-3 text-sm font-medium">No results yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Log your first backtest to populate the overview.
          </p>
        </div>
      )}
    </article>
  );
}
function EmptyAccountCard({
  onAdd,
  compact = false,
}: {
  onAdd: () => void;
  compact?: boolean;
}) {
  return (
    <article className="surface grid place-items-center p-5 text-center sm:p-6">
      <div className={compact ? 'py-5' : 'py-10'}>
        <WalletCards className="mx-auto size-6 text-primary" />
        <h2 className="mt-3 text-sm font-medium">Add a trading account</h2>
        <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
          Your balances and risk calculations will appear here after you add an
          account.
        </p>
        <Button type="button" size="sm" className="mt-4" onClick={onAdd}>
          <Plus /> Add account
        </Button>
      </div>
    </article>
  );
}
function AccountSnapshot({
  accounts,
  active,
}: {
  accounts: TradingAccount[];
  active: TradingAccount;
}) {
  return (
    <article className="surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Account allocation</h2>
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-5 space-y-3">
        {accounts.map((a) => {
          const width = Math.max(
            12,
            (a.balance / Math.max(...accounts.map((x) => x.balance))) * 100,
          );
          return (
            <div
              key={a.id}
              className={`rounded-xl border p-3 ${active.id === a.id ? 'border-primary/25 bg-primary/5' : 'border-border'}`}
            >
              <div className="flex justify-between text-xs">
                <span className="font-medium">{a.name}</span>
                <span>{money(a.balance, a.currency)}</span>
              </div>
              <div className="mt-2 h-1 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-secondary"
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
                <span>{a.type}</span>
                <span>{a.riskPercent}% risk</span>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function Accounts({
  accounts,
  onAdd,
  onEdit,
  onActive,
  activeId,
  loading,
}: {
  accounts: TradingAccount[];
  onAdd: () => void;
  onEdit: (a: TradingAccount) => void;
  onActive: (id: string) => void;
  activeId: string;
  loading: boolean;
}) {
  return (
    <>
      <PageHeading
        eyebrow="Risk-separated portfolios"
        title="Trading accounts"
        description="Each account keeps its own capital, loss limits, and automatic position risk."
        action={
          <Button className="h-10 rounded-xl" onClick={onAdd}>
            <Plus /> Add account
          </Button>
        }
      />
      {loading ? (
        <div className="surface grid min-h-48 place-items-center">
          <Activity className="size-5 animate-spin text-primary" />
        </div>
      ) : accounts.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => {
            const risk = (a.balance * a.riskPercent) / 100,
              growth = (a.pnl / a.startingBalance) * 100;
            return (
              <article
                key={a.id}
                className={`surface p-5 ${activeId === a.id ? 'ring-2 ring-primary/35' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-secondary/15 text-secondary-foreground dark:text-secondary">
                      <WalletCards className="size-5" />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold">{a.name}</h2>
                      <p className="text-[10px] text-muted-foreground">
                        {a.type} · {a.platform}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(a)}
                    aria-label={`Edit ${a.name}`}
                  >
                    <Pencil />
                  </Button>
                </div>
                <div className="mt-6">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Current balance
                  </p>
                  <p className="mt-1 text-3xl font-semibold tracking-[-.05em]">
                    {money(a.balance, a.currency)}
                  </p>
                  <p
                    className={`mt-1 text-[11px] ${growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}
                  >
                    {growth >= 0 ? '+' : ''}
                    {growth.toFixed(2)}% since start
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <TinyStat label="Risk/trade" value={`${a.riskPercent}%`} />
                  <TinyStat label="Risk amount" value={money(risk)} />
                  <TinyStat label="Max loss" value={`${a.maxLossPercent}%`} />
                </div>
                <Button
                  variant={activeId === a.id ? 'secondary' : 'outline'}
                  className="mt-5 h-9 w-full"
                  onClick={() => onActive(a.id)}
                >
                  {activeId === a.id ? (
                    <>
                      <Check /> Active account
                    </>
                  ) : (
                    'Make active'
                  )}
                </Button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="surface border-dashed px-5 py-14 text-center">
          <WalletCards className="mx-auto size-7 text-primary" />
          <h2 className="mt-3 text-sm font-semibold">No trading accounts</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Add your first personal, forex, or prop-firm account to start
            tracking its balance and independent risk settings.
          </p>
          <Button type="button" className="mt-5" onClick={onAdd}>
            <Plus /> Add your first account
          </Button>
        </div>
      )}
    </>
  );
}
function TinyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-2.5">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-semibold">{value}</p>
    </div>
  );
}

function Backtesting({
  backtests,
  setBacktests,
  loading,
}: {
  backtests: SavedBacktest[];
  setBacktests: React.Dispatch<React.SetStateAction<SavedBacktest[]>>;
  loading: boolean;
}) {
  const [backtestTab, setBacktestTab] = useState<BacktestTab>('log');
  const [resultRInput, setResultRInput] = useState('1');
  const [backtestDate, setBacktestDate] = useState(manilaToday);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    manilaToday().slice(0, 7),
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavedBacktest | null>(null);
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  useEffect(
    () => () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const save = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const parsedResultR = Number(resultRInput);
    if (
      !resultRInput.trim() ||
      resultRInput === '-' ||
      !Number.isFinite(parsedResultR)
    ) {
      setSaveState('error');
      return;
    }
    setSaveState('saving');
    try {
      const formData = new FormData();
      formData.set('variables', '{}');
      formData.set('resultR', resultRInput);
      formData.set('backtestDate', backtestDate);
      if (imageFile) formData.set('image', imageFile);
      if (removeExistingImage) formData.set('removeImage', 'true');
      const response = await fetch(
        editingId ? `/api/backtests/${editingId}` : '/api/backtests',
        {
          method: editingId ? 'PATCH' : 'POST',
          body: formData,
        },
      );
      if (!response.ok) throw new Error('Unable to save backtest');
      setBacktests(await fetchBacktests());
      setCalendarMonth(backtestDate.slice(0, 7));
      resetEditor();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const resetEditor = () => {
    setResultRInput('1');
    setBacktestDate(manilaToday());
    setImageFile(null);
    setPreviewUrl(null);
    setEditingId(null);
    setRemoveExistingImage(false);
  };
  const editBacktest = (item: SavedBacktest) => {
    setResultRInput(String(item.resultR));
    setBacktestDate(item.backtestDate);
    setImageFile(null);
    setPreviewUrl(item.imageUrl);
    setEditingId(item.id);
    setRemoveExistingImage(false);
    setSaveState('idle');
    setBacktestTab('log');
    requestAnimationFrame(() => {
      document
        .getElementById('backtest-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const deleteBacktest = async () => {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/backtests/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Unable to delete backtest');
      if (editingId === deleteTarget.id) resetEditor();
      setBacktests((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } catch {
      setSaveState('error');
    }
  };

  const winCount = backtests.filter((item) => item.resultR > 0).length;
  const netR = backtests.reduce((total, item) => total + item.resultR, 0);
  const averageR = backtests.length ? netR / backtests.length : 0;
  const percentage = (count: number) =>
    backtests.length ? `${Math.round((count / backtests.length) * 100)}%` : '—';

  return (
    <>
      <PageHeading
        eyebrow="Strategy laboratory"
        title="Backtesting"
        description="A dedicated GBPUSD research workspace, completely separate from your live trading accounts."
      />
      <BacktestTabs
        value={backtestTab}
        historyCount={backtests.length}
        onChange={setBacktestTab}
      />
      {backtestTab === 'analytics' && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BacktestStat label="Total trades" value={`${backtests.length}`} />
          <BacktestStat label="Win rate" value={percentage(winCount)} />
          <BacktestStat
            label="Average RR"
            value={backtests.length ? `${averageR.toFixed(2)}R` : '—'}
          />
          <BacktestStat
            label="Net result"
            value={
              backtests.length
                ? `${netR >= 0 ? '+' : ''}${netR.toFixed(1)}R`
                : '—'
            }
          />
        </div>
      )}
      {backtestTab === 'calendar' && (
        <BacktestCalendar
          backtests={backtests}
          month={calendarMonth}
          selectedDate={backtestDate}
          onMonthChange={setCalendarMonth}
          onDateSelect={(date) => {
            setBacktestDate(date);
            setSaveState('idle');
            setBacktestTab('log');
          }}
        />
      )}
      {backtestTab === 'analytics' && (
        <BacktestEquityCurve backtests={backtests} />
      )}
      {backtestTab === 'log' && (
        <form
          id="backtest-form"
          onSubmit={save}
          className="surface mx-auto max-w-3xl scroll-mt-20 p-5 sm:p-7"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                {editingId ? 'Edit GBPUSD backtest' : 'Log GBPUSD backtest'}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Record the date, RR result, and optional chart.
              </p>
            </div>
            {editingId && <Badge variant="secondary">Editing</Badge>}
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/[.055] p-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                  Backtest market
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight">
                  GBPUSD
                </p>
              </div>
              <Badge className="bg-primary/12 text-primary" variant="secondary">
                Fixed pair
              </Badge>
            </div>
            <div className="border-t border-border pt-5">
              <Field label="Backtest date">
                <Input
                  type="date"
                  required
                  value={backtestDate}
                  onChange={(event) => {
                    setBacktestDate(event.target.value);
                    setSaveState('idle');
                  }}
                />
              </Field>
            </div>
            <div className="border-t border-border pt-5">
              <SignedRField
                value={resultRInput}
                onChange={(next) => {
                  setResultRInput(next);
                  setSaveState('idle');
                }}
              />
              <p
                id="rr-help"
                className="mt-2 text-[10px] text-muted-foreground"
              >
                Use 3 for a +3R win, 2 for +2R, 0 for breakeven, or -1 for a 1R
                loss.
              </p>
            </div>
            <div className="border-t border-border pt-5">
              <Label htmlFor="backtest-image" className="text-xs font-medium">
                Chart screenshot (optional)
              </Label>
              <label
                htmlFor="backtest-image"
                className="mt-2 flex min-h-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-primary/30 bg-primary/[.035] text-center transition hover:bg-primary/[.07]"
              >
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Selected GBPUSD chart preview"
                    width={960}
                    height={540}
                    unoptimized
                    className="max-h-72 w-full object-contain"
                  />
                ) : (
                  <span className="flex flex-col items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
                    <ImagePlus className="size-5 text-primary" />
                    Add a PNG, JPEG, or WebP chart (max 5 MB)
                  </span>
                )}
              </label>
              <Input
                id="backtest-image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setImageFile(file);
                  setPreviewUrl(file ? URL.createObjectURL(file) : null);
                  setRemoveExistingImage(false);
                  setSaveState('idle');
                }}
              />
              {previewUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-destructive"
                  onClick={() => {
                    setImageFile(null);
                    setPreviewUrl(null);
                    setRemoveExistingImage(true);
                  }}
                >
                  <Trash2 /> Remove chart
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl"
                  onClick={() => {
                    resetEditor();
                    setSaveState('idle');
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className="h-11 flex-1 rounded-xl"
                disabled={saveState === 'saving'}
              >
                {saveState === 'saving' ? (
                  <Activity className="animate-spin" />
                ) : (
                  <Check />
                )}
                {saveState === 'saving'
                  ? 'Saving…'
                  : editingId
                    ? 'Update backtest'
                    : 'Save backtest'}
              </Button>
            </div>
            {saveState === 'saved' && (
              <p className="text-center text-xs font-medium text-emerald-500">
                GBPUSD backtest saved successfully.
              </p>
            )}
            {saveState === 'error' && (
              <p className="text-center text-xs font-medium text-destructive">
                Could not save this backtest. Please try again.
              </p>
            )}
          </div>
        </form>
      )}
      {backtestTab === 'history' && (
        <section className="surface mx-auto max-w-3xl p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Backtest history</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Your saved GBPUSD results and chart screenshots.
              </p>
            </div>
            <Badge variant="outline">{backtests.length} entries</Badge>
          </div>
          {loading ? (
            <div className="flex min-h-28 items-center justify-center">
              <Activity className="size-4 animate-spin text-primary" />
            </div>
          ) : backtests.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-border p-8 text-center">
              <BarChart3 className="mx-auto size-6 text-primary" />
              <p className="mt-3 text-sm font-medium">No saved backtests yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Save a result above and your analytics will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {backtests.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  {item.imageUrl && (
                    <Image
                      src={item.imageUrl}
                      alt="GBPUSD backtest chart"
                      width={720}
                      height={405}
                      className="aspect-video w-full object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">GBPUSD</p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatBacktestDate(item.backtestDate)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Badge
                        className={
                          item.resultR > 0
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : item.resultR < 0
                              ? 'bg-destructive/10 text-destructive'
                              : ''
                        }
                        variant="secondary"
                      >
                        {item.resultR > 0 ? '+' : ''}
                        {item.resultR}R
                      </Badge>
                    </div>
                    <div className="mt-4 flex gap-2 border-t border-border pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => editBacktest(item)}
                      >
                        <Pencil /> Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 /> Delete
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this backtest?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the GBPUSD entry and its chart image.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteBacktest}>
              Delete backtest
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
function BacktestTabs({
  value,
  historyCount,
  onChange,
}: {
  value: BacktestTab;
  historyCount: number;
  onChange: (tab: BacktestTab) => void;
}) {
  const tabs = [
    { value: 'log', label: 'Log Backtest', icon: FlaskConical },
    { value: 'calendar', label: 'Calendar', icon: CalendarDays },
    { value: 'analytics', label: 'Analytics', icon: BarChart3 },
    { value: 'history', label: 'History', icon: BookOpenCheck },
  ] as const;

  return (
    <div
      role="tablist"
      aria-label="Backtesting sections"
      className="surface mb-5 overflow-x-auto p-1.5"
    >
      <div className="grid min-w-[570px] grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = value === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.value)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-medium transition ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <Icon className="size-4" />
              {tab.label}
              {tab.value === 'history' && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? 'bg-primary-foreground/15' : 'bg-muted'}`}
                >
                  {historyCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
type CalendarDayResult = {
  trades: number;
  wins: number;
  losses: number;
  netR: number;
};
function BacktestCalendar({
  backtests,
  month,
  selectedDate,
  onMonthChange,
  onDateSelect,
}: {
  backtests: SavedBacktest[];
  month: string;
  selectedDate: string;
  onMonthChange: (month: string) => void;
  onDateSelect: (date: string) => void;
}) {
  const [year, monthNumber] = month.split('-').map(Number);
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const resultsByDate = backtests.reduce<Map<string, CalendarDayResult>>(
    (results, item) => {
      if (!item.backtestDate.startsWith(`${month}-`)) return results;
      const current = results.get(item.backtestDate) ?? {
        trades: 0,
        wins: 0,
        losses: 0,
        netR: 0,
      };
      current.trades += 1;
      current.wins += item.resultR > 0 ? 1 : 0;
      current.losses += item.resultR < 0 ? 1 : 0;
      current.netR += item.resultR;
      results.set(item.backtestDate, current);
      return results;
    },
    new Map(),
  );
  const monthResults = [...resultsByDate.values()].reduce<CalendarDayResult>(
    (total, day) => ({
      trades: total.trades + day.trades,
      wins: total.wins + day.wins,
      losses: total.losses + day.losses,
      netR: total.netR + day.netR,
    }),
    { trades: 0, wins: 0, losses: 0, netR: 0 },
  );
  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleDateString(
    undefined,
    {
      month: 'long',
      year: 'numeric',
    },
  );
  const changeMonth = (offset: number) => {
    const next = new Date(year, monthNumber - 1 + offset, 1);
    onMonthChange(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`,
    );
  };
  const cells = Array.from(
    { length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 },
    (_, index) => {
      const day = index - firstWeekday + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    },
  );

  return (
    <section className="surface mb-5 overflow-hidden p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Win / loss calendar</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Daily GBPUSD results. Select a day to log another backtest.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="Previous month"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft />
          </Button>
          <div className="min-w-36 text-center text-sm font-semibold">
            {monthLabel}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="Next month"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:max-w-xl">
        <CalendarSummary label="Trades" value={`${monthResults.trades}`} />
        <CalendarSummary
          label="Wins"
          value={`${monthResults.wins}`}
          tone="win"
        />
        <CalendarSummary
          label="Losses"
          value={`${monthResults.losses}`}
          tone="loss"
        />
        <CalendarSummary
          label="Net"
          value={`${monthResults.netR > 0 ? '+' : ''}${monthResults.netR.toFixed(1)}R`}
          tone={
            monthResults.netR > 0
              ? 'win'
              : monthResults.netR < 0
                ? 'loss'
                : undefined
          }
        />
      </div>
      <div className="mt-5 grid grid-cols-7 border-l border-t border-border text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="border-b border-r border-border py-2">
            <span className="sm:hidden">{day.charAt(0)}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
        {cells.map((day, index) => {
          if (day === null) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-16 border-b border-r border-border bg-muted/15 sm:min-h-24"
              />
            );
          }
          const date = `${month}-${String(day).padStart(2, '0')}`;
          const result = resultsByDate.get(date);
          const tone = result
            ? result.netR > 0
              ? 'border-emerald-500/30 bg-emerald-500/[.08] hover:bg-emerald-500/[.13]'
              : result.netR < 0
                ? 'border-destructive/30 bg-destructive/[.08] hover:bg-destructive/[.13]'
                : 'bg-muted/45 hover:bg-muted/65'
            : 'hover:bg-primary/[.04]';
          return (
            <button
              key={date}
              type="button"
              aria-label={`${formatBacktestDate(date)}${result ? `, ${result.wins} wins, ${result.losses} losses, ${result.netR.toFixed(1)} R` : ', no trades'}`}
              onClick={() => onDateSelect(date)}
              className={`min-h-16 border-b border-r border-border p-1.5 text-left transition sm:min-h-24 sm:p-2 ${tone} ${selectedDate === date ? 'relative z-10 ring-2 ring-inset ring-primary' : ''}`}
            >
              <span className="text-xs font-semibold">{day}</span>
              {result && (
                <span className="mt-1 flex flex-col gap-0.5">
                  <span
                    className={`text-[10px] font-semibold sm:text-xs ${result.netR > 0 ? 'text-emerald-500' : result.netR < 0 ? 'text-destructive' : 'text-foreground'}`}
                  >
                    {result.netR > 0 ? '+' : ''}
                    {result.netR.toFixed(1)}R
                  </span>
                  <span className="hidden text-[9px] text-muted-foreground sm:block">
                    {result.wins}W · {result.losses}L
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
        <CalendarLegend className="bg-emerald-500" label="Winning day" />
        <CalendarLegend className="bg-destructive" label="Losing day" />
        <CalendarLegend className="bg-muted-foreground" label="Breakeven" />
      </div>
    </section>
  );
}
function CalendarSummary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'win' | 'loss';
}) {
  return (
    <div className="rounded-xl bg-muted/45 px-2.5 py-2">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 text-sm font-semibold ${tone === 'win' ? 'text-emerald-500' : tone === 'loss' ? 'text-destructive' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
function CalendarLegend({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}
function BacktestEquityCurve({ backtests }: { backtests: SavedBacktest[] }) {
  const chronological = [...backtests].sort(
    (a, b) =>
      a.backtestDate.localeCompare(b.backtestDate) ||
      Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  const curve = chronological.reduce<number[]>(
    (points, item) => [...points, points.at(-1)! + item.resultR],
    [0],
  );
  const net = curve.at(-1) ?? 0;
  return (
    <article className="surface overflow-hidden p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Backtest equity curve</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cumulative RR across saved GBPUSD trades.
          </p>
        </div>
        <Badge
          variant="outline"
          className={net >= 0 ? 'text-emerald-500' : 'text-destructive'}
        >
          {net > 0 ? '+' : ''}
          {net.toFixed(1)}R
        </Badge>
      </div>
      <div className="mt-5 h-48 sm:h-56">
        <svg
          viewBox="0 0 760 230"
          className="h-full w-full"
          preserveAspectRatio="none"
          aria-label={`Backtest equity curve ending at ${net.toFixed(1)}R`}
        >
          <title>Backtest cumulative RR equity curve</title>
          {[35, 85, 135, 185].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="760"
              y2={y}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="4 6"
            />
          ))}
          <polyline
            points={seriesPoints(curve)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>Start</span>
        <span>
          {backtests.length ? `Trade ${backtests.length}` : 'No trades yet'}
        </span>
      </div>
    </article>
  );
}
function BacktestStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
function formatBacktestDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
function Journal({
  backtests,
  loading,
  onLog,
}: {
  backtests: SavedBacktest[];
  loading: boolean;
  onLog: () => void;
}) {
  const wins = backtests.filter((item) => item.resultR > 0).length;
  const netR = backtests.reduce((total, item) => total + item.resultR, 0);
  const averageR = backtests.length ? netR / backtests.length : 0;
  return (
    <>
      <PageHeading
        eyebrow="Execution record"
        title="Trading journal"
        description="Review your saved GBPUSD backtest results without demo data or invented statistics."
        action={
          <Button onClick={onLog}>
            <Plus /> Log backtest
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Saved results"
          value={loading ? '…' : `${backtests.length}`}
          detail="GBPUSD backtests"
          icon={BookOpenCheck}
        />
        <Metric
          label="Win rate"
          value={
            loading
              ? '…'
              : backtests.length
                ? `${Math.round((wins / backtests.length) * 100)}%`
                : '—'
          }
          detail={`${wins} winning result${wins === 1 ? '' : 's'}`}
          positive={wins > 0}
          icon={Target}
        />
        <Metric
          label="Average result"
          value={
            loading ? '…' : backtests.length ? `${averageR.toFixed(2)}R` : '—'
          }
          detail="Across saved backtests"
          icon={TrendingUp}
        />
        <Metric
          label="Net result"
          value={
            loading
              ? '…'
              : backtests.length
                ? `${netR > 0 ? '+' : ''}${netR.toFixed(1)}R`
                : '—'
          }
          detail="Cumulative RR"
          positive={netR > 0}
          icon={netR < 0 ? TrendingDown : BarChart3}
        />
      </div>
      <RecentBacktests backtests={backtests} loading={loading} onOpen={onLog} />
    </>
  );
}
function Analytics({
  accounts,
  backtests,
}: {
  accounts: TradingAccount[];
  backtests: SavedBacktest[];
}) {
  const wins = backtests.filter((item) => item.resultR > 0).length;
  const losses = backtests.filter((item) => item.resultR < 0).length;
  const breakeven = backtests.length - wins - losses;
  const netR = backtests.reduce((total, item) => total + item.resultR, 0);
  const best = backtests.length
    ? Math.max(...backtests.map((item) => item.resultR))
    : null;
  const worst = backtests.length
    ? Math.min(...backtests.map((item) => item.resultR))
    : null;
  return (
    <>
      <PageHeading
        eyebrow="Cross-account intelligence"
        title="Analytics"
        description="Performance calculated only from your saved accounts and GBPUSD backtests."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="surface p-5">
          <h2 className="text-sm font-semibold">Account performance</h2>
          {accounts.length ? (
            <div className="mt-6 space-y-5">
              {accounts.map((account) => {
                const growth = account.startingBalance
                  ? (account.pnl / account.startingBalance) * 100
                  : 0;
                return (
                  <div key={account.id}>
                    <div className="mb-2 flex justify-between text-xs">
                      <span>{account.name}</span>
                      <span
                        className={`font-semibold ${growth > 0 ? 'text-emerald-500' : growth < 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                      >
                        {growth > 0 ? '+' : ''}
                        {growth.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${growth < 0 ? 'bg-destructive' : 'bg-primary'}`}
                        style={{
                          width: `${Math.min(Math.abs(growth) * 7, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Add a trading account to see balance growth here.
            </p>
          )}
        </article>
        <article className="surface p-5">
          <h2 className="text-sm font-semibold">Backtest outcomes</h2>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <OutcomeStat label="Wins" value={wins} tone="win" />
            <OutcomeStat label="Losses" value={losses} tone="loss" />
            <OutcomeStat label="Breakeven" value={breakeven} />
          </div>
          <div className="mt-5 space-y-3 border-t border-border pt-5">
            <AnalyticsRow
              label="Win rate"
              value={
                backtests.length
                  ? `${Math.round((wins / backtests.length) * 100)}%`
                  : '—'
              }
            />
            <AnalyticsRow
              label="Net RR"
              value={
                backtests.length
                  ? `${netR > 0 ? '+' : ''}${netR.toFixed(1)}R`
                  : '—'
              }
              tone={netR > 0 ? 'win' : netR < 0 ? 'loss' : undefined}
            />
            <AnalyticsRow
              label="Best result"
              value={best === null ? '—' : `${best > 0 ? '+' : ''}${best}R`}
              tone={best !== null && best > 0 ? 'win' : undefined}
            />
            <AnalyticsRow
              label="Worst result"
              value={worst === null ? '—' : `${worst > 0 ? '+' : ''}${worst}R`}
              tone={worst !== null && worst < 0 ? 'loss' : undefined}
            />
          </div>
        </article>
      </div>
    </>
  );
}
function OutcomeStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'win' | 'loss';
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-3 text-center">
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${tone === 'win' ? 'text-emerald-500' : tone === 'loss' ? 'text-destructive' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
function AnalyticsRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'win' | 'loss';
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`font-semibold ${tone === 'win' ? 'text-emerald-500' : tone === 'loss' ? 'text-destructive' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[.18em] text-secondary-foreground dark:text-secondary">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-[-.04em] sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function NumberField({
  label,
  value,
  onChange,
  step = '1',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        step={step}
        className="h-10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}
function SignedRField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const presets = ['-1', '0', '1', '2', '3'];
  return (
    <Field label="RR / trade result">
      <div className="flex gap-2">
        <Input
          type="text"
          inputMode="decimal"
          value={value}
          placeholder="Example: -1 or 3"
          aria-describedby="rr-help"
          onChange={(event) => {
            const next = event.target.value.replace(',', '.');
            if (/^-?\d*(?:\.\d*)?$/.test(next)) onChange(next);
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="w-12 text-base"
          aria-label="Toggle positive or negative RR"
          onClick={() =>
            onChange(value.startsWith('-') ? value.slice(1) : `-${value}`)
          }
        >
          ±
        </Button>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Quick RR values">
        {presets.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant={value === preset ? 'secondary' : 'outline'}
            size="sm"
            className="min-w-12"
            onClick={() => onChange(preset)}
          >
            {Number(preset) > 0 ? '+' : ''}
            {preset}R
          </Button>
        ))}
      </div>
    </Field>
  );
}
function AccountDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: TradingAccount | null;
  onSave: (a: TradingAccount) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={editing?.id ?? 'new'}
        className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]"
      >
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit trading account' : 'Add trading account'}
          </DialogTitle>
          <DialogDescription>
            Set independent capital and risk limits. Everything remains editable
            later.
          </DialogDescription>
        </DialogHeader>
        <AccountForm editing={editing} onSave={onSave} />
      </DialogContent>
    </Dialog>
  );
}
function AccountForm({
  editing,
  onSave,
}: {
  editing: TradingAccount | null;
  onSave: (a: TradingAccount) => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    type: (editing?.type ?? 'Personal') as AccountType,
    platform: editing?.platform ?? '',
    currency: editing?.currency ?? 'USD',
    balance: editing?.balance ?? 10000,
    riskPercent: editing?.riskPercent ?? 1,
    dailyLossPercent: editing?.dailyLossPercent ?? 3,
    maxLossPercent: editing?.maxLossPercent ?? 8,
  });
  const submit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const startingBalance = editing?.startingBalance ?? form.balance;
    const savedEquity = Array.isArray(editing?.equity)
      ? editing.equity.filter((value) => Number.isFinite(value))
      : [];
    const currentEquity = startingBalance
      ? (form.balance / startingBalance) * 100
      : 100;
    const equity = savedEquity.length ? [...savedEquity] : [100];
    if (Math.abs((equity.at(-1) ?? 100) - currentEquity) > 0.001) {
      equity.push(currentEquity);
    }
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      ...form,
      startingBalance,
      pnl: form.balance - startingBalance,
      equity,
    });
  };
  const risk = (form.balance * form.riskPercent) / 100;
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account name">
          <Input
            required
            className="h-10"
            placeholder="e.g. FTMO 100K"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Account type">
          <Select
            value={form.type}
            onValueChange={(v) =>
              v && setForm({ ...form, type: v as AccountType })
            }
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['Personal', 'Forex', 'Prop firm'].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Broker / platform">
          <Input
            className="h-10"
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
          />
        </Field>
        <Field label="Currency">
          <Select
            value={form.currency}
            onValueChange={(v) => v && setForm({ ...form, currency: v })}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['USD', 'EUR', 'GBP', 'PHP'].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <NumberField
          label="Current balance"
          value={form.balance}
          onChange={(balance) => setForm({ ...form, balance })}
        />
        <NumberField
          label="Risk per trade %"
          value={form.riskPercent}
          step="0.05"
          onChange={(riskPercent) => setForm({ ...form, riskPercent })}
        />
        <NumberField
          label="Daily stop loss %"
          value={form.dailyLossPercent}
          step="0.1"
          onChange={(dailyLossPercent) =>
            setForm({ ...form, dailyLossPercent })
          }
        />
        <NumberField
          label="Maximum loss %"
          value={form.maxLossPercent}
          step="0.1"
          onChange={(maxLossPercent) => setForm({ ...form, maxLossPercent })}
        />
      </div>
      <div className="rounded-xl border border-primary/15 bg-primary/[.055] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Automatic risk amount
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {money(risk, form.currency)}
            </p>
          </div>
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Default maximum loss for each new trade in this account.
        </p>
      </div>
      <DialogFooter className="mt-5">
        <Button type="submit" className="h-10">
          {editing ? 'Save changes' : 'Create account'}
        </Button>
      </DialogFooter>
    </form>
  );
}
