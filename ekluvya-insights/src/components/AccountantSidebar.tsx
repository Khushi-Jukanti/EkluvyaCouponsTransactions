import { useEffect, useState } from "react";
import {
  BarChart3,
  GraduationCap,
  History,
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
  {
    label: "Import History",
    to: "/admin/dashboard/import-history",
    icon: History,
  },
];

const AccountantSidebar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktopHovered, setIsDesktopHovered] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const isDesktopExpanded = isDesktopHovered;

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

  const Brand = ({
    compact = false,
    expanded = true,
  }: {
    compact?: boolean;
    expanded?: boolean;
  }) => (
    <button
      type="button"
      onClick={refreshDashboard}
      className={cn(
        "flex w-full items-center text-left transition-colors hover:bg-accent/60",
        compact
          ? "h-16 rounded-lg px-2"
          : cn(
              "h-20 border-b border-border/60",
              expanded ? "gap-3 px-5 lg:px-6" : "justify-center px-2"
            )
      )}
      aria-label="Refresh accountant dashboard"
      title="Refresh accountant dashboard"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <img src="/favicon.png" alt="Ekluvya" className="h-9 w-9 object-contain" />
      </div>
      <div
        className={cn(
          "min-w-0 overflow-hidden transition-all duration-300",
          expanded ? "w-44 opacity-100" : "w-0 opacity-0"
        )}
      >
        <h1 className="truncate text-base font-bold tracking-tight">
          Ekluvya Insights
        </h1>
        <p className="truncate text-xs text-muted-foreground">
          Accountant Dashboard
        </p>
      </div>
    </button>
  );

  const NavigationLinks = ({
    onNavigate,
    expanded = true,
  }: {
    onNavigate?: () => void;
    expanded?: boolean;
  }) => (
    <nav className="flex flex-col gap-2">
      {accountantNavItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={item.label}
            aria-label={item.label}
            className={({ isActive }) =>
              cn(
                "group flex items-center rounded-lg py-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
                expanded ? "gap-3 px-3" : "justify-center px-0",
                isActive &&
                  "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span
              className={cn(
                "truncate overflow-hidden transition-all duration-300",
                expanded ? "w-48 opacity-100" : "w-0 opacity-0"
              )}
            >
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );

  const AccountActions = ({ expanded = true }: { expanded?: boolean }) => (
    <div className="space-y-2 border-t border-border/60 p-4">
      <button
        type="button"
        onClick={toggleTheme}
        title={isDark ? "Light Theme" : "Dark Theme"}
        aria-label={isDark ? "Light Theme" : "Dark Theme"}
        className={cn(
          "flex w-full items-center rounded-lg py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          expanded ? "gap-3 px-3" : "justify-center px-0"
        )}
      >
        {isDark ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
        <span
          className={cn(
            "overflow-hidden whitespace-nowrap transition-all duration-300",
            expanded ? "w-32 opacity-100" : "w-0 opacity-0"
          )}
        >
          {isDark ? "Light Theme" : "Dark Theme"}
        </span>
      </button>

      <button
        type="button"
        onClick={handleLogout}
        disabled={logoutLoading}
        title="Sign Out"
        aria-label="Sign Out"
        className={cn(
          "flex w-full items-center rounded-lg py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300",
          expanded ? "gap-3 px-3" : "justify-center px-0"
        )}
      >
        {logoutLoading ? (
          <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <LogOut className="h-5 w-5 shrink-0" />
        )}
        <span
          className={cn(
            "overflow-hidden whitespace-nowrap transition-all duration-300",
            expanded ? "w-24 opacity-100" : "w-0 opacity-0"
          )}
        >
          Sign Out
        </span>
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

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[60] hidden border-r border-border/60 bg-card/95 backdrop-blur-xl transition-[width] duration-300 ease-in-out lg:block",
          isDesktopExpanded ? "w-72 shadow-xl" : "w-20"
        )}
        onMouseEnter={() => setIsDesktopHovered(true)}
        onMouseLeave={() => setIsDesktopHovered(false)}
      >
        <div className="flex h-full flex-col">
          <Brand expanded={isDesktopExpanded} />
          <div className="flex-1 p-4">
            <NavigationLinks expanded={isDesktopExpanded} />
          </div>
          <AccountActions expanded={isDesktopExpanded} />
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
