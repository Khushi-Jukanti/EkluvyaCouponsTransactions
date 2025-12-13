// src/components/Navbar.tsx
import { CreditCard, Moon, Sun, FilterIcon, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

// type StatusFilter = "all" | "success" | "failed";

interface NavbarProps {
  totalTransactions: number;
  allTransactions: any[];        // This is the FULL filtered list when client-side mode
  isLoading?: boolean;
  // onStatusFilterChange?: (filter: StatusFilter) => void;
}

const Navbar = ({
  totalTransactions,
  allTransactions = [],
  isLoading = false,
  // onStatusFilterChange,
}: NavbarProps) => {
  const [isDark, setIsDark] = useState(true);
  // const [selectedFilter, setSelectedFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  // const handleFilterChange = (value: StatusFilter) => {
  //   setSelectedFilter(value);
  //   onStatusFilterChange?.(value);
  // };

  // ALWAYS show real full counts — no matter what filter is selected
  // const realSuccessCount = allTransactions.filter(t => t.paymentStatus === 2).length;
  // const realFailedCount = allTransactions.filter(t => t.paymentStatus === 3).length;



  // Calculate counts with safe Number() conversion
  const successCount = allTransactions.filter(t =>
    t.paymentStatus != null && Number(t.paymentStatus) === 2
  ).length;

  const failedCount = allTransactions.filter(t =>
    t.paymentStatus != null && Number(t.paymentStatus) === 3
  ).length;

  const hasCoupon = (t: any) => {
    const code = t.couponText || t.coupon_code || t.coupon || "";
    return code && code.trim() !== "" && code.toUpperCase() !== "N/A";
  };

  const withCouponCount = allTransactions.filter(hasCoupon).length;
  const withoutCouponCount = allTransactions.length - withCouponCount;

  const successWithCoupon = allTransactions.filter(t =>
    hasCoupon(t) && t.paymentStatus != null && Number(t.paymentStatus) === 2
  ).length;

  const successWithoutCoupon = successCount - successWithCoupon;

  const failedWithCoupon = allTransactions.filter(t =>
    hasCoupon(t) && t.paymentStatus != null && Number(t.paymentStatus) === 3
  ).length;

  const failedWithoutCoupon = failedCount - failedWithCoupon;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl glow-sm">
            {/* <span className="text-lg font-bold text-primary-foreground">E</span> */}
            <img
              src="/favicon.png"
              alt="Ekluvya Admin Logo"
              className="h-16 w-16 object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Ekluvya Admin</h1>
            <p className="text-xs text-muted-foreground">Subscription Management</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* FIXED: Always show REAL full counts */}
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Total</p>
              {isLoading ? (
                <div className="h-7 w-24 shimmer rounded mx-auto" />
              ) : (
                <p className="font-bold text-2xl text-foreground">
                  {totalTransactions.toLocaleString()}
                </p>
              )}
              <div className="mt-2 flex items-center justify-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-primary">
                  <Tag className="h-3 w-3" />
                  {withCouponCount.toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  / {withoutCouponCount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-success text-xs">Success</p>
              {isLoading ? (
                <div className="h-7 w-24 shimmer rounded mx-auto" />
              ) : (
                <p className="font-bold text-2xl text-success">
                  {successCount.toLocaleString()}
                </p>
              )}
              <div className="mt-2 flex items-center justify-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-success">
                  <Tag className="h-3 w-3" />
                  {successWithCoupon.toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  / {successWithoutCoupon.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-destructive text-xs">Failed</p>
              {isLoading ? (
                <div className="h-7 w-24 shimmer rounded mx-auto" />
              ) : (
                <p className="font-bold text-2xl text-destructive">
                  {failedCount.toLocaleString()}
                </p>
              )}
              <div className="mt-2 flex items-center justify-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-destructive">
                  <Tag className="h-3 w-3" />
                  {failedWithCoupon.toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  / {failedWithoutCoupon.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Dropdown — only filters the table */}
          {/* <div className="flex items-center gap-3">
            <FilterIcon className="h-5 w-5 text-primary" />
            <Select value={selectedFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-36 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div> */}

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;