import { useListWallets } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";

export default function WalletsPage() {
  const { data: wallets, isLoading } = useListWallets();

  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallets</h1>
         <p className="text-muted-foreground mt-1">Rich list of normal and rare gem balances, ranked by combined circulation.</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>All Wallets</CardTitle>
          <CardDescription>Sorted by gem balance descending.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>User</TableHead>
                 <TableHead className="text-right">Normal gems</TableHead>
                 <TableHead className="text-right">Rare gems</TableHead>
                 <TableHead className="text-right">Combined</TableHead>
                <TableHead className="text-right">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading wallet balances…</TableCell>
                </TableRow>
              ) : wallets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No wallets found.</TableCell>
                </TableRow>
              ) : wallets?.map((wallet, idx) => (
                <TableRow key={wallet.userId} className="border-border group">
                  <TableCell className="font-mono text-muted-foreground">#{idx + 1}</TableCell>
                  <TableCell>
                    <Link href={`/users/${wallet.userId}`} className="font-medium hover:text-primary transition-colors flex items-center">
                      {wallet.username}
                      <span className="text-xs font-mono text-muted-foreground ml-2">({wallet.userId.slice(0,8)}...)</span>
                    </Link>
                  </TableCell>
                   <TableCell className="text-right font-mono font-medium text-primary">{wallet.normalGems.toLocaleString()}</TableCell>
                   <TableCell className="text-right font-mono font-medium text-[hsl(40_83%_64%)]">{wallet.rareGems.toLocaleString()}</TableCell>
                   <TableCell className="text-right"><Badge variant="outline" className="number-display border-border text-foreground">{(wallet.normalGems + wallet.rareGems).toLocaleString()}</Badge></TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {format(new Date(wallet.updatedAt), "MMM d, HH:mm")}
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
