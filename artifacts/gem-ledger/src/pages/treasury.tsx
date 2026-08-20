import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  TreasuryAdjustmentInputOperation,
  getGetTransactionSummaryQueryKey,
  getGetTreasuryQueryKey,
  useGetTreasury,
  useAdjustTreasury,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, ArrowUpRight, CircleDollarSign, Loader2, RefreshCw, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function TreasuryPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: treasury, isLoading: treasuryLoading, isError: treasuryError, refetch } = useGetTreasury();
  const [operation, setOperation] = useState<TreasuryAdjustmentInputOperation>("increase");
  const [backingAmount, setBackingAmount] = useState("");
  const [backingReason, setBackingReason] = useState("");
  const adjustTreasury = useAdjustTreasury({
    mutation: {
      onSuccess: (nextTreasury) => {
        queryClient.setQueryData(getGetTreasuryQueryKey(), nextTreasury);
        queryClient.invalidateQueries({ queryKey: getGetTransactionSummaryQueryKey() });
        setBackingAmount("");
        setBackingReason("");
        toast({ title: "Treasury backing updated", description: `$${nextTreasury.backingAmount.toLocaleString()} backing is now available.` });
      },
      onError: (error) => toast({ title: "Backing update failed", description: String(error), variant: "destructive" }),
    },
  });

  const submitBacking = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(backingAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    adjustTreasury.mutate({ data: { operation, amount, reason: backingReason.trim() || undefined } });
  };

  const backing = treasury?.backingAmount ?? 0;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-4 w-4" /> Reserve controls
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Treasury & conversion</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Manage the backing pool and inspect gem-to-$POOL conversions before they settle.</p>
        </div>
        <Button type="button" variant="outline" className="w-fit gap-2" onClick={() => void refetch()} data-testid="button-refresh-treasury">
          <RefreshCw className="h-4 w-4" /> Refresh reserve
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-[1.35fr_1fr_1fr]">
        <Card className="ledger-grid overflow-hidden border-primary/30 bg-card">
          <CardContent className="relative p-6">
            <div className="absolute right-5 top-5 rounded-full border border-primary/20 bg-primary/10 p-2.5 text-primary"><CircleDollarSign className="h-5 w-5" /></div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Available backing</p>
            <p className="number-display mt-5 text-4xl font-medium text-primary" data-testid="text-treasury-backing">
              {treasuryLoading ? "—" : treasuryError ? "Unavailable" : `$${backing.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{treasury?.updatedAt ? `Last adjusted ${format(new Date(treasury.updatedAt), "MMM d, yyyy · HH:mm")}` : "Reserve status is loading"}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Conversion unit</p>
            <p className="number-display mt-5 text-3xl font-medium text-foreground">500 normal gems</p>
            <p className="mt-2 text-sm text-muted-foreground">1 $POOL token</p>
            <Badge variant="outline" className="mt-4 border-primary/30 bg-primary/5 text-primary">Backing checked at settlement</Badge>
          </CardContent>
        </Card>
        <Card className="rare-sheen border-[hsl(40_83%_64%/0.24)] bg-card">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rare gem lane</p>
            <p className="number-display mt-5 text-3xl font-medium text-[hsl(40_83%_64%)]">100 rare gems</p>
            <p className="mt-2 text-sm text-muted-foreground">1 $POOL token at the premium rate.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary" /> Adjust backing</CardTitle>
            <CardDescription>Record an internal reserve movement. Decreases cannot exceed the available balance.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitBacking} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="backing-operation" className="text-sm font-medium">Operation</label>
                <Select value={operation} onValueChange={(value) => setOperation(value as TreasuryAdjustmentInputOperation)}>
                  <SelectTrigger id="backing-operation" data-testid="select-treasury-operation"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase backing</SelectItem>
                    <SelectItem value="decrease">Decrease backing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="backing-amount" className="text-sm font-medium">Amount in USD</label>
                <Input id="backing-amount" data-testid="input-treasury-amount" type="number" min="0.01" step="0.01" value={backingAmount} onChange={(event) => setBackingAmount(event.target.value)} placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="backing-reason" className="text-sm font-medium">Reason <span className="font-normal text-muted-foreground">(optional)</span></label>
                <Input id="backing-reason" data-testid="input-treasury-reason" value={backingReason} onChange={(event) => setBackingReason(event.target.value)} placeholder="Liquidity top-up" />
              </div>
              <Button type="submit" data-testid="button-submit-treasury" className="w-full gap-2" disabled={adjustTreasury.isPending || !backingAmount}>
                {adjustTreasury.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : operation === "increase" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
                {operation === "increase" ? "Increase backing" : "Decrease backing"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[hsl(40_83%_64%)]" /> Conversion rules</CardTitle>
            <CardDescription>The API checks the selected user balance and treasury backing atomically before recording a conversion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Normal gems</span><span className="number-display font-medium text-primary">500 → 1 $POOL</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-[hsl(40_83%_64%/0.2)] bg-[hsl(40_83%_64%/0.05)] px-4 py-3 text-sm">
              <span className="text-muted-foreground">Rare gems</span><span className="number-display font-medium text-[hsl(40_83%_64%)]">100 → 1 $POOL</span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Conversions are made through the API-key-protected <span className="font-mono text-foreground">POST /convert</span> endpoint. This console does not mint on-chain tokens.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}