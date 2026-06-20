import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

// Pages
import Dashboard from "@/pages/dashboard";
import UsersPage from "@/pages/users";
import UserDetailPage from "@/pages/user-detail";
import WalletsPage from "@/pages/wallets";
import TransactionsPage from "@/pages/transactions";
import ApiKeysPage from "@/pages/api-keys";
import ApiReferencePage from "@/pages/api-reference";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/users" component={UsersPage} />
        <Route path="/users/:userId" component={UserDetailPage} />
        <Route path="/wallets" component={WalletsPage} />
        <Route path="/transactions" component={TransactionsPage} />
        <Route path="/api-keys" component={ApiKeysPage} />
        <Route path="/reference" component={ApiReferencePage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
