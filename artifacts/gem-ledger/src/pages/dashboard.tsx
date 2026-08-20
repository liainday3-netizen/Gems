import { useGetTransactionSummary, useGetTreasury, useListTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Gem, Layers3, Radio, Sparkles, Users } from "lucide-react";
import { Link } from "wouter";

const number = (value: number | undefined) => value === undefined ? "—" : value.toLocaleString();

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useGetTransactionSummary();
  const { data: treasury, isLoading: treasuryLoading } = useGetTreasury();
  const { data: recentTransactions, isLoading: transactionsLoading } = useListTransactions({ limit: 10 });
  const totalGems = summary?.totalGemsInCirculation ?? ((summary?.totalNormalGems ?? 0) + (summary?.totalRareGems ?? 0));

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Network overview</p>
          <h1 className="text-3xl font-bold tracking-tight">Ledger control room</h1>
          <p className="mt-1 text-sm text-muted-foreground">A live view of circulation, reserve health, and the last ten movements.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Radio className="h-3.5 w-3.5 text-primary" /> Data refreshes on navigation</div>
      </header>

      {summaryError && <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" data-testid="status-dashboard-error">Unable to load ledger summary. Try refreshing this page.</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total users" value={summaryLoading ? "—" : number(summary?.totalUsers)} icon={<Users className="h-4 w-4" />} testId="text-total-users" />
        <MetricCard label="Normal gems" value={summaryLoading ? "—" : number(summary?.totalNormalGems)} icon={<Gem className="h-4 w-4" />} tone="primary" testId="text-total-normal-gems" />
        <MetricCard label="Rare gems" value={summaryLoading ? "—" : number(summary?.totalRareGems)} icon={<Sparkles className="h-4 w-4" />} tone="rare" testId="text-total-rare-gems" />
        <MetricCard label="Conversions" value={summaryLoading ? "—" : number(summary?.totalConversions)} icon={<Layers3 className="h-4 w-4" />} testId="text-total-conversions" />
        <MetricCard label="Treasury backing" value={treasuryLoading ? "—" : `$${number(treasury?.backingAmount)}`} icon={<CircleDollarSign className="h-4 w-4" />} tone="primary" testId="text-treasury-backing" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden bg-card">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-start justify-between">
              <div><CardTitle>Circulation mix</CardTitle><p className="mt-1 text-sm text-muted-foreground">Dual balances across every active wallet.</p></div>
              <Link href="/wallets" data-testid="link-dashboard-wallets" className="text-xs font-semibold text-primary hover:underline">Open wallets</Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total in circulation</p><p className="number-display mt-2 text-4xl text-foreground" data-testid="text-total-gems">{summaryLoading ? "—" : number(totalGems)}</p></div>
              <div className="text-right text-xs text-muted-foreground"><p>Normal + rare</p><p className="mt-1 text-primary">Backed by treasury</p></div>
            </div>
            <div className="mt-7 h-3 overflow-hidden rounded-full bg-secondary" aria-label="Normal to rare gem ratio">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${totalGems ? Math.max(4, ((summary?.totalNormalGems ?? 0) / totalGems) * 100) : 0}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-primary/25 bg-primary/5 p-3"><p className="text-xs text-muted-foreground">Normal lane</p><p className="number-display mt-1 text-lg text-primary">{number(summary?.totalNormalGems)}</p></div>
              <div className="rounded-md border border-[hsl(40_83%_64%/0.25)] bg-[hsl(40_83%_64%/0.05)] p-3"><p className="text-xs text-muted-foreground">Rare lane</p><p className="number-display mt-1 text-lg text-[hsl(40_83%_64%)]">{number(summary?.totalRareGems)}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader><CardTitle>Transactions by app</CardTitle><p className="text-sm text-muted-foreground">Volume and net movement by source.</p></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader><TableRow className="border-border hover:bg-transparent"><TableHead>App source</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right text-primary">Credited</TableHead><TableHead className="text-right text-destructive">Debited</TableHead></TableRow></TableHeader>
              <TableBody>
                {summaryLoading ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Loading activity…</TableCell></TableRow> : summary?.transactionsByApp.length ? summary.transactionsByApp.map((stat) => <TableRow key={stat.appSource} className="border-border" data-testid={`row-app-stat-${stat.appSource}`}><TableCell className="font-mono text-xs">{stat.appSource}</TableCell><TableCell className="text-right">{number(stat.transactionCount)}</TableCell><TableCell className="text-right text-primary">{number(stat.totalCredited)}</TableCell><TableCell className="text-right text-destructive">{number(stat.totalDebited)}</TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No app activity yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/70"><div><CardTitle>Recent ledger movements</CardTitle><p className="mt-1 text-sm text-muted-foreground">Most recent credits, debits, and conversions.</p></div><Link href="/transactions" data-testid="link-dashboard-transactions" className="text-xs font-semibold text-primary hover:underline">View full ledger</Link></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow className="border-border hover:bg-transparent"><TableHead>User</TableHead><TableHead>App source</TableHead><TableHead>Lane</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {transactionsLoading ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Loading ledger…</TableCell></TableRow> : recentTransactions?.length ? recentTransactions.map((tx) => <TableRow key={tx.id} className="border-border" data-testid={`row-recent-transaction-${tx.id}`}><TableCell><Link href={`/users/${tx.userId}`} data-testid={`link-transaction-user-${tx.id}`} className="font-medium hover:text-primary">{tx.username}</Link></TableCell><TableCell className="font-mono text-xs text-muted-foreground">{tx.appSource}</TableCell><TableCell><Badge variant="outline" className={tx.gemType === "rare" ? "border-[hsl(40_83%_64%/0.35)] text-[hsl(40_83%_64%)]" : "border-primary/30 text-primary"}>{tx.gemType}</Badge></TableCell><TableCell><Badge variant="outline" className={tx.type === "credit" || tx.type === "earn" || tx.type === "transfer_in" ? "border-primary/30 bg-primary/5 text-primary" : "border-destructive/30 bg-destructive/5 text-destructive"}>{tx.type === "credit" || tx.type === "earn" || tx.type === "transfer_in" ? <ArrowUpRight className="mr-1 h-3 w-3" /> : <ArrowDownRight className="mr-1 h-3 w-3" />}{tx.type}</Badge></TableCell><TableCell className={`text-right font-mono font-medium ${tx.type === "credit" || tx.type === "earn" || tx.type === "transfer_in" ? "text-primary" : "text-destructive"}`}>{tx.type === "credit" || tx.type === "earn" || tx.type === "transfer_in" ? "+" : "-"}{number(tx.amount)}</TableCell><TableCell className="text-right text-xs text-muted-foreground">{format(new Date(tx.createdAt), "MMM d · HH:mm")}</TableCell></TableRow>) : <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">The ledger is waiting for its first movement.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon, tone = "default", testId }: { label: string; value: string; icon: React.ReactNode; tone?: "default" | "primary" | "rare"; testId: string }) {
  const toneClass = tone === "primary" ? "text-primary" : tone === "rare" ? "text-[hsl(40_83%_64%)]" : "text-foreground";
  return <Card className="bg-card"><CardContent className="p-5"><div className={`mb-5 flex h-8 w-8 items-center justify-center rounded-md border ${tone === "rare" ? "border-[hsl(40_83%_64%/0.28)] bg-[hsl(40_83%_64%/0.08)]" : "border-border bg-background"} ${toneClass}`}>{icon}</div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</p><p className={`number-display mt-2 text-2xl ${toneClass}`} data-testid={testId}>{value}</p></CardContent></Card>;
}