import { useState } from "react";
import { 
  useListApiKeys, 
  useCreateApiKey, 
  useUpdateApiKey, 
  useDeleteApiKey, 
  getListApiKeysQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Key, Plus, Trash2, Copy, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApiKeysPage() {
  const [newAppName, setNewAppName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: apiKeys, isLoading } = useListApiKeys();
  
  const createKey = useCreateApiKey({
    mutation: {
      onSuccess: (data: any) => {
        setNewAppName("");
        setCreatedKey(data.key);
        queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
      },
      onError: (err) => toast({ title: "Failed to create key", description: String(err), variant: "destructive" })
    }
  });

  const updateKey = useUpdateApiKey({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
      },
      onError: (err) => toast({ title: "Failed to update key", description: String(err), variant: "destructive" })
    }
  });

  const deleteKey = useDeleteApiKey({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
        toast({ title: "Key deleted" });
      },
      onError: (err) => toast({ title: "Failed to delete key", description: String(err), variant: "destructive" })
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    createKey.mutate({ data: { appName: newAppName.trim() } });
  };

  const handleCopy = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground mt-1">Manage credentials for external applications.</p>
        </div>
      </div>

      <Card className="bg-card border-border max-w-xl">
        <CardHeader>
          <CardTitle>Create New Key</CardTitle>
          <CardDescription>Keys are shown only once upon creation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input 
              placeholder="Application Name (e.g., game-server-1)" 
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              className="bg-background border-border font-mono text-sm"
            />
            <Button type="submit" disabled={createKey.isPending || !newAppName.trim()}>
              {createKey.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Application Name</TableHead>
                <TableHead>Key Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : apiKeys?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No API keys found.</TableCell>
                </TableRow>
              ) : apiKeys?.map((apiKey) => (
                <TableRow key={apiKey.key} className={`border-border ${!apiKey.active ? 'opacity-50' : ''}`}>
                  <TableCell className="font-medium font-mono text-sm">
                    {apiKey.appName}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {apiKey.key.slice(0, 12)}...
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(apiKey.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Switch 
                      checked={apiKey.active}
                      onCheckedChange={(checked) => updateKey.mutate({ key: apiKey.key, data: { active: checked } })}
                      disabled={updateKey.isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete the key for ${apiKey.appName}?`)) {
                          deleteKey.mutate({ key: apiKey.key });
                        }
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!createdKey} onOpenChange={(open) => !open && setCreatedKey(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Store your new API key</DialogTitle>
            <DialogDescription>
              This is the only time this key will be shown. Please copy it and store it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4 mb-4">
            <div className="grid flex-1 gap-2">
              <Input
                id="key"
                value={createdKey || ""}
                readOnly
                className="font-mono text-primary bg-background border-border text-sm"
              />
            </div>
            <Button type="button" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setCreatedKey(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
