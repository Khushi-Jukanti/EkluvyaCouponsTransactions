import { TrendingUp, CreditCard, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface NavbarProps {
  totalTransactions: number;
  todayRevenue: number;
  isLoading?: boolean;
}

const Navbar = ({ totalTransactions, todayRevenue, isLoading }: NavbarProps) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary glow-sm">
            <span className="text-lg font-bold text-primary-foreground">E</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Ekluvya Admin</h1>
            <p className="text-xs text-muted-foreground">Subscription Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="stat-card flex items-center gap-2 px-4 py-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Transactions</p>
              {isLoading ? (
                <div className="h-5 w-16 shimmer rounded" />
              ) : (
                <p className="text-sm font-semibold">{totalTransactions.toLocaleString()}</p>
              )}
            </div>
          </div>

          <div className="stat-card flex items-center gap-2 px-4 py-2">
            <TrendingUp className="h-4 w-4 text-success" />
            {/* <div className="text-right">
              <p className="text-xs text-muted-foreground">Today's Revenue</p>
              {isLoading ? (
                <div className="h-5 w-20 shimmer rounded" />
              ) : (
                <p className="text-sm font-semibold text-success">
                  ₹{todayRevenue.toLocaleString()}
                </p>
              )}
            </div> */}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="ml-2"
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
