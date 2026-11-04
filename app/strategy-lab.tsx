'use client';

import { type SyntheticEvent, useEffect, useId, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  FlaskConical,
  GitCompareArrows,
  History,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StrategyKey } from '@/lib/strategy-tests';

type StrategyTest = {
  id: string;
  strategy: StrategyKey;
  testDate: string;
  resultR: number;
  createdAt: string;
};
type LabTab = 'analytics' | 'log' | 'history';

const config = {
  '5m': {
    name: '5-minute strategy',
    short: '5m',
    reward: 2,
    breakeven: 100 / 3,
    color: '#3a86ff',
    description: 'Fast entry model · +2R win / -1R loss',
  },
  '15m': {
    name: '15-minute strategy',
    short: '15m',
    reward: 3,
    breakeven: 25,
    color: '#a78bfa',
    description: 'Higher-timeframe model · +3R win / -1R loss',
  },
} as const;

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const nextDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

function chronological(entries: StrategyTest[]) {
  return entries.toSorted(
    (a, b) =>
      a.testDate.localeCompare(b.testDate) ||
      Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

function longestStreak(results: number[], win: boolean) {
  let current = 0;
  let longest = 0;
  results.forEach((result) => {
    if ((win && result > 0) || (!win && result < 0)) {
      current += 1;
      longest = Math.max(longest, current);
    } else current = 0;
  });
  return longest;
}

function summarize(entries: StrategyTest[], requiredWinRate: number) {
  const ordered = chronological(entries);
  const results = ordered.map((entry) => entry.resultR);
  const wins = results.filter((result) => result > 0).length;
  const losses = results.filter((result) => result < 0).length;
  const net = results.reduce((sum, result) => sum + result, 0);
  const grossProfit = results.reduce(
    (sum, result) => sum + Math.max(result, 0),
    0,
  );
  const grossLoss = Math.abs(
    results.reduce((sum, result) => sum + Math.min(result, 0), 0),
  );
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  results.forEach((result) => {
    equity += result;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  });
  const winRate = results.length ? (wins / results.length) * 100 : null;
  const recent = results.slice(-10);
  const weekdays = new Map<string, number>();
  entries.forEach((entry) => {
    const day = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${entry.testDate}T00:00:00Z`));
    weekdays.set(day, (weekdays.get(day) ?? 0) + entry.resultR);
  });
  const bestWeekday = [...weekdays.entries()].toSorted(
    ([aLabel, a], [bLabel, b]) => b - a || aLabel.localeCompare(bLabel),
  )[0];
  return {
    trades: results.length,
    wins,
    losses,
    net,
    winRate,
    expectancy: results.length ? net / results.length : null,
    profitFactor:
      grossLoss > 0
        ? grossProfit / grossLoss
        : grossProfit > 0
          ? Infinity
          : null,
    maxDrawdown,
    recovery: maxDrawdown > 0 ? net / maxDrawdown : null,
    edge: winRate === null ? null : winRate - requiredWinRate,
    longestWins: longestStreak(results, true),
    longestLosses: longestStreak(results, false),
    recentExpectancy: recent.length
      ? recent.reduce((sum, result) => sum + result, 0) / recent.length
      : null,
    bestWeekday: bestWeekday
      ? `${bestWeekday[0]} · ${bestWeekday[1] > 0 ? '+' : ''}${bestWeekday[1]}R`
      : '—',
    results,
  };
}

function ratio(value: number | null) {
  if (value === null) return '—';
  return Number.isFinite(value) ? value.toFixed(2) : '∞';
}

function signed(value: number | null, suffix = 'R', digits = 2) {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}${suffix}`;
}

function dailyCorrelation(five: StrategyTest[], fifteen: StrategyTest[]) {
  const aggregate = (entries: StrategyTest[]) => {
    const map = new Map<string, number>();
    entries.forEach((entry) =>
      map.set(entry.testDate, (map.get(entry.testDate) ?? 0) + entry.resultR),
    );
    return map;
  };
  const a = aggregate(five);
  const b = aggregate(fifteen);
  const dates = [...a.keys()].filter((date) => b.has(date));
  if (dates.length < 3) return { value: null, pairedDays: dates.length };
  const x = dates.map((date) => a.get(date)!);
  const y = dates.map((date) => b.get(date)!);
  const xMean = x.reduce((sum, value) => sum + value, 0) / x.length;
  const yMean = y.reduce((sum, value) => sum + value, 0) / y.length;
  const numerator = x.reduce(
    (sum, value, index) => sum + (value - xMean) * (y[index] - yMean),
    0,
  );
  const xVariance = x.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
  const yVariance = y.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
  const denominator = Math.sqrt(xVariance * yVariance);
  return {
    value: denominator ? numerator / denominator : null,
    pairedDays: dates.length,
  };
}

export default function StrategyLab() {
  const formId = useId().replaceAll(':', '');
  const [entries, setEntries] = useState<StrategyTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<LabTab>('analytics');
  const [year, setYear] = useState('all');
  const [strategy, setStrategy] = useState<StrategyKey>('5m');
  const [testDate, setTestDate] = useState(today);
  const [resultR, setResultR] = useState(2);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StrategyTest | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void fetch('/api/strategy-tests', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load strategy tests');
        return (await response.json()) as StrategyTest[];
      })
      .then(setEntries)
      .catch(() => setMessage('Could not load the Strategy Lab data.'))
      .finally(() => setLoading(false));
  }, []);

  const years = [...new Set(entries.map((entry) => entry.testDate.slice(0, 4)))]
    .filter((item) => /^\d{4}$/.test(item))
    .toSorted((a, b) => b.localeCompare(a));
  const filtered = entries.filter(
    (entry) => year === 'all' || entry.testDate.startsWith(`${year}-`),
  );
  const five = filtered.filter((entry) => entry.strategy === '5m');
  const fifteen = filtered.filter((entry) => entry.strategy === '15m');
  const fiveStats = summarize(five, config['5m'].breakeven);
  const fifteenStats = summarize(fifteen, config['15m'].breakeven);
  const combined = chronological(filtered);
  const combinedStats = summarize(combined, 0);
  const correlation = dailyCorrelation(five, fifteen);
  const leader =
    fiveStats.expectancy === null && fifteenStats.expectancy === null
      ? null
      : (fiveStats.expectancy ?? -Infinity) >
          (fifteenStats.expectancy ?? -Infinity)
        ? '5m'
        : (fifteenStats.expectancy ?? -Infinity) >
            (fiveStats.expectancy ?? -Infinity)
          ? '15m'
          : fiveStats.net >= fifteenStats.net
            ? '5m'
            : '15m';
  const drawdownTotal = fiveStats.maxDrawdown + fifteenStats.maxDrawdown;
  const drawdownCompression = drawdownTotal
    ? (1 - combinedStats.maxDrawdown / drawdownTotal) * 100
    : null;

  const save = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const response = await fetch('/api/strategy-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy, testDate, resultR }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setMessage(body.error ?? 'Unable to save this test.');
      setSaving(false);
      return;
    }
    const saved = (await response.json()) as StrategyTest;
    setEntries((current) => [saved, ...current]);
    setTestDate((current) => nextDate(current));
    setMessage(`${config[strategy].short} result saved. Analytics updated.`);
    setSaving(false);
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const response = await fetch(`/api/strategy-tests/${deleteTarget.id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      setEntries((current) =>
        current.filter((entry) => entry.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
    } else setMessage('Could not delete this test.');
    setDeleting(false);
  };

  const tabs = [
    { value: 'analytics', label: 'Head-to-head', icon: GitCompareArrows },
    { value: 'log', label: 'Log test', icon: Plus },
    { value: 'history', label: 'History', icon: History },
  ] as const;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
            Two systems · one decision
          </p>
          <h1 className="text-2xl font-semibold tracking-[-.04em] sm:text-[32px]">
            Strategy Lab
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Test the GBPUSD 5m and 15m models independently, then measure how
            they perform together.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">5m · +2R / -1R</Badge>
          <Badge variant="outline">15m · +3R / -1R</Badge>
        </div>
      </div>

      <div className="surface mb-5 overflow-x-auto p-1.5">
        <div className="grid min-w-[430px] grid-cols-3 gap-1" role="tablist">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.value)}
                className={`tab-pill flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-medium ${active ? 'is-active bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <Icon className="size-4" />
                {item.label}
                {item.value === 'history' ? (
                  <span className="rounded-full bg-muted/70 px-1.5 py-0.5 text-[9px] text-foreground">
                    {entries.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'analytics' ? (
        <div className="premium-enter space-y-4">
          <div className="flex justify-end">
            <label className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              Period
              <select
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:border-primary"
              >
                <option value="all">All time</option>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LabMetric
              label="Current leader"
              value={leader ? config[leader].name : 'No data'}
              detail="Ranked by expectancy per entry"
              icon={Trophy}
              positive={Boolean(leader)}
            />
            <LabMetric
              label="Combined result"
              value={signed(combinedStats.net, 'R', 1)}
              detail={`${combinedStats.trades} total tested entries`}
              icon={TrendingUp}
              positive={combinedStats.net > 0}
            />
            <LabMetric
              label="Combined expectancy"
              value={signed(combinedStats.expectancy)}
              detail="Average R per entry across both"
              icon={Target}
              positive={(combinedStats.expectancy ?? 0) > 0}
            />
            <LabMetric
              label="Combined max drawdown"
              value={`${combinedStats.maxDrawdown.toFixed(1)}R`}
              detail="Chronological portfolio drawdown"
              icon={Activity}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <StrategyScorecard strategy="5m" stats={fiveStats} />
            <StrategyScorecard strategy="15m" stats={fifteenStats} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <StrategyCurve strategy="5m" entries={five} />
            <StrategyCurve strategy="15m" entries={fifteen} />
          </div>

          <CurveCard
            title="Combined strategy equity"
            description="Both strategies merged chronologically by backtest date. Each result keeps its own payout model."
            values={combined.map((entry) => entry.resultR)}
            color="var(--primary)"
            countLabel={`${combined.length} combined entries`}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <InsightCard
              icon={GitCompareArrows}
              label="Same-day correlation"
              value={
                correlation.value === null
                  ? 'Collect more paired days'
                  : correlation.value.toFixed(2)
              }
              detail={
                correlation.value === null
                  ? `${correlation.pairedDays}/3 paired dates available`
                  : correlation.value < 0.25
                    ? 'Low overlap: useful diversification'
                    : correlation.value < 0.65
                      ? 'Moderate overlap between systems'
                      : 'High overlap: systems often move together'
              }
            />
            <InsightCard
              icon={Zap}
              label="Drawdown compression"
              value={
                drawdownCompression === null
                  ? '—'
                  : `${drawdownCompression > 0 ? '+' : ''}${drawdownCompression.toFixed(1)}%`
              }
              detail="Combined drawdown versus both standalone drawdowns added together"
            />
            <InsightCard
              icon={CheckCircle2}
              label="Research verdict"
              value={
                fiveStats.trades < 20 || fifteenStats.trades < 20
                  ? 'Build the sample'
                  : (fiveStats.expectancy ?? 0) > 0 &&
                      (fifteenStats.expectancy ?? 0) > 0
                    ? 'Both show an edge'
                    : leader
                      ? `Favor the ${leader} model`
                      : 'No edge yet'
              }
              detail={
                fiveStats.trades < 20 || fifteenStats.trades < 20
                  ? 'Aim for at least 20 entries per strategy before choosing.'
                  : 'Based on expectancy, drawdown, and current sample size.'
              }
            />
          </div>
        </div>
      ) : null}

      {tab === 'log' ? (
        <form
          onSubmit={save}
          className="surface premium-enter mx-auto max-w-3xl p-5 sm:p-7"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Log a strategy test</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                No screenshots or extra fields—just strategy, date, and result.
              </p>
            </div>
            <Badge variant="secondary">GBPUSD</Badge>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <Label>Strategy</Label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {(['5m', '15m'] as const).map((key) => {
                  const id = `${formId}-${key}`;
                  return (
                    <div key={key}>
                      <input
                        id={id}
                        className="sr-only"
                        type="radio"
                        name={`${formId}-strategy`}
                        value={key}
                        checked={strategy === key}
                        onChange={() => {
                          setStrategy(key);
                          setResultR(config[key].reward);
                          setMessage('');
                        }}
                      />
                      <label
                        htmlFor={id}
                        className={`block cursor-pointer rounded-2xl border p-4 text-left transition ${strategy === key ? 'border-primary bg-primary/10 shadow-[0_12px_30px_rgba(58,134,255,.12)]' : 'border-border bg-muted/25 hover:border-primary/35 hover:bg-muted/50'}`}
                      >
                        <span className="text-lg font-semibold">{key}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {config[key].description}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="strategy-test-date">Backtest date</Label>
              <Input
                id="strategy-test-date"
                className="mt-2"
                type="date"
                required
                value={testDate}
                onChange={(event) => {
                  setTestDate(event.target.value);
                  setMessage('');
                }}
              />
            </div>

            <div>
              <Label>Result</Label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {[config[strategy].reward, -1].map((result) => {
                  const id = `${formId}-result-${result}`;
                  return (
                    <div key={result}>
                      <input
                        id={id}
                        className="sr-only"
                        type="radio"
                        name={`${formId}-result`}
                        value={result}
                        checked={resultR === result}
                        onChange={() => {
                          setResultR(result);
                          setMessage('');
                        }}
                      />
                      <label
                        htmlFor={id}
                        className={`result-choice ${result > 0 ? 'result-choice-win' : 'result-choice-loss'} ${resultR === result ? 'is-active' : ''}`}
                      >
                        <span className="text-xl font-semibold">
                          {result > 0 ? '+' : ''}
                          {result}R
                        </span>
                        <span className="text-[10px] uppercase tracking-[.16em]">
                          {result > 0 ? 'Win' : 'Loss'}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {message ? (
              <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                {message}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={saving}
            >
              <FlaskConical /> {saving ? 'Saving…' : 'Save test'}
            </Button>
          </div>
        </form>
      ) : null}

      {tab === 'history' ? (
        <div className="surface premium-enter overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold">Strategy test history</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Every 5m and 15m result in one chronological logbook.
              </p>
            </div>
            <Badge variant="outline">{entries.length} tests</Badge>
          </div>
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Loading strategy tests…
            </p>
          ) : entries.length ? (
            <div className="divide-y divide-border">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-muted/30 sm:px-5"
                >
                  <span
                    className="grid size-10 place-items-center rounded-xl text-xs font-semibold"
                    style={{
                      background: `${config[entry.strategy].color}18`,
                      color: config[entry.strategy].color,
                    }}
                  >
                    {entry.strategy}
                  </span>
                  <div className="min-w-32 flex-1">
                    <p className="text-sm font-medium">
                      {config[entry.strategy].name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(
                        `${entry.testDate}T00:00:00Z`,
                      ).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      entry.resultR > 0
                        ? 'text-emerald-500'
                        : 'text-destructive'
                    }
                  >
                    {entry.resultR > 0 ? '+' : ''}
                    {entry.resultR}R · {entry.resultR > 0 ? 'Win' : 'Loss'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete strategy test"
                    onClick={() => setDeleteTarget(entry)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <FlaskConical className="mx-auto size-6 text-primary" />
              <p className="mt-3 text-sm font-medium">No tests logged yet</p>
              <Button className="mt-4" onClick={() => setTab('log')}>
                <Plus /> Log the first test
              </Button>
            </div>
          )}
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this strategy test?</AlertDialogTitle>
            <AlertDialogDescription>
              The result will be removed from its individual and combined
              analytics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={remove}
            >
              {deleting ? 'Deleting…' : 'Delete test'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LabMetric({
  label,
  value,
  detail,
  icon: Icon,
  positive,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  positive?: boolean;
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
      <p className="mt-3 text-xl font-semibold tracking-[-.04em]">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>
    </article>
  );
}

function StrategyScorecard({
  strategy,
  stats,
}: {
  strategy: StrategyKey;
  stats: ReturnType<typeof summarize>;
}) {
  const details = config[strategy];
  const rows = [
    ['Entries', String(stats.trades)],
    ['Wins / losses', `${stats.wins} / ${stats.losses}`],
    ['Win rate', stats.winRate === null ? '—' : `${stats.winRate.toFixed(1)}%`],
    ['Required win rate', `${details.breakeven.toFixed(1)}%`],
    ['Edge over breakeven', signed(stats.edge, '%', 1)],
    ['Net result', signed(stats.net, 'R', 1)],
    ['Expectancy / entry', signed(stats.expectancy)],
    ['Profit factor', ratio(stats.profitFactor)],
    ['Maximum drawdown', `${stats.maxDrawdown.toFixed(1)}R`],
    ['Recovery factor', ratio(stats.recovery)],
    ['Longest win streak', String(stats.longestWins)],
    ['Longest loss streak', String(stats.longestLosses)],
    ['Recent 10 expectancy', signed(stats.recentExpectancy)],
    ['Best weekday', stats.bestWeekday],
  ];
  return (
    <article className="surface overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[9px] font-semibold uppercase tracking-[.18em]"
            style={{ color: details.color }}
          >
            {details.short} model
          </p>
          <h2 className="mt-1 text-lg font-semibold">{details.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {details.description}
          </p>
        </div>
        <Badge variant="outline">{signed(stats.net, 'R', 1)}</Badge>
      </div>
      <div className="mt-5 grid gap-x-8 gap-y-3 border-t border-border pt-5 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function StrategyCurve({
  strategy,
  entries,
}: {
  strategy: StrategyKey;
  entries: StrategyTest[];
}) {
  const details = config[strategy];
  const ordered = chronological(entries);
  return (
    <CurveCard
      title={`${details.name} equity`}
      description={`${details.short} standalone cumulative R curve.`}
      values={ordered.map((entry) => entry.resultR)}
      color={details.color}
      countLabel={`${entries.length} tested entries`}
    />
  );
}

function CurveCard({
  title,
  description,
  values,
  color,
  countLabel,
}: {
  title: string;
  description: string;
  values: number[];
  color: string;
  countLabel: string;
}) {
  const gradientId = `lab-${useId().replaceAll(':', '')}`;
  const curve = values.reduce<number[]>(
    (points, value) => [...points, points.at(-1)! + value],
    [0],
  );
  const net = curve.at(-1) ?? 0;
  const min = Math.min(...curve, 0) - 1;
  const max = Math.max(...curve, 0) + 1;
  const range = Math.max(max - min, 1);
  const yFor = (value: number) => 210 - ((value - min) / range) * 185;
  const points = curve
    .map(
      (value, index) =>
        `${(index / Math.max(curve.length - 1, 1)) * 760},${yFor(value)}`,
    )
    .join(' ');
  const area = `0,210 ${points} 760,210`;
  let peak = 0;
  let maxDrawdown = 0;
  curve.forEach((point) => {
    peak = Math.max(peak, point);
    maxDrawdown = Math.max(maxDrawdown, peak - point);
  });
  return (
    <article className="surface equity-card overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Net {signed(net, 'R', 1)}</Badge>
          <Badge variant="outline">Peak {peak.toFixed(1)}R</Badge>
          <Badge variant="outline" className="text-destructive">
            Max DD {maxDrawdown.toFixed(1)}R
          </Badge>
        </div>
      </div>
      <div className="mt-5 h-52 sm:h-64">
        <svg
          viewBox="0 0 760 230"
          className="h-full w-full"
          preserveAspectRatio="none"
          aria-label={`${title}, ending at ${net.toFixed(1)}R`}
        >
          <title>{title}</title>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[25, 71, 117, 163, 209].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="760"
              y2={y}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="3 7"
            />
          ))}
          <line
            x1="0"
            y1={yFor(0)}
            x2="760"
            y2={yFor(0)}
            stroke="var(--muted-foreground)"
            strokeOpacity=".35"
            strokeDasharray="8 8"
          />
          <polygon points={area} fill={`url(#${gradientId})`} />
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="equity-line"
          />
          <circle
            cx="760"
            cy={yFor(net)}
            r="5"
            fill={color}
            stroke="var(--card)"
            strokeWidth="3"
            className="equity-endpoint"
          />
        </svg>
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>
          {min.toFixed(1)}R — {max.toFixed(1)}R
        </span>
        <span>{countLabel}</span>
      </div>
    </article>
  );
}

function InsightCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="surface p-5">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="size-4" />
        <span className="text-[10px] font-semibold uppercase tracking-[.14em]">
          {label}
        </span>
      </div>
      <p className="mt-4 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {detail}
      </p>
    </article>
  );
}
