import { LayoutDashboard, Users, Wallet, ArrowLeftRight, KeySquare, Gem, BookOpen, Webhook, Vault, Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Users", href: "/users", icon: Users },
    { name: "Wallets", href: "/wallets", icon: Wallet },
    { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
    { name: "Treasury", href: "/treasury", icon: Vault },
    { name: "API Keys", href: "/api-keys", icon: KeySquare },
    { name: "Webhooks", href: "/webhooks", icon: Webhook },
    { name: "API Reference", href: "/reference", icon: BookOpen },
  ];

  return (
    <div className="flex min-h-[100dvh] overflow-hidden bg-background">
      <button
        type="button"
        data-testid="button-toggle-navigation"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        onClick={() => setMobileOpen((open) => !open)}
        className="fixed right-4 top-4 z-50 rounded-md border border-border bg-card p-2 text-muted-foreground md:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {mobileOpen && <button type="button" aria-label="Close navigation overlay" data-testid="button-close-navigation-overlay" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-background/70 md:hidden" />}
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar transition-transform md:relative md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Gem className="h-6 w-6 text-primary mr-3" />
          <span className="font-bold text-lg tracking-tight text-foreground">GEM LEDGER</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    data-testid={`link-navigation-${item.name.toLowerCase().replaceAll(" ", "-")}`}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-5 w-5 ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground font-mono">
            System Status: <span className="text-primary">Operational</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
