import { useEffect, useState } from "react";
import {
  BarChart3,
  GraduationCap,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const accountantNavItems = [
  {
    label: "Subscription Management",
    to: "/admin/dashboard/subscription-management",
    icon: BarChart3,
  },
  {
    label: "School & Students Management",
    to: "/admin/dashboard/school-students-management",
    icon: GraduationCap,
  },
];

const AccountantSidebar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
    setIsDark(false);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const refreshDashboard = () => {
    window.location.reload();
  };

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);

    if (nextIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userName");
      setLogoutLoading(false);
      navigate("/login", { replace: true });
    }
  };

  const Brand = ({ compact = false }: { compact?: boolean }) => (
    <button
      type="button"
      onClick={refreshDashboard}
      className={cn(
        "flex w-full items-center gap-3 text-left transition-colors hover:bg-accent/60",
        compact
          ? "h-16 rounded-lg px-2"
          : "h-20 border-b border-border/60 px-5 lg:px-6"
      )}
      aria-label="Refresh accountant dashboard"
      title="Refresh accountant dashboard"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <img src="/favicon.png" alt="Ekluvya" className="h-9 w-9 object-contain" />
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-base font-bold tracking-tight">
          Ekluvya Insights
        </h1>
        <p className="truncate text-xs text-muted-foreground">
          Accountant Dashboard
        </p>
      </div>
    </button>
  );

  const NavigationLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-2">
      {accountantNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
                isActive &&
                  "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  const AccountActions = () => (
    <div className="space-y-2 border-t border-border/60 p-4">
      <button
        type="button"
        onClick={toggleTheme}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        {isDark ? "Light Theme" : "Dark Theme"}
      </button>

      <button
        type="button"
        onClick={handleLogout}
        disabled={logoutLoading}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
      >
        {logoutLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        Sign Out
      </button>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-[70] border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Brand compact />
          </div>
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent"
            aria-label="Open accountant menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-[60] hidden w-72 border-r border-border/60 bg-card/95 backdrop-blur-xl lg:block">
        <div className="flex h-full flex-col">
          <Brand />
          <div className="flex-1 p-4">
            <NavigationLinks />
          </div>
          <AccountActions />
        </div>
      </aside>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close accountant menu"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(86vw,360px)] flex-col border-r border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 p-4">
              <div className="min-w-0 flex-1">
                <Brand compact />
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:bg-accent"
                aria-label="Close accountant menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <NavigationLinks onNavigate={() => setIsMenuOpen(false)} />
            </div>
            <AccountActions />
          </aside>
        </div>
      )}
    </>
  );
};

export default AccountantSidebar;
