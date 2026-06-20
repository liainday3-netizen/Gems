import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Webhook, Plus, Trash2, Check, Copy, ShieldCheck, AlertTriangle, Power, PowerOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface WebhookEndpoint {
  id: string;
  url: string;
  active: boolean;
  createdAt: string;
}

interface CreatedWebhook extends WebhookEndpoint {
  secret: string;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      {label && <span>{copied ? "Copied!" : label}</span>}
    </button>
  );
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [secretDialog, setSecretDialog] = useState<CreatedWebhook | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<WebhookEndpoint | null>(null);

  const { data: endpoints = [], isLoading } = useQuery<WebhookEndpoint[]>({
    queryKey: ["webhooks"],
    queryFn: () => apiFetch("/webhooks"),
  });

  const createMutation = useMutation({
    mutationFn: (url: string) =>
      apiFetch("/webhooks", { method: "POST", body: JSON.stringify({ url }) }),
    onSuccess: (created: CreatedWebhook) => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setCreateOpen(false);
      setUrlInput("");
      setSecretCopied(false);
      setSecretDialog(created);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create webhook", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/webhooks/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
    onError: (err: Error) => {
      toast({ title: "Failed to update webhook", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/webhooks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setDeleteConfirm(null);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete webhook", description: err.message, variant: "destructive" });
    },
  });

  const handleCreate = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setSecretCopied(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Webhook className="h-7 w-7 text-primary" />
            Webhooks
          </h1>
          <p className="text-muted-foreground mt-1">
            Register HTTP endpoints to receive signed event notifications whenever a transaction occurs.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Endpoint
        </Button>
      </div>

      {/* How it works */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            How signed webhooks work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Every webhook POST includes two headers your server must verify before trusting the payload:
          </p>
          <div className="rounded-md border border-border/50 divide-y divide-border/50">
            {[
              {
                header: "X-Gem-Signature",
                value: "sha256=<hex>",
                desc: "HMAC-SHA256 of the string timestamp.body signed with your endpoint's secret. Proves the payload wasn't tampered with in transit.",
              },
              {
                header: "X-Gem-Timestamp",
                value: "<unix seconds>",
                desc: "When the event was sent. Reject events where abs(now − timestamp) > 300 s (5 min) to prevent replay attacks.",
              },
              {
                header: "X-Gem-Event",
                value: "transaction.earn",
                desc: "The event type — one of: transaction.earn, transaction.spend, transaction.transfer, transaction.credit, transaction.debit.",
              },
            ].map((h) => (
              <div key={h.header} className="flex items-start gap-3 p-3">
                <div className="flex-shrink-0 min-w-[180px]">
                  <code className="text-xs font-mono text-primary">{h.header}</code>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{h.value}</div>
                </div>
                <div className="text-xs">{h.desc}</div>
              </div>
            ))}
          </div>
          <p className="text-xs">
            The secret is unique per endpoint and shown exactly once at creation. Your receiving server stores it
            and uses it to recompute the signature on every incoming request.
          </p>
        </CardContent>
      </Card>

      {/* Verification code */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Signature verification — copy into your server</CardTitle>
          <CardDescription className="text-xs">Reject the request if verification fails — never process an unverified payload.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative group">
            <pre className="bg-background border border-border rounded-md p-4 overflow-x-auto text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre">
{`// Node.js — place this before your business logic
import { createHmac, timingSafeEqual } from "crypto";

function verifyGemWebhook(req, secret) {
  const signature = req.headers["x-gem-signature"]; // "sha256=abc123..."
  const timestamp  = req.headers["x-gem-timestamp"]; // unix seconds string

  if (!signature || !timestamp) return false;

  // Reject stale events (replay protection)
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false;

  // Recompute the expected signature
  const body     = JSON.stringify(req.body); // requires express.json() middleware
  const expected = "sha256=" + createHmac("sha256", secret)
    .update(\`\${timestamp}.\${body}\`)
    .digest("hex");

  // timingSafeEqual prevents timing attacks
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// In your route handler:
app.post("/gems/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const rawBody = req.body.toString();
  const timestamp = req.headers["x-gem-timestamp"];
  const signature = req.headers["x-gem-signature"];

  const expected = "sha256=" + createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(\`\${timestamp}.\${rawBody}\`)
    .digest("hex");

  const a = Buffer.from(signature ?? "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(rawBody);
  // event.event  → "transaction.earn"
  // event.data   → { transactionId, userId, username, amount, balanceAfter, ... }
  console.log("Verified webhook:", event.event, event.data.username, event.data.amount);
  res.status(200).end();
});`}
            </pre>
            <div className="absolute top-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton text={`import { createHmac, timingSafeEqual } from "crypto";\n\nfunction verifyGemWebhook(req, secret) {\n  const signature = req.headers["x-gem-signature"];\n  const timestamp  = req.headers["x-gem-timestamp"];\n  if (!signature || !timestamp) return false;\n  const age = Math.abs(Date.now() / 1000 - Number(timestamp));\n  if (age > 300) return false;\n  const body     = JSON.stringify(req.body);\n  const expected = "sha256=" + createHmac("sha256", secret)\n    .update(\`\${timestamp}.\${body}\`)\n    .digest("hex");\n  const a = Buffer.from(signature);\n  const b = Buffer.from(expected);\n  return a.length === b.length && timingSafeEqual(a, b);\n}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoint list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Registered endpoints ({endpoints.length})
        </h2>

        {isLoading && (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        )}

        {!isLoading && endpoints.length === 0 && (
          <Card className="bg-card border-border border-dashed">
            <CardContent className="py-12 text-center">
              <Webhook className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No webhook endpoints yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Add Endpoint" to register your first one.</p>
            </CardContent>
          </Card>
        )}

        {endpoints.map((ep) => (
          <Card key={ep.id} className={`bg-card border-border transition-opacity ${ep.active ? "" : "opacity-60"}`}>
            <CardContent className="py-4 flex items-center gap-4">
              <div className={`flex-shrink-0 w-2 h-2 rounded-full ${ep.active ? "bg-emerald-400" : "bg-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm text-foreground truncate">{ep.url}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Added {new Date(ep.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  {" · "}
                  <span className={ep.active ? "text-emerald-400" : "text-muted-foreground"}>
                    {ep.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => toggleMutation.mutate({ id: ep.id, active: !ep.active })}
                  disabled={toggleMutation.isPending}
                >
                  {ep.active
                    ? <><PowerOff className="h-3.5 w-3.5" /> Deactivate</>
                    : <><Power className="h-3.5 w-3.5" /> Activate</>}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteConfirm(ep)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add webhook endpoint</DialogTitle>
            <DialogDescription>
              Enter the HTTPS URL on your server that will receive event POSTs.
              A signing secret will be generated — copy it immediately, it won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://my-game-server.com/gems/webhook"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !urlInput.trim()}
            >
              {createMutation.isPending ? "Creating…" : "Create Endpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secret reveal dialog */}
      <Dialog
        open={!!secretDialog}
        onOpenChange={(open) => {
          if (!open) setSecretDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Webhook endpoint created
            </DialogTitle>
            <DialogDescription>
              Copy the signing secret now. It will never be shown again — if you lose it, delete this endpoint and create a new one.
            </DialogDescription>
          </DialogHeader>

          {secretDialog && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
                <div className="font-mono text-sm text-foreground bg-secondary rounded px-3 py-2 break-all">
                  {secretDialog.url}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Signing Secret</Label>
                <div className="relative">
                  <div className="font-mono text-sm bg-secondary rounded px-3 py-2 pr-24 break-all text-foreground">
                    {secretDialog.secret}
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <button
                      onClick={() => handleCopySecret(secretDialog.secret)}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        secretCopied ? "text-emerald-400" : "text-primary hover:text-primary/80"
                      }`}
                    >
                      {secretCopied
                        ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                        : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-md border border-amber-700/40 bg-amber-900/10 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80">
                  Store this in your secrets manager or <code className="font-mono">.env</code> as{" "}
                  <code className="font-mono">WEBHOOK_SECRET</code>.
                  Never commit it to source control.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setSecretDialog(null)} disabled={!secretCopied} variant={secretCopied ? "default" : "outline"}>
              {secretCopied ? "Done" : "Copy the secret first"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete webhook endpoint?</DialogTitle>
            <DialogDescription>
              This is permanent. The endpoint will stop receiving events immediately and the signing secret will be destroyed.
              You cannot undo this.
            </DialogDescription>
          </DialogHeader>
          {deleteConfirm && (
            <div className="py-2">
              <div className="font-mono text-sm text-foreground bg-secondary rounded px-3 py-2 break-all">
                {deleteConfirm.url}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Endpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
