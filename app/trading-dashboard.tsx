'use client';

import { type SyntheticEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  FlaskConical,
  LayoutDashboard,
  ImagePlus,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
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
type BacktestVariables = {
  entryTime: string;
  setupType: 'continuation' | 'breakout' | 'reversal';
  maePips: number;
  breakoutCandle:
    | 'large-strong'
    | 'large-wicky'
    | 'medium-strong'
    | 'medium-wicky'
    | 'small-strong'
    | 'small-wicky';
  asianRangePriceAction: 'downtrend' | 'uptrend' | 'sideways' | 'choppy';
  imbalance: 'one-candle' | 'two-candle' | 'three-candle' | 'deep-retracement';
};
type SavedBacktest = {
  id: string;
  instrument: 'GBPUSD';
  variables: BacktestVariables;
  resultR: number;
  backtestDate: string;
  imageUrl: string | null;
  createdAt: string;
};
const manilaToday = () =>
  new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
const defaultBacktestVariables: BacktestVariables = {
  entryTime: '15:00',
  setupType: 'continuation',
  maePips: 8,
  breakoutCandle: 'medium-strong',
  asianRangePriceAction: 'sideways',
  imbalance: 'one-candle',
};
const backtestHours = Array.from({ length: 12 }, (_, index) =>
  String(index + 1),
);
const backtestMinutes = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0'),
);
async function fetchBacktests() {
  const response = await fetch('/api/backtests');
  if (!response.ok) throw new Error('Unable to load backtests');
  return (await response.json()) as SavedBacktest[];
}

