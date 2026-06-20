import { useState } from "react";
import { useRoute } from "wouter";
import { 
  useGetUser, 
  useListTransactions, 
  useCreateTransaction, 
  getGetUserQueryKey, 
  getListTransactionsQueryKey,
  TransactionInputType
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ArrowLeft, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function UserDetailPage() {
  const [, params] = useRoute("/users/:userId");
  const userId = params?.userId || "";
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading: isLoadingUser } = useGetUser(userId, {
    query: { enabled: !!userId, queryKey: getGetUserQueryKey(userId) }
  });

  const { data: transactions, isLoading: isLoadingTx } = useListTransactions(
    { userId },
    { query: { enabled: !!userId, queryKey: getListTransactionsQueryKey({ userId }) } }
  );

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionInputType>("credit");
  const [appSource, setAppSource] = useState("admin_dashboard");
  const [reason, setReason] = useState("");

  const createTransaction = useCreateTransaction({
    mutation: {
      onSuccess: () => {
        setAmount("");
        setReason("");
        queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
        queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey({ userId }) });
        toast({ title: "Transaction successful" });
      },
      onError: (error) => {
        toast({ title: "Transaction failed", description: String(error), variant: "destructive" });
      }
    }
  });

  const handleTransact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    
    createTransaction.mutate({
      data: {
        userId,
        appSource,
        type,
        amount: Number(amount),
        reason: reason || undefined
      }
    });
  };

  if (isLoadingUser) return <div className="p-8 text-center">Loading user details...</div>;
  if (!user) return <div className="p-8 text-center text-destructive">User not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/users" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to users
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{user.username}</h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">ID: {user.id}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Gem Balance</p>
            <p className="text-4xl font-bold text-primary font-mono">{user.gemBalance.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-border col-span-1 lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Manual Transaction</CardTitle>
            <CardDescription>Issue or revoke gems manually.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTransact} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={type} onValueChange={(val) => setType(val as TransactionInputType)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (+)</SelectItem>
                    <SelectItem value="debit">Debit (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <Input 
                  type="number" 
                  min="1" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="0"
                  className="bg-background border-border font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">App Source</label>
                <Input 
                  value={appSource} 
                  onChange={(e) => setAppSource(e.target.value)} 
                  className="bg-background border-border font-mono text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (Optional)</label>
                <Input 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="e.g. Refund, Bonus"
                  className="bg-background border-border"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createTransaction.isPending || !amount}>
                {createTransaction.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Execute Transaction
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-card border-border col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>App Source</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTx ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : transactions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions found.</TableCell>
                  </TableRow>
                ) : transactions?.map((tx) => (
                  <TableRow key={tx.id} className="border-border">
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(tx.createdAt), "MMM d, HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`border-transparent ${tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                        {tx.type === 'credit' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{tx.appSource}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{tx.reason || "-"}</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${tx.type === 'credit' ? 'text-emerald-500' : 'text-destructive'}`}>
                      {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-primary">
                      {tx.balanceAfter.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
