import { TrendingUp, CreditCard, Moon, Sun, FilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

type StatusFilter = "all" | "success" | "failed";

interface NavbarProps {
  totalTransactions: number;
  allTransactions: any[];
  isLoading?: boolean;
  onStatusFilterChange?: (filter: StatusFilter) => void;
}

const Navbar = ({
  totalTransactions,
  allTransactions = [],
  isLoading = false,
  onStatusFilterChange,
 }: NavbarProps) => {
  const [isDark, setIsDark] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const handleFilterChange = (value: StatusFilter) => {
    setSelectedFilter(value);
    onStatusFilterChange?.(value);
  };

  // Count from FULL list (not just current page)
  const successCount = allTransactions.filter(t => t.paymentStatus === 2).length;
  const failedCount = allTransactions.filter(t => t.paymentStatus === 3).length;

  const displayCount = selectedFilter === "success"
    ? successCount
    : selectedFilter === "failed"
      ? failedCount
      : totalTransactions;

  const filterLabel = selectedFilter === "all" ? "Total" : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1);


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
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
          <div className="stat-card px-5 py-3 flex items-center gap-4 min-w-[200px]">
            <FilterIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{filterLabel} Transactions</p>
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <div className="h-7 w-24 shimmer rounded" />
                ) : (
                  <p className="text-2xl font-bold">{displayCount.toLocaleString()}</p>
                )}
                <Select value={selectedFilter} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-22 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          {/* <div className="stat-card flex items-center gap-2 px-4 py-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Today's Revenue</p>
              {isLoading ? (
                <div className="h-5 w-20 shimmer rounded" />
              ) : (
                <p className="text-sm font-semibold text-success">
                  ₹{todayRevenue.toLocaleString()}
                </p>
              )}
            </div>
          </div> */}

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
