import { Moon, Sun, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";

interface NavbarProps {
  totalTransactions: number;
  allTransactions: any[];
  isLoading?: boolean;
}

const Navbar = ({
  totalTransactions,
  allTransactions = [],
  isLoading = false,
}: NavbarProps) => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  };

  // -----------------------
  // Helper functions
  // -----------------------

  // Safe date parsing function
  const getCreatedDate = (t: any): Date => {
    if (!t) return new Date(0);

    // Try different date fields
    const dateStr = t.created_at || t.createdAt || t.date_ist || t.dateTime || t.date || "";

    if (!dateStr) return new Date(0);

    // If it's already a Date object
    if (dateStr instanceof Date) {
      return isNaN(dateStr.getTime()) ? new Date(0) : dateStr;
    }

    // Try to parse as ISO string
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) return isoDate;

    // Try to parse IST format (DD-MM-YYYY HH:mm:ss)
    const istMatch = String(dateStr).match(/(\d{1,2})-(\d{1,2})-(\d{4}) (\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (istMatch) {
      const [_, day, month, year, hour, minute, second] = istMatch;
      // Create date in UTC and adjust for IST (+5:30)
      const utcDate = new Date(Date.UTC(
        parseInt(year),
        parseInt(month) - 1, // Month is 0-indexed
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      ));

      // Subtract 5.5 hours to convert IST to UTC
      const istDate = new Date(utcDate.getTime() - (5.5 * 60 * 60 * 1000));

      if (!isNaN(istDate.getTime())) return istDate;
    }

    // Try simple date format (DD-MM-YYYY)
    const simpleMatch = String(dateStr).match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (simpleMatch) {
      const [_, day, month, year] = simpleMatch;
      const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
      if (!isNaN(date.getTime())) return date;
    }

    // Return epoch as fallback
    return new Date(0);
  };

  const hasCoupon = (t: any): boolean => {
    if (!t) return false;
    const code = t.coupon_text || t.couponText || t.coupon_code || t.coupon || "";
    return code && code.trim() !== "" && code.toUpperCase() !== "N/A";
  };

  // -----------------------
  // ALL TIME COUNTS
  // -----------------------
  const {
    successCount,
    failedCount,
    withCouponCount,
    withoutCouponCount,
    successWithCoupon,
    successWithoutCoupon,
    failedWithCoupon,
    failedWithoutCoupon,
  } = useMemo(() => {
    // Filter out invalid transactions
    const validTransactions = allTransactions.filter(t => {
      const date = getCreatedDate(t);
      return !isNaN(date.getTime()) && date.getTime() > 0;
    });

    const success = validTransactions.filter(
      (t) => Number(t.paymentStatus) === 2
    );
    const failed = validTransactions.filter(
      (t) => Number(t.paymentStatus) === 3
    );

    const withCoupon = validTransactions.filter(hasCoupon);

    const successWithCoupon = success.filter(hasCoupon);
    const failedWithCoupon = failed.filter(hasCoupon);

    return {
      successCount: success.length,
      failedCount: failed.length,
      withCouponCount: withCoupon.length,
      withoutCouponCount: validTransactions.length - withCoupon.length,
      successWithCoupon: successWithCoupon.length,
      successWithoutCoupon: success.length - successWithCoupon.length,
      failedWithCoupon: failedWithCoupon.length,
      failedWithoutCoupon: failed.length - failedWithCoupon.length,
    };
  }, [allTransactions]);

  // -----------------------
  // TODAY COUNTS
  // -----------------------
  const {
    todayTotal,
    todaySuccess,
    todayFailed,
    todayWithCoupon,
    todayWithoutCoupon,
    todaySuccessWithCoupon,
    todaySuccessWithoutCoupon,
    todayFailedWithCoupon,
    todayFailedWithoutCoupon,
  } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter transactions for today
    const todayTxns = allTransactions.filter((t) => {
      try {
        const d = getCreatedDate(t);
        // Check if date is valid
        if (isNaN(d.getTime()) || d.getTime() === 0) return false;

        // Check if it's today
        return d >= today && d < tomorrow;
      } catch (error) {
        console.error("Error parsing transaction date:", error, t);
        return false;
      }
    });

    const success = todayTxns.filter(
      (t) => Number(t.paymentStatus) === 2
    );
    const failed = todayTxns.filter(
      (t) => Number(t.paymentStatus) === 3
    );

    const withCoupon = todayTxns.filter(hasCoupon);

    const successWithCoupon = success.filter(hasCoupon);
    const failedWithCoupon = failed.filter(hasCoupon);

    return {
      todayTotal: todayTxns.length,
      todaySuccess: success.length,
      todayFailed: failed.length,
      todayWithCoupon: withCoupon.length,
      todayWithoutCoupon: todayTxns.length - withCoupon.length,
      todaySuccessWithCoupon: successWithCoupon.length,
      todaySuccessWithoutCoupon: success.length - successWithCoupon.length,
      todayFailedWithCoupon: failedWithCoupon.length,
      todayFailedWithoutCoupon: failed.length - failedWithCoupon.length,
    };
  }, [allTransactions]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">

        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl glow-sm">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
            >
              <img
                src="/favicon.png"
                alt="Ekluvya Admin Logo"
                className="h-16 w-16 object-contain"
              />
            </a>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Ekluvya Admin</h1>
            <p className="text-xs text-muted-foreground">
              Subscription Management
            </p>
          </div>
        </div>

        {/* COUNTS */}
        <div className="flex items-center gap-8">

          {/* ALL TIME */}
          <div className="flex items-center gap-8">
            <CountCard
              label="Total"
              count={totalTransactions}
              withCoupon={withCouponCount}
              withoutCoupon={withoutCouponCount}
              isLoading={isLoading}
            />
            <CountCard
              label="Success"
              count={successCount}
              withCoupon={successWithCoupon}
              withoutCoupon={successWithoutCoupon}
              isLoading={isLoading}
              color="text-success"
            />
            <CountCard
              label="Failed"
              count={failedCount}
              withCoupon={failedWithCoupon}
              withoutCoupon={failedWithoutCoupon}
              isLoading={isLoading}
              color="text-destructive"
            />
          </div>

          {/* TODAY */}
          <div className="flex items-center gap-8 border-l border-border/40 pl-6">
            <CountCard
              label="Today Total"
              count={todayTotal}
              withCoupon={todayWithCoupon}
              withoutCoupon={todayWithoutCoupon}
              isLoading={isLoading}
            />
            <CountCard
              label="Today Success"
              count={todaySuccess}
              withCoupon={todaySuccessWithCoupon}
              withoutCoupon={todaySuccessWithoutCoupon}
              isLoading={isLoading}
              color="text-success"
            />
            <CountCard
              label="Today Failed"
              count={todayFailed}
              withCoupon={todayFailedWithCoupon}
              withoutCoupon={todayFailedWithoutCoupon}
              isLoading={isLoading}
              color="text-destructive"
            />
          </div>

          {/* THEME */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
};

interface CountCardProps {
  label: string;
  count: number;
  withCoupon?: number;
  withoutCoupon?: number;
  isLoading?: boolean;
  color?: string;
}

const CountCard = ({
  label,
  count,
  withCoupon,
  withoutCoupon,
  isLoading,
  color,
}: CountCardProps) => (
  <div className="text-center">
    <p className={`text-xs ${color || "text-muted-foreground"}`}>{label}</p>
    {isLoading ? (
      <div className="h-7 w-24 shimmer rounded mx-auto" />
    ) : (
      <p className={`font-bold text-2xl ${color || "text-foreground"}`}>
        {count.toLocaleString()}
      </p>
    )}
    {withCoupon !== undefined && withoutCoupon !== undefined && (
      <div className="mt-2 flex items-center justify-center gap-3 text-xs">
        <span className={`flex items-center gap-1 ${color || "text-primary"}`}>
          <Tag className="h-3 w-3" />
          {withCoupon.toLocaleString()}
        </span>
        <span className="text-muted-foreground">
          / {withoutCoupon.toLocaleString()}
        </span>
      </div>
    )}
  </div>
);

export default Navbar;