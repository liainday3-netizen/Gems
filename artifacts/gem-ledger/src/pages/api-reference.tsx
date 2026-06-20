import { useState } from "react";
import { Copy, Check, ShieldAlert, BookOpen, Terminal, Gauge, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function MethodBadge({ method }: { method: "GET" | "POST" | "PATCH" | "DELETE" }) {
  const colors: Record<string, string> = {
    GET:    "bg-sky-900/40 text-sky-300 border-sky-700/50",
    POST:   "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
    PATCH:  "bg-amber-900/40 text-amber-300 border-amber-700/50",
    DELETE: "bg-red-900/40 text-red-300 border-red-700/50",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold border ${colors[method]}`}>
      {method}
    </span>
  );
}

function RateLimitBadge({ limit, window: win }: { limit: number; window: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border bg-violet-900/30 text-violet-300 border-violet-700/40">
      <Gauge className="h-3 w-3" />
      {limit} / {win}
    </span>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative group">
      <pre className="bg-background border border-border rounded-md p-4 overflow-x-auto text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre">
        {code}
      </pre>
      <div className="absolute top-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function Field({
  name, type, required, description,
}: {
  name: string; type: string; required?: boolean; description: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <div className="min-w-[140px] font-mono text-xs text-foreground flex items-center gap-1.5 flex-shrink-0">
        {name}
        {required && <span className="text-red-400 text-[10px] font-sans">required</span>}
      </div>
      <div className="text-xs font-mono text-primary/80 min-w-[80px] flex-shrink-0">{type}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}

function EndpointCard({
  method, path, summary, description, auth, rateLimit,
  queryParams, bodyFields, responseFields, curl,
}: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  description?: string;
  auth?: boolean;
  rateLimit?: { limit: number; window: string };
  queryParams?: { name: string; type: string; required?: boolean; description: string }[];
  bodyFields?:  { name: string; type: string; required?: boolean; description: string }[];
  responseFields?: { name: string; type: string; required?: boolean; description: string }[];
  curl: string;
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <MethodBadge method={method} />
          <code className="text-sm font-mono text-foreground">{path}</code>
          <div className="ml-auto flex items-center gap-2">
            {rateLimit && <RateLimitBadge limit={rateLimit.limit} window={rateLimit.window} />}
            {auth && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/80 font-medium">
                <ShieldAlert className="h-3 w-3" />
                x-api-key
              </span>
            )}
          </div>
        </div>
        <CardTitle className="text-base mt-2">{summary}</CardTitle>
        {description && <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {queryParams && queryParams.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Query Parameters</div>
            <div className="rounded-md border border-border/50 px-3">
              {queryParams.map((f) => <Field key={f.name} {...f} />)}
            </div>
          </div>
        )}
        {bodyFields && bodyFields.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Request Body — <span className="font-mono normal-case font-normal">application/json</span>
            </div>
            <div className="rounded-md border border-border/50 px-3">
              {bodyFields.map((f) => <Field key={f.name} {...f} />)}
            </div>
          </div>
        )}
        {responseFields && responseFields.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Response Fields</div>
            <div className="rounded-md border border-border/50 px-3">
              {responseFields.map((f) => <Field key={f.name} {...f} />)}
            </div>
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Example</div>
          </div>
          <CodeBlock code={curl} />
        </div>
      </CardContent>
    </Card>
  );
}

const BASE = "/api";
const KEY = "glk_your_key_here";

export default function ApiReferencePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          API Reference
        </h1>
        <p className="text-muted-foreground mt-1">
          All endpoints expect and return{" "}
          <code className="text-xs bg-secondary px-1 py-0.5 rounded">application/json</code>.{" "}
          Base path: <code className="text-xs bg-secondary px-1 py-0.5 rounded">{BASE}</code>
        </p>
      </div>

      {/* Security callout */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-700/40 bg-amber-900/10 p-4">
        <ShieldAlert className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-300">Keep API keys secret</p>
          <ul className="text-xs text-amber-300/80 space-y-0.5 list-disc list-inside">
            <li>Send keys in the <code className="font-mono">x-api-key</code> header only — never in URLs or query strings.</li>
            <li>Store keys in environment variables or a secrets manager, not in source code.</li>
            <li>Never include keys in client-side (browser) code — make ledger calls from your server.</li>
            <li>Rotate compromised keys immediately from the <a href="/api-keys" className="underline hover:text-amber-200">API Keys</a> page and deactivate the old one.</li>
          </ul>
        </div>
      </div>

      {/* Auth */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Consumer endpoints require a valid, active API key in the{" "}
            <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">x-api-key</code> header.
            The key identifies which app is making the call — it is recorded as{" "}
            <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">appSource</code> on every transaction.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-border/50 p-3 space-y-1">
              <div className="font-mono text-xs text-amber-300">401 Unauthorized</div>
              <div className="text-xs text-muted-foreground">Header missing entirely.</div>
            </div>
            <div className="rounded-md border border-border/50 p-3 space-y-1">
              <div className="font-mono text-xs text-red-300">403 Forbidden</div>
              <div className="text-xs text-muted-foreground">Key is unrecognized or deactivated.</div>
            </div>
          </div>
          <CodeBlock code={`# Key goes in the header, not in the URL\ncurl -H "x-api-key: ${KEY}" "https://your-domain.com/api/balance?username=alice"`} />
        </CardContent>
      </Card>

      {/* Rate limiting — fresh-dev explainer */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-violet-400" />
            Rate Limiting
          </CardTitle>
          <CardDescription className="text-xs">
            What rate limiting is, how to read the response headers, and how to handle it in your code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Plain-english explainer */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">What is rate limiting?</span>{" "}
              It's a safety valve. The ledger enforces a maximum number of requests per API key per minute.
              If your app sends requests faster than the limit allows, the server stops processing them and
              returns a <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">429 Too Many Requests</code> response
              until the window resets. This protects the ledger from accidental floods and keeps it fair for all connected apps.
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">Each API key has its own counter.</span>{" "}
              If your quest server and your shop server both have their own keys, they don't share a limit —
              one app going fast can't affect another.
            </p>
          </div>

          {/* Limit table */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Limits by endpoint</div>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Endpoint</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Limit</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Window</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Why</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { endpoint: "GET /balance",   limit: "300 req", window: "1 min", why: "Read-only — checking a balance is cheap." },
                    { endpoint: "POST /earn",     limit: "60 req",  window: "1 min", why: "Writes a transaction row on every call." },
                    { endpoint: "POST /spend",    limit: "60 req",  window: "1 min", why: "Writes a transaction row on every call." },
                    { endpoint: "POST /transfer", limit: "60 req",  window: "1 min", why: "Writes two transaction rows per call." },
                  ].map((row) => (
                    <tr key={row.endpoint} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3 font-mono text-foreground">{row.endpoint}</td>
                      <td className="p-3">
                        <span className="font-mono font-semibold text-violet-300">{row.limit}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">{row.window}</td>
                      <td className="p-3 text-muted-foreground">{row.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Response headers */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Response headers — every request returns these
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              You don't need to wait for a 429 to know your quota. Every response includes headers telling
              you exactly how many requests you have left and when the counter resets. Read them proactively
              to avoid hitting the limit in the first place.
            </p>
            <div className="rounded-md border border-border/50 divide-y divide-border/50">
              {[
                {
                  header: "RateLimit-Limit",
                  example: "60",
                  desc: "The total number of requests allowed in one window for this endpoint.",
                },
                {
                  header: "RateLimit-Remaining",
                  example: "47",
                  desc: "How many requests you have left before the next 429. When this hits 0, the next request is rejected.",
                },
                {
                  header: "RateLimit-Reset",
                  example: "1750462800",
                  desc: "Unix timestamp (seconds) when your counter resets back to the full limit.",
                },
                {
                  header: "Retry-After",
                  example: "23",
                  desc: "Only present on 429 responses. Number of seconds to wait before retrying. Always respect this value.",
                },
              ].map((h) => (
                <div key={h.header} className="flex items-start gap-3 p-3">
                  <div className="flex-shrink-0 min-w-[200px]">
                    <code className="text-xs font-mono text-primary">{h.header}</code>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">e.g. {h.example}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{h.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* How to read them */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Reading the headers with curl
              </div>
            </div>
            <CodeBlock code={`# -i prints response headers before the body
curl -i -X POST "https://your-domain.com/api/earn" \\
  -H "x-api-key: ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"alice","amount":100}'

# Example response headers:
# HTTP/1.1 200 OK
# RateLimit-Limit: 60
# RateLimit-Remaining: 59
# RateLimit-Reset: 1750462800`} />
          </div>

          {/* 429 body */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              What a 429 response looks like
            </div>
            <CodeBlock code={`HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 60
RateLimit-Remaining: 0
RateLimit-Reset: 1750462823
Retry-After: 23

{
  "error": "Rate limit exceeded",
  "message": "Too many requests from this API key. Slow down and retry after the window resets."
}`} />
          </div>

          {/* How to handle it — JS and Python */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                How to handle rate limits in your code
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The safest pattern is <span className="text-foreground font-medium">exponential backoff with jitter</span> —
              when you get a 429, wait the number of seconds in <code className="font-mono bg-secondary px-1 py-0.5 rounded">Retry-After</code>,
              then retry. If you get another 429, double the wait time and add a small random delay so multiple
              instances of your app don't all retry at exactly the same moment.
            </p>

            <Tabs defaultValue="js">
              <TabsList className="bg-secondary h-8">
                <TabsTrigger value="js" className="text-xs">JavaScript / Node</TabsTrigger>
                <TabsTrigger value="python" className="text-xs">Python</TabsTrigger>
              </TabsList>

              <TabsContent value="js" className="mt-2">
                <CodeBlock code={`async function earnGems(username, amount, reason, retries = 3) {
  const res = await fetch("https://your-domain.com/api/earn", {
    method: "POST",
    headers: {
      "x-api-key": process.env.GEM_LEDGER_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, amount, reason }),
  });

  if (res.status === 429 && retries > 0) {
    // Read how long to wait from the Retry-After header
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
    // Add a small random jitter (0–1 s) so parallel calls don't all fire at once
    const jitter = Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000 + jitter));
    return earnGems(username, amount, reason, retries - 1);
  }

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error ?? \`HTTP \${res.status}\`);
  }

  return res.json();
}`} />
              </TabsContent>

              <TabsContent value="python" className="mt-2">
                <CodeBlock code={`import os, time, random, requests

def earn_gems(username, amount, reason, retries=3):
    res = requests.post(
        "https://your-domain.com/api/earn",
        headers={
            "x-api-key": os.environ["GEM_LEDGER_KEY"],
            "Content-Type": "application/json",
        },
        json={"username": username, "amount": amount, "reason": reason},
    )

    if res.status_code == 429 and retries > 0:
        # Read how long to wait from the Retry-After header
        retry_after = int(res.headers.get("Retry-After", 5))
        # Add a small random jitter (0–1 s) so parallel calls don't all fire at once
        jitter = random.random()
        time.sleep(retry_after + jitter)
        return earn_gems(username, amount, reason, retries - 1)

    res.raise_for_status()
    return res.json()`} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Tips */}
          <div className="rounded-md border border-violet-700/30 bg-violet-900/10 p-4 space-y-2">
            <p className="text-xs font-semibold text-violet-300">Tips for staying under the limit</p>
            <ul className="text-xs text-violet-300/80 space-y-1 list-disc list-inside">
              <li>
                <span className="font-medium">Batch when you can.</span> If a player completes three quests at once,
                send one <code className="font-mono">/earn</code> call with the combined total rather than three separate calls.
              </li>
              <li>
                <span className="font-medium">Cache balances client-side.</span> Don't call <code className="font-mono">/balance</code> on
                every page render — store the result and refresh it after an earn or spend, or on a short timer.
              </li>
              <li>
                <span className="font-medium">Watch <code className="font-mono">RateLimit-Remaining</code>.</span> If it drops
                below 10, slow your request rate proactively before hitting the wall.
              </li>
              <li>
                <span className="font-medium">Use separate keys per service.</span> A quest server and a shop server
                each get their own key so one busy service doesn't eat another's quota.
              </li>
            </ul>
          </div>

        </CardContent>
      </Card>

      <Tabs defaultValue="consumer">
        <TabsList className="bg-secondary">
          <TabsTrigger value="consumer">Consumer API</TabsTrigger>
          <TabsTrigger value="admin">Admin API</TabsTrigger>
        </TabsList>

        {/* ── CONSUMER API ── */}
        <TabsContent value="consumer" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            These are the endpoints your apps call at runtime. All require{" "}
            <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">x-api-key</code>.
            Usernames are auto-created on first use — no pre-registration step needed.
            Rate limits are shown on each endpoint (<Gauge className="h-3 w-3 inline text-violet-400 mx-0.5" />).
          </p>

          <EndpointCard
            method="GET"
            path={`${BASE}/balance`}
            summary="Get balance"
            description="Returns the gem balance for a username. If the username doesn't exist yet, an account and wallet are created automatically."
            auth
            rateLimit={{ limit: 300, window: "min" }}
            queryParams={[
              { name: "username", type: "string", required: true, description: "The player's username." },
            ]}
            responseFields={[
              { name: "username",   type: "string",  description: "Echoed username." },
              { name: "userId",     type: "string",  description: "Internal user ID (UUID)." },
              { name: "gemBalance", type: "integer", description: "Current gem balance." },
            ]}
            curl={`curl "https://your-domain.com/api/balance?username=alice" \\
  -H "x-api-key: ${KEY}"`}
          />

          <EndpointCard
            method="POST"
            path={`${BASE}/earn`}
            summary="Earn gems"
            description="Credits gems to a user. The calling app is recorded as the appSource on the transaction. Creates the user automatically if they don't exist."
            auth
            rateLimit={{ limit: 60, window: "min" }}
            bodyFields={[
              { name: "username", type: "string",  required: true, description: "Target player's username." },
              { name: "amount",   type: "integer", required: true, description: "Number of gems to award. Must be ≥ 1." },
              { name: "reason",   type: "string",                  description: "Human-readable reason for the credit (e.g. 'Quest: Dragon Slayer')." },
            ]}
            responseFields={[
              { name: "username",   type: "string",  description: "Player username." },
              { name: "userId",     type: "string",  description: "Internal user ID." },
              { name: "gemBalance", type: "integer", description: "New balance after the credit." },
            ]}
            curl={`curl -X POST "https://your-domain.com/api/earn" \\
  -H "x-api-key: ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"alice","amount":500,"reason":"Quest: Dragon Slayer"}'`}
          />

          <EndpointCard
            method="POST"
            path={`${BASE}/spend`}
            summary="Spend gems"
            description="Debits gems from a user. Returns 400 with the current balance if the user doesn't have enough — check the balance first in your UI so players can't attempt to overspend."
            auth
            rateLimit={{ limit: 60, window: "min" }}
            bodyFields={[
              { name: "username", type: "string",  required: true, description: "Target player's username." },
              { name: "amount",   type: "integer", required: true, description: "Number of gems to deduct. Must be ≥ 1." },
              { name: "reason",   type: "string",                  description: "Human-readable reason for the debit." },
            ]}
            responseFields={[
              { name: "username",   type: "string",  description: "Player username." },
              { name: "userId",     type: "string",  description: "Internal user ID." },
              { name: "gemBalance", type: "integer", description: "New balance after the debit." },
            ]}
            curl={`curl -X POST "https://your-domain.com/api/spend" \\
  -H "x-api-key: ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"alice","amount":100,"reason":"Bought: Crystal Wand"}'`}
          />

          <EndpointCard
            method="POST"
            path={`${BASE}/transfer`}
            summary="Transfer gems"
            description="Atomically moves gems from one user to another. Both the debit and the credit are written together — either both succeed or neither does, so you never end up with gems lost in transit. Returns 400 for insufficient balance or self-transfer."
            auth
            rateLimit={{ limit: 60, window: "min" }}
            bodyFields={[
              { name: "fromUsername", type: "string",  required: true, description: "Username of the sender." },
              { name: "toUsername",   type: "string",  required: true, description: "Username of the recipient. Must differ from fromUsername." },
              { name: "amount",       type: "integer", required: true, description: "Number of gems to transfer. Must be ≥ 1." },
              { name: "reason",       type: "string",                  description: "Human-readable reason for the transfer." },
            ]}
            responseFields={[
              { name: "from.username",   type: "string",  description: "Sender username." },
              { name: "from.userId",     type: "string",  description: "Sender user ID." },
              { name: "from.gemBalance", type: "integer", description: "Sender's new balance." },
              { name: "to.username",     type: "string",  description: "Recipient username." },
              { name: "to.userId",       type: "string",  description: "Recipient user ID." },
              { name: "to.gemBalance",   type: "integer", description: "Recipient's new balance." },
            ]}
            curl={`curl -X POST "https://your-domain.com/api/transfer" \\
  -H "x-api-key: ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"fromUsername":"alice","toUsername":"bob","amount":50,"reason":"Gifted"}'`}
          />

          <Separator className="bg-border" />
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Transaction types written by consumer endpoints</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "earn",         color: "text-emerald-400", desc: "Credit from /earn" },
                { type: "spend",        color: "text-red-400",     desc: "Debit from /spend" },
                { type: "transfer_out", color: "text-amber-400",   desc: "Debit side of /transfer (sender)" },
                { type: "transfer_in",  color: "text-sky-400",     desc: "Credit side of /transfer (recipient)" },
              ].map((t) => (
                <div key={t.type} className="flex items-center gap-3 rounded border border-border/50 p-2.5">
                  <code className={`text-xs font-mono font-semibold ${t.color}`}>{t.type}</code>
                  <span className="text-xs text-muted-foreground">{t.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── ADMIN API ── */}
        <TabsContent value="admin" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Admin endpoints manage users, wallets, transactions, and API keys directly.
            These do not require an API key — restrict network access to them in production.
          </p>

          <div className="flex items-start gap-3 rounded-lg border border-sky-700/40 bg-sky-900/10 p-4">
            <ShieldAlert className="h-5 w-5 text-sky-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-sky-300/80">
              Admin endpoints are not API-key-gated and are not rate-limited. In production,
              place these behind a VPN or reverse-proxy access control list so only your
              internal services can reach them.
            </p>
          </div>

          <EndpointCard
            method="GET"
            path={`${BASE}/users`}
            summary="List users"
            description="Returns all users with their current gem balance."
            responseFields={[
              { name: "id",              type: "string",  description: "User UUID." },
              { name: "username",        type: "string",  description: "Unique username." },
              { name: "gemBalance",      type: "integer", description: "Current gem balance." },
              { name: "createdAt",       type: "string",  description: "ISO 8601 timestamp." },
            ]}
            curl={`curl "https://your-domain.com/api/users"`}
          />

          <EndpointCard
            method="POST"
            path={`${BASE}/users`}
            summary="Create user"
            description="Creates a user and their wallet. Returns 409 if the username is already taken. Note: consumer endpoints auto-create users, so you only need this for pre-registration flows."
            bodyFields={[
              { name: "username", type: "string", required: true, description: "Unique username. Min length 1." },
            ]}
            responseFields={[
              { name: "id",         type: "string",  description: "Generated user UUID." },
              { name: "username",   type: "string",  description: "Username." },
              { name: "gemBalance", type: "integer", description: "Starting balance (always 0)." },
              { name: "createdAt",  type: "string",  description: "ISO 8601 timestamp." },
            ]}
            curl={`curl -X POST "https://your-domain.com/api/users" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"newplayer"}'`}
          />

          <EndpointCard
            method="GET"
            path={`${BASE}/transactions`}
            summary="List transactions"
            description="Returns the full ledger, newest first. Filter by user or app source. Default limit is 50."
            queryParams={[
              { name: "userId",    type: "string",  description: "Filter to a specific user ID." },
              { name: "appSource", type: "string",  description: "Filter to a specific app (e.g. app-quests)." },
              { name: "limit",     type: "integer", description: "Max results to return (default 50)." },
            ]}
            responseFields={[
              { name: "id",           type: "string",       description: "Transaction UUID." },
              { name: "userId",       type: "string",       description: "User ID." },
              { name: "username",     type: "string",       description: "Username at time of query." },
              { name: "appSource",    type: "string",       description: "App that originated the transaction." },
              { name: "type",         type: "string",       description: "earn | spend | transfer_out | transfer_in | credit | debit" },
              { name: "amount",       type: "integer",      description: "Gem amount (always positive)." },
              { name: "balanceAfter", type: "integer",      description: "Balance immediately after this transaction." },
              { name: "reason",       type: "string | null", description: "Optional reason string." },
              { name: "createdAt",    type: "string",       description: "ISO 8601 timestamp." },
            ]}
            curl={`curl "https://your-domain.com/api/transactions?appSource=app-quests&limit=20"`}
          />

          <EndpointCard
            method="POST"
            path={`${BASE}/transactions`}
            summary="Manual credit / debit"
            description="Admin-initiated transaction by user ID. Use the consumer /earn and /spend endpoints when calling from an app with an API key — this one is for manual corrections and backfills."
            bodyFields={[
              { name: "userId",    type: "string",  required: true, description: "Target user UUID." },
              { name: "appSource", type: "string",  required: true, description: "Name to record as the source app." },
              { name: "type",      type: "string",  required: true, description: '"credit" or "debit"' },
              { name: "amount",    type: "integer", required: true, description: "Gem amount ≥ 1." },
              { name: "reason",    type: "string",                  description: "Optional reason." },
            ]}
            curl={`curl -X POST "https://your-domain.com/api/transactions" \\
  -H "Content-Type: application/json" \\
  -d '{"userId":"<uuid>","appSource":"admin","type":"credit","amount":100,"reason":"Manual correction"}'`}
          />

          <EndpointCard
            method="GET"
            path={`${BASE}/api-keys`}
            summary="List API keys"
            description="Returns all keys and their metadata. The full key value is not re-exposed after creation — only a prefix is visible in the admin UI."
            responseFields={[
              { name: "key",       type: "string",  description: "Full key value (only visible at creation — store it then)." },
              { name: "appName",   type: "string",  description: "Application name this key belongs to." },
              { name: "active",    type: "boolean", description: "Whether the key is currently valid." },
              { name: "createdAt", type: "string",  description: "ISO 8601 timestamp." },
            ]}
            curl={`curl "https://your-domain.com/api/api-keys"`}
          />

          <EndpointCard
            method="POST"
            path={`${BASE}/api-keys`}
            summary="Create API key"
            description="Generates a new glk_-prefixed key. The full key value is returned exactly once — copy and store it immediately in your secrets manager."
            bodyFields={[
              { name: "appName", type: "string", required: true, description: "Human-readable name for the application." },
            ]}
            curl={`curl -X POST "https://your-domain.com/api/api-keys" \\
  -H "Content-Type: application/json" \\
  -d '{"appName":"my-game-server"}'`}
          />

          <EndpointCard
            method="PATCH"
            path={`${BASE}/api-keys/{key}`}
            summary="Activate or deactivate a key"
            description="Toggle a key's active status. Deactivating takes effect immediately — any in-flight request using that key will be rejected before it reaches a route handler."
            bodyFields={[
              { name: "active", type: "boolean", required: true, description: "true to activate, false to deactivate." },
            ]}
            curl={`curl -X PATCH "https://your-domain.com/api/api-keys/glk_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"active":false}'`}
          />

          <EndpointCard
            method="DELETE"
            path={`${BASE}/api-keys/{key}`}
            summary="Delete an API key"
            description="Permanently removes the key. Returns 204 on success. Prefer deactivating over deleting if there's any chance you'll need to re-enable it."
            curl={`curl -X DELETE "https://your-domain.com/api/api-keys/glk_abc123..."`}
          />

          <EndpointCard
            method="GET"
            path={`${BASE}/transactions/summary`}
            summary="Ledger summary"
            description="Aggregate stats across all users and apps. Useful for a quick health check."
            responseFields={[
              { name: "totalUsers",                         type: "integer", description: "Total registered users." },
              { name: "totalGemsInCirculation",             type: "integer", description: "Sum of all wallet balances." },
              { name: "totalTransactions",                  type: "integer", description: "Total transaction count." },
              { name: "transactionsByApp[].appSource",      type: "string",  description: "App name." },
              { name: "transactionsByApp[].transactionCount", type: "integer", description: "Number of transactions from that app." },
              { name: "transactionsByApp[].totalCredited",  type: "integer", description: "Total gems credited by that app." },
              { name: "transactionsByApp[].totalDebited",   type: "integer", description: "Total gems debited by that app." },
            ]}
            curl={`curl "https://your-domain.com/api/transactions/summary"`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
