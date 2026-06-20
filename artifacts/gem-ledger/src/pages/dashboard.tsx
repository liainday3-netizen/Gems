import { useGetTransactionSummary, useListTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetTransactionSummary();
  const { data: recentTransactions, isLoading: isLoadingTransactions } = useListTransactions({ limit: 10 });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoadingSummary ? "..." : summary?.totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gems in Circulation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{isLoadingSummary ? "..." : summary?.totalGemsInCirculation.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoadingSummary ? "..." : summary?.totalTransactions.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border col-span-1">
          <CardHeader>
            <CardTitle>Transactions by App</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>App Source</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right text-emerald-500">Credited</TableHead>
                  <TableHead className="text-right text-destructive">Debited</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSummary ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : summary?.transactionsByApp.map((stat) => (
                  <TableRow key={stat.appSource} className="border-border">
                    <TableCell className="font-mono text-sm">{stat.appSource}</TableCell>
                    <TableCell className="text-right">{stat.transactionCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-500">{stat.totalCredited.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-destructive">{stat.totalDebited.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card border-border col-span-1">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>App</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTransactions ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : recentTransactions?.map((tx) => (
                  <TableRow key={tx.id} className="border-border">
                    <TableCell className="font-medium">{tx.username}</TableCell>
                    <TableCell className="font-mono text-xs">{tx.appSource}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tx.type === 'credit' ? 'border-emerald-500 text-emerald-500' : 'border-destructive text-destructive'}>
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono ${tx.type === 'credit' ? 'text-emerald-500' : 'text-destructive'}`}>
                      {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {format(new Date(tx.createdAt), 'MMM d, HH:mm')}
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
