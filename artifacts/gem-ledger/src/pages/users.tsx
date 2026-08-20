import { useState } from "react";
import { Link } from "wouter";
import { useListUsers, useCreateUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Search, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [newUsername, setNewUsername] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading } = useListUsers();
  
  const createUser = useCreateUser({
    mutation: {
      onSuccess: () => {
        setNewUsername("");
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User created successfully" });
      },
      onError: (error) => {
        toast({ title: "Failed to create user", description: String(error), variant: "destructive" });
      }
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    createUser.mutate({ data: { username: newUsername.trim() } });
  };

  const filteredUsers = users?.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input 
            placeholder="New username" 
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="w-48 bg-card"
          />
          <Button type="submit" disabled={createUser.isPending || !newUsername.trim()}>
            {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Create
          </Button>
        </form>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="py-4">
          <div className="flex items-center">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <Input
              placeholder="Search by username or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm bg-background border-border"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Username</TableHead>
                 <TableHead className="text-right">Normal</TableHead>
                 <TableHead className="text-right">Rare</TableHead>
                 <TableHead className="text-right">Combined</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                   <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading user balances…</TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                </TableRow>
              ) : filteredUsers?.map((user) => (
                <TableRow key={user.id} className="border-border group">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <Link href={`/users/${user.id}`} className="hover:text-primary transition-colors">
                      {user.id.slice(0, 8)}...
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/users/${user.id}`} className="font-medium hover:text-primary transition-colors">
                      {user.username}
                    </Link>
                  </TableCell>
                   <TableCell className="text-right font-mono font-medium text-primary">{user.normalGems.toLocaleString()}</TableCell>
                   <TableCell className="text-right font-mono font-medium text-[hsl(40_83%_64%)]">{user.rareGems.toLocaleString()}</TableCell>
                   <TableCell className="text-right font-mono font-semibold text-foreground">{(user.normalGems + user.rareGems).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
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
