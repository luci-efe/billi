import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useUser, useClerk, useAuth, UserButton } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  MessageSquare,
  Settings,
  LogOut,
  PlusCircle,
  PiggyBank
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { apiClient } from "@/lib/api-client";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Transacciones", href: "/transactions", icon: Receipt },
  { name: "Chat Billi", href: "/chat", icon: MessageSquare },
  { name: "Facturas", href: "/invoices", icon: Receipt },
  { name: "Perfil y Plan", href: "/settings", icon: Settings },
];

export default function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken, isSignedIn, isLoaded: authLoaded } = useAuth();
  const [isApiAuthReady, setIsApiAuthReady] = useState(() => (authLoaded ? !isSignedIn : false));
  const { data: me } = useMe(isApiAuthReady);

  // SEC-NEW-11: Sync Clerk token to the apiClient for cross-origin staging/production calls.
  useEffect(() => {
    let isCurrent = true;

    if (!authLoaded) {
      setIsApiAuthReady(false);
      return () => {
        isCurrent = false;
      };
    }

    if (!isSignedIn) {
      apiClient.setAuthTokenProvider(null);
      apiClient.setAuthToken(null);
      setIsApiAuthReady(true);
      return () => {
        isCurrent = false;
      };
    }

    setIsApiAuthReady(false);
    apiClient.setAuthTokenProvider(() => getToken());

    getToken()
      .then((token) => {
        if (!isCurrent) return;
        apiClient.setAuthToken(token ?? null);
        setIsApiAuthReady(true);
      })
      .catch(() => {
        if (!isCurrent) return;
        apiClient.setAuthTokenProvider(null);
        apiClient.setAuthToken(null);
        setIsApiAuthReady(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [authLoaded, isSignedIn, getToken]);

  if (authLoaded && isSignedIn && !isApiAuthReady) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Sincronizando sesión...</div>;
  }

  return (
    <div data-testid="root-layout" className="flex min-h-screen w-full bg-background text-foreground antialiased">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-border bg-card/80 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-2xl tracking-tight text-indigo-500 dark:text-indigo-400">
            <PiggyBank className="h-8 w-8 text-indigo-500" />
            <span>Billi</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                    isActive ? "bg-muted text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-border p-4">
          <div className="flex items-center gap-3 px-2 py-3">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-8 w-8",
                  userButtonBox: "h-8 w-8",
                },
              }}
            />
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-medium text-foreground">{user?.fullName || user?.primaryEmailAddress?.emailAddress || "Usuario"}</p>
              <p className="truncate text-[10px] text-muted-foreground">{me?.consentAccepted ? "Plan Beta" : "Pendiente Consentimiento"}</p>
            </div>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 lg:ml-64 lg:pb-0">
        {/* Header (Mobile) */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <PiggyBank className="h-8 w-8 text-indigo-500" />
            <span className="font-bold text-xl text-indigo-500 dark:text-indigo-400">Billi</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {navItems.find(item => item.href === location.pathname)?.name || "Billi App"}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />
            <div className="hidden sm:block">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-8 w-8",
                    userButtonBox: "h-8 w-8",
                  },
                }}
              />
            </div>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold" onClick={() => navigate('/transactions', { state: { openCreate: true } })}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Movimiento</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card/95 px-2 backdrop-blur-md lg:hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-1 transition-colors hover:text-foreground",
                isActive ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground")} />
              <span className="text-[10px] font-medium">{item.name.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
