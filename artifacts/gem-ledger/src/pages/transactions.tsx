import { useState } from "react";
import { useListTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "wouter";
import { Filter, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function TransactionsPage() {
  const [appSource, setAppSource] = useState("");
  const [userId, setUserId] = useState("");

  const { data: transactions, isLoading } = useListTransactions({
    appSource: appSource || undefined,
    userId: userId || undefined
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Ledger</h1>
          <p className="text-muted-foreground mt-1">Immutable log of all gem movements across all apps.</p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="py-4 border-b border-border">
          <div className="flex gap-4">
            <div className="flex-1 max-w-sm flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by App Source..."
                value={appSource}
                onChange={(e) => setAppSource(e.target.value)}
                className="bg-background border-border font-mono text-sm"
              />
            </div>
            <div className="flex-1 max-w-sm flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by User ID..."
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="bg-background border-border font-mono text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>App Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : transactions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions match filters.</TableCell>
                </TableRow>
              ) : transactions?.map((tx) => (
                <TableRow key={tx.id} className="border-border">
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <Link href={`/users/${tx.userId}`} className="font-medium hover:text-primary transition-colors">
                      {tx.username}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {tx.appSource}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`border-transparent ${tx.type === 'credit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                      {tx.type === 'credit' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                      {tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" title={tx.reason || ""}>
                    {tx.reason || "-"}
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${tx.type === 'credit' ? 'text-emerald-500' : 'text-destructive'}`}>
                    {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