const seedAccounts: TradingAccount[] = [
  {
    id: 'main',
    name: 'Main Portfolio',
    type: 'Personal',
    platform: 'Interactive Brokers',
    currency: 'USD',
    balance: 112481,
    startingBalance: 100000,
    riskPercent: 0.75,
    dailyLossPercent: 2,
    maxLossPercent: 6,
    pnl: 12481,
    equity: [
      100, 101, 100.5, 102, 103, 102.6, 104, 105.2, 104.8, 107, 108.4, 108,
      110.2, 112.5,
    ],
  },
  {
    id: 'ftmo',
    name: 'FTMO 100K',
    type: 'Prop firm',
    platform: 'MetaTrader 5',
    currency: 'USD',
    balance: 103820,
    startingBalance: 100000,
    riskPercent: 0.4,
    dailyLossPercent: 5,
    maxLossPercent: 10,
    pnl: 3820,
    equity: [100, 100.4, 101, 100.7, 101.8, 102.4, 102.1, 103, 102.7, 103.8],
  },
  {
    id: 'fx',
    name: 'FX Swing',
    type: 'Forex',
    platform: 'cTrader',
    currency: 'USD',
    balance: 26740,
    startingBalance: 25000,
    riskPercent: 1,
    dailyLossPercent: 3,
    maxLossPercent: 8,
    pnl: 1740,
    equity: [100, 99.5, 100.5, 101.2, 100.8, 102, 103.6, 102.9, 104.2, 106.9],
  },
];
const trades = [
  {
    ticker: 'NVDA',
    account: 'Main Portfolio',
    setup: 'Opening drive',
    result: '+$842.40',
    move: '+3.21%',
    good: true,
    time: '09:34',
  },
  {
    ticker: 'NQ',
    account: 'FTMO 100K',
    setup: 'Failed breakout',
    result: '+$516.25',
    move: '+1.84%',
    good: true,
    time: '10:12',
  },
  {
    ticker: 'EURUSD',
    account: 'FX Swing',
    setup: 'London sweep',
    result: '-$184.60',
    move: '-0.72%',
    good: false,
    time: '11:08',
  },
  {
    ticker: 'TSLA',
    account: 'Main Portfolio',
    setup: 'Trend pullback',
    result: '+$294.10',
    move: '+1.12%',
    good: true,
    time: '13:42',
  },
];
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
  const [accounts, setAccounts] = useState(seedAccounts);
  const [activeId, setActiveId] = useState('main');
  const [compareIds, setCompareIds] = useState<string[]>(['main', 'ftmo']);
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
        if (saved.length) {
          setAccounts(saved);
          setActiveId(saved[0].id);
          setCompareIds(saved.slice(0, 2).map((account) => account.id));
        }
      })
      .catch(() => undefined);
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
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon-lg" aria-label="Search">
              <Search />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Help"
              className="hidden sm:inline-flex"
            >
              <CircleHelp />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={light ? 'Use dark mode' : 'Use light mode'}
              onClick={toggleTheme}
            >
              {light ? <Moon /> : <Sun />}
            </Button>
            <Button
              className="h-10 rounded-xl px-3 text-xs font-semibold sm:px-4"
              onClick={() => setView('journal')}
            >
              <Plus />
              <span className="hidden sm:inline">Log trade</span>
              <span className="sm:hidden">Trade</span>
            </Button>
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
            />
          )}
          {view === 'accounts' && (
            <Accounts
              accounts={accounts}
              onAdd={() => openAccount()}
              onEdit={openAccount}
              onActive={setActiveId}
              activeId={activeId}
            />
          )}
          {view === 'backtesting' && <Backtesting />}{' '}
          {view === 'journal' && <Journal />}{' '}
          {view === 'analytics' && <Analytics accounts={accounts} />}
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
          Combined open risk is below plan. You have room for one A-grade setup.
        </p>
      </div>
      <button className="mt-3 flex h-10 items-center gap-3 px-3 text-[13px] text-muted-foreground">
        <Settings className="size-4" /> Settings
      </button>
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
}: {
  accounts: TradingAccount[];
  active: TradingAccount;
  compared: TradingAccount[];
  compareIds: string[];
  onCompare: (ids: string[]) => void;
  onAdd: () => void;
}) {
  const totalBalance = compared.reduce((s, a) => s + a.balance, 0),
    totalPnl = compared.reduce((s, a) => s + a.pnl, 0),
    average = compared.length
      ? compared.reduce((s, a) => s + a.riskPercent, 0) / compared.length
      : 0,
    risk = (active.balance * active.riskPercent) / 100;
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
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Compare
        </span>
        {accounts.map((a) => {
          const selected = compareIds.includes(a.id);
          return (
            <button
              key={a.id}
              onClick={() =>
                onCompare(
                  selected
                    ? compareIds.filter((id) => id !== a.id)
                    : [...compareIds, a.id],
                )
              }
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] ${selected ? 'border-primary/35 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}
            >
              {selected && <Check className="size-3" />}
              {a.name}
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Compared equity"
          value={money(totalBalance)}
          detail={`${compared.length} selected accounts`}
          icon={WalletCards}
        />
        <Metric
          label="Net P&L"
          value={money(totalPnl)}
          detail="Across selected accounts"
          positive
          icon={TrendingUp}
        />
        <Metric
          label={`${active.name} risk`}
          value={`${active.riskPercent.toFixed(2)}%`}
          detail={`${money(risk)} automatic risk`}
          icon={ShieldCheck}
        />
        <Metric
          label="Average risk"
          value={`${average.toFixed(2)}%`}
          detail="Per trade · selected"
          icon={SlidersHorizontal}
        />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.75fr)]">
        <EquityComparison accounts={compared} />
        <RiskCard account={active} />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.8fr)]">
        <TradeTable />
        <AccountSnapshot accounts={accounts} active={active} />
      </div>
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
function EquityComparison({ accounts }: { accounts: TradingAccount[] }) {
  const colors = ['#3A86FF', '#BDB2FF', '#FF9DB5'];
  return (
    <article className="surface overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium">Equity comparison</h2>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/5 text-[10px] text-primary"
            >
              Normalized
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            All curves indexed to 100 for a fair comparison.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {accounts.map((a, i) => (
            <span
              key={a.id}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              {a.name}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-7 h-[235px]">
        <svg
          viewBox="0 0 760 230"
          className="h-full w-full"
          preserveAspectRatio="none"
          aria-label="Normalized equity comparison"
        >
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
          {accounts.map((a, i) => (
            <polyline
              key={a.id}
              points={seriesPoints(a.equity)}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>Aug 4</span>
        <span>Aug 11</span>
        <span>Aug 18</span>
        <span>Aug 25</span>
        <span>Sep 2</span>
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
            {money(risk)}
          </span>
          <span className="text-sm font-medium text-primary">
            {account.riskPercent}%
          </span>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        <RiskRow
          label="Daily stop"
          amount={money(daily)}
          percent={account.dailyLossPercent}
        />
        <RiskRow
          label="Maximum loss"
          amount={money(max)}
          percent={account.maxLossPercent}
        />
        <RiskRow
          label="Current cushion"
          amount={money(Math.max(account.pnl, 0))}
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
function TradeTable() {
  return (
    <article className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-medium">Recent trades</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Live journal · all accounts
          </p>
        </div>
        <Button variant="ghost" size="sm">
          Open journal <ArrowRight />
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left">
          <thead className="text-[10px] uppercase tracking-[.13em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Asset</th>
              <th className="py-3 font-medium">Account</th>
              <th className="py-3 font-medium">Setup</th>
              <th className="py-3 font-medium">Move</th>
              <th className="px-5 py-3 text-right font-medium">Net P&L</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr
                key={`${t.ticker}-${t.time}`}
                className="border-t border-border text-xs"
              >
                <td className="px-5 py-3.5 font-semibold">
                  {t.ticker}
                  <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                    {t.time}
                  </span>
                </td>
                <td className="py-3.5 text-muted-foreground">{t.account}</td>
                <td className="py-3.5">{t.setup}</td>
                <td
                  className={
                    t.good ? 'py-3.5 text-emerald-500' : 'py-3.5 text-red-500'
                  }
                >
                  {t.move}
                </td>
                <td
                  className={
                    t.good
                      ? 'px-5 py-3.5 text-right font-semibold'
                      : 'px-5 py-3.5 text-right font-semibold text-red-500'
                  }
                >
                  {t.result}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                <span>{money(a.balance)}</span>
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
}: {
  accounts: TradingAccount[];
  onAdd: () => void;
  onEdit: (a: TradingAccount) => void;
  onActive: (id: string) => void;
  activeId: string;
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

function Backtesting() {
  const [variables, setVariables] = useState<BacktestVariables>(
    defaultBacktestVariables,
  );
  const [resultRInput, setResultRInput] = useState('1');
  const [backtestDate, setBacktestDate] = useState(manilaToday);
  const [backtests, setBacktests] = useState<SavedBacktest[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavedBacktest | null>(null);
  const [saveState, setSaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  useEffect(() => {
    void fetchBacktests()
      .then(setBacktests)
      .catch(() => setSaveState('error'))
      .finally(() => setLoading(false));
  }, []);

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
      formData.set('variables', JSON.stringify(variables));
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
      resetEditor();
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const resetEditor = () => {
    setVariables(defaultBacktestVariables);
    setResultRInput('1');
    setBacktestDate(manilaToday());
    setImageFile(null);
    setPreviewUrl(null);
    setEditingId(null);
    setRemoveExistingImage(false);
  };
  const editBacktest = (item: SavedBacktest) => {
    setVariables(item.variables);
    setResultRInput(String(item.resultR));
    setBacktestDate(item.backtestDate);
    setImageFile(null);
    setPreviewUrl(item.imageUrl);
    setEditingId(item.id);
    setRemoveExistingImage(false);
    setSaveState('idle');
    document
      .getElementById('backtest-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      <BacktestEquityCurve backtests={backtests} />
      <form
        id="backtest-form"
        onSubmit={save}
        className="surface mx-auto mt-5 max-w-3xl scroll-mt-20 p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">
              {editingId ? 'Edit GBPUSD backtest' : 'Log GBPUSD backtest'}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Record the setup, RR result, and optional chart.
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
            <p id="rr-help" className="mt-2 text-[10px] text-muted-foreground">
              Use 3 for a +3R win, 2 for +2R, 0 for breakeven, or -1 for a 1R
              loss.
            </p>
          </div>
          <div className="border-t border-border pt-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Setup variables</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Capture the session conditions behind this result.
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[9px]">
                Study profile
              </Badge>
            </div>
            <BacktestVariableFields
              value={variables}
              onChange={(next) => {
                setVariables(next);
                setSaveState('idle');
              }}
            />
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
      <section className="surface mx-auto mt-5 max-w-3xl p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Backtest history</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your saved GBPUSD studies and chart screenshots.
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
              Complete the setup above and your analytics will appear here.
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
                    <Badge variant="secondary">
                      {formatBacktestValue(item.variables.setupType)}
                    </Badge>
                    <Badge variant="secondary">
                      {formatBacktestTime(item.variables.entryTime)}
                    </Badge>
                    <Badge variant="secondary">
                      MAE {item.variables.maePips} pips
                    </Badge>
                    <Badge variant="outline">
                      {formatBacktestValue(item.variables.breakoutCandle)}
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
function formatBacktestValue(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
function formatBacktestDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
function splitBacktestTime(value: string) {
  const [hourValue = '15', minute = '00'] = value.split(':');
  const hour24 = Number(hourValue);
  return {
    hour: String(((hour24 + 11) % 12) + 1),
    minute,
    period: hour24 >= 12 ? 'PM' : 'AM',
  } as const;
}
function joinBacktestTime(hour: string, minute: string, period: 'AM' | 'PM') {
  const hour12 = Number(hour) % 12;
  const hour24 = period === 'PM' ? hour12 + 12 : hour12;
  return `${String(hour24).padStart(2, '0')}:${minute}`;
}
function formatBacktestTime(value: string) {
  const { hour, minute, period } = splitBacktestTime(value);
  return `${hour}:${minute} ${period}`;
}
function BacktestVariableFields({
  value,
  onChange,
}: {
  value: BacktestVariables;
  onChange: (value: BacktestVariables) => void;
}) {
  const update = <K extends keyof BacktestVariables>(
    key: K,
    next: BacktestVariables[K],
  ) => onChange({ ...value, [key]: next });
  const time = splitBacktestTime(value.entryTime);
  const updateTime = (next: Partial<typeof time>) => {
    const merged = { ...time, ...next };
    update(
      'entryTime',
      joinBacktestTime(merged.hour, merged.minute, merged.period),
    );
  };

  return (
    <div className="space-y-5">
      <Field label="Time">
        <div className="grid grid-cols-[1fr_1fr_1.15fr] gap-2">
          <Select
            value={time.hour}
            onValueChange={(hour) => updateTime({ hour: hour ?? time.hour })}
          >
            <SelectTrigger aria-label="Hour">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {backtestHours.map((hour) => (
                <SelectItem key={hour} value={hour}>
                  {hour}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={time.minute}
            onValueChange={(minute) =>
              updateTime({ minute: minute ?? time.minute })
            }
          >
            <SelectTrigger aria-label="Minute">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {backtestMinutes.map((minute) => (
                <SelectItem key={minute} value={minute}>
                  {minute}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={time.period}
            onValueChange={(period) =>
              updateTime({ period: period as 'AM' | 'PM' })
            }
          >
            <SelectTrigger aria-label="AM or PM">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          12-hour format, for example 3:00 PM or 6:03 PM.
        </p>
      </Field>
      <ChoiceField
        label="Setup"
        value={value.setupType}
        options={[
          ['continuation', 'Continuation'],
          ['breakout', 'Breakout'],
          ['reversal', 'Reversal'],
        ]}
        onChange={(next) => update('setupType', next)}
      />
      <NumberField
        label="MAE (pips)"
        value={value.maePips}
        step="0.1"
        onChange={(next) => update('maePips', Math.max(0, next))}
      />
      <ChoiceField
        label="Breakout candle"
        value={value.breakoutCandle}
        columns={2}
        options={[
          ['large-strong', 'Large Strong'],
          ['large-wicky', 'Large Wicky'],
          ['medium-strong', 'Medium Strong'],
          ['medium-wicky', 'Medium Wicky'],
          ['small-strong', 'Small Strong'],
          ['small-wicky', 'Small Wicky'],
        ]}
        onChange={(next) => update('breakoutCandle', next)}
      />
      <ChoiceField
        label="Asian range price action"
        value={value.asianRangePriceAction}
        columns={2}
        options={[
          ['downtrend', 'Downtrend'],
          ['uptrend', 'Uptrend'],
          ['sideways', 'Sideways'],
          ['choppy', 'Choppy'],
        ]}
        onChange={(next) => update('asianRangePriceAction', next)}
      />
      <ChoiceField
        label="Imbalance"
        value={value.imbalance}
        columns={2}
        options={[
          ['one-candle', '1 candle'],
          ['two-candle', '2 candle'],
          ['three-candle', '3 candle'],
          ['deep-retracement', 'Deep retracement'],
        ]}
        onChange={(next) => update('imbalance', next)}
      />
    </div>
  );
}
function ChoiceField<T extends string>({
  label,
  value,
  options,
  columns,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  columns?: 2;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium">{label}</legend>
      <div
        className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'sm:grid-cols-2'}`}
      >
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`min-h-10 rounded-xl border px-3 py-2 text-left text-xs transition ${
              value === option
                ? 'border-primary/45 bg-primary/10 font-medium text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
function Journal() {
  return (
    <>
      <PageHeading
        eyebrow="Execution record"
        title="Trading journal"
        description="Review live trades across every account without merging their risk calculations."
        action={
          <Button>
            <Plus /> Log trade
          </Button>
        }
      />
      <TradeTable />
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Metric
          label="Journal win rate"
          value="68.2%"
          detail="44 closed trades"
          positive
          icon={Target}
        />
        <Metric
          label="Average R"
          value="1.72R"
          detail="Across all live accounts"
          icon={TrendingUp}
        />
        <Metric
          label="Rule breaks"
          value="2"
          detail="Down 60% this month"
          icon={TrendingDown}
        />
      </div>
    </>
  );
}
function Analytics({ accounts }: { accounts: TradingAccount[] }) {
  return (
    <>
      <PageHeading
        eyebrow="Cross-account intelligence"
        title="Analytics"
        description="Find which accounts, sessions, and setups are actually producing your edge."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="surface p-5">
          <h2 className="text-sm font-semibold">Account performance</h2>
          <div className="mt-6 space-y-5">
            {accounts.map((a) => {
              const growth = (a.pnl / a.startingBalance) * 100;
              return (
                <div key={a.id}>
                  <div className="mb-2 flex justify-between text-xs">
                    <span>{a.name}</span>
                    <span className="font-semibold text-emerald-500">
                      +{growth.toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(growth * 7, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
        <article className="surface p-5">
          <h2 className="text-sm font-semibold">What is working</h2>
          <div className="mt-5 space-y-3">
            <Insight
              title="Opening drive is your strongest playbook"
              detail="72% win rate · 2.14R average"
            />
            <Insight
              title="Main Portfolio performs best before 10:30"
              detail="61% of its monthly profit comes from this window"
            />
            <Insight
              title="FX Swing risk is running hotter"
              detail="1.0% risk creates 2.5× more variance than FTMO"
              warning
            />
          </div>
        </article>
      </div>
    </>
  );
}
function Insight({
  title,
  detail,
  warning,
}: {
  title: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border p-3.5">
      <span
        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${warning ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}
      >
        {warning ? (
          <TrendingDown className="size-3.5" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
      </span>
      <div>
        <p className="text-xs font-medium">{title}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>
      </div>
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
      onSave({
        id: editing?.id ?? crypto.randomUUID(),
        ...form,
        startingBalance,
        pnl: form.balance - startingBalance,
        equity: editing?.equity ?? [100, 100],
      });
    },
    risk = (form.balance * form.riskPercent) / 100;
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
