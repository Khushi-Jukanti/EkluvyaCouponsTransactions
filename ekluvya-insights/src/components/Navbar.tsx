import { Moon, Sun, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { BASE_URL } from "@/config/api";

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
  const [completeData, setCompleteData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Fetch ALL transactions from the beginning
  useEffect(() => {
    const fetchCompleteData = async () => {
      try {
        setDataLoading(true);
        // Fetch ALL transactions without any date filter
        const response = await fetch(`${BASE_URL}/transactions?limit=100000`);
        const data = await response.json();

        if (data.success && data.data) {
          setCompleteData(data.data);
        } else {
          // Fallback: If no dedicated endpoint, use the current data
          setCompleteData(allTransactions);
        }
      } catch (error) {
        console.error("Failed to fetch complete data:", error);
        // Fallback to current data
        setCompleteData(allTransactions);
      } finally {
        setDataLoading(false);
      }
    };

    fetchCompleteData();
  }, []); // Empty dependency array - fetch only once on mount

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  };

  // -----------------------
  // Helper functions
  // -----------------------

  // Safe date parsing function
  const parseDate = (t: any): Date => {
    if (!t) return new Date(0);

    // Try all possible date fields
    const dateStr = t.date_ist || t.created_at || t.createdAt || t.dateTime || t.date || t.createdDate || "";

    if (!dateStr) return new Date(0);

    // If it's already a Date object
    if (dateStr instanceof Date) {
      return isNaN(dateStr.getTime()) ? new Date(0) : dateStr;
    }

    // If it's a number (timestamp)
    if (typeof dateStr === 'number') {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date(0) : date;
    }

    const str = String(dateStr).trim();

    // Try DD-MM-YYYY HH:mm:ss format (most common in your screenshot)
    const istMatch = str.match(/(\d{1,2})-(\d{1,2})-(\d{4}) (\d{1,2}):(\d{1,2}):(\d{1,2})/);
    if (istMatch) {
      const [_, day, month, year, hour, minute, second] = istMatch;
      // Create date - Month is 0-indexed
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try DD-MM-YYYY format
    const dateMatch = str.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (dateMatch) {
      const [_, day, month, year] = dateMatch;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try ISO format
    try {
      const isoDate = new Date(str);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
    } catch { }

    // Return epoch for invalid dates
    return new Date(0);
  };

  const hasCoupon = (t: any): boolean => {
    if (!t) return false;
    const code = t.couponText || t.coupon_text || t.coupon_code || t.coupon || t.couponCode || "";
    return code && code.trim() !== "" && code.toUpperCase() !== "N/A";
  };

  // Fixed start date: November 10, 2025
  const FIXED_START_DATE = new Date(2025, 10, 10); // November 10, 2025 (month is 0-indexed, 10 = November)

  // Deduplication logic - mobile OR email
  const dedupeTransactions = (transactions: any[]): any[] => {
    const map = new Map<string, any>();

    for (const t of transactions) {
      const mobile = String(t.phone || t.userPhone || t.mobile || "").trim();
      const email = String(t.email || t.userEmail || "").trim().toLowerCase();

      // Use mobile if available, otherwise email
      const key = mobile || email;

      if (!key) continue; // Skip if no identifier

      const existing = map.get(key);
      if (!existing) {
        map.set(key, t);
      } else {
        // Keep the transaction with the latest date
        const existingDate = parseDate(existing);
        const currentDate = parseDate(t);

        if (currentDate.getTime() > existingDate.getTime()) {
          map.set(key, t);
        }
      }
    }

    return Array.from(map.values());
  };

  // Function to filter transactions from Nov 10, 2025 to today
  const filterByDateRange = (transactions: any[]): any[] => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    return transactions.filter(t => {
      const date = parseDate(t);
      // Check if date is valid and within range
      if (isNaN(date.getTime()) || date.getTime() === 0) return false;
      return date >= FIXED_START_DATE && date <= today;
    });
  };

  // Function to filter today's transactions
  const filterTodayTransactions = (transactions: any[]): any[] => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return transactions.filter(t => {
      const date = parseDate(t);
      if (isNaN(date.getTime()) || date.getTime() === 0) return false;
      return date >= todayStart && date < todayEnd;
    });
  };

  // -----------------------
  // Process COMPLETE data (from Nov 10, 2025 to today)
  // -----------------------
  const {
    allTimeTransactions,
    allTimeCount,
    allTimeSuccessCount,
    allTimeFailedCount,
    allTimeWithCouponCount,
    allTimeWithoutCouponCount,
    allTimeSuccessWithCoupon,
    allTimeSuccessWithoutCoupon,
    allTimeFailedWithCoupon,
    allTimeFailedWithoutCoupon,
  } = useMemo(() => {
    if (dataLoading || completeData.length === 0) {
      return {
        allTimeTransactions: [],
        allTimeCount: 0,
        allTimeSuccessCount: 0,
        allTimeFailedCount: 0,
        allTimeWithCouponCount: 0,
        allTimeWithoutCouponCount: 0,
        allTimeSuccessWithCoupon: 0,
        allTimeSuccessWithoutCoupon: 0,
        allTimeFailedWithCoupon: 0,
        allTimeFailedWithoutCoupon: 0,
      };
    }

    // 1. Filter by date range (Nov 10, 2025 to today)
    const dateFiltered = filterByDateRange(completeData);

    // 2. Remove duplicates
    const uniqueTransactions = dedupeTransactions(dateFiltered);

    // 3. Calculate counts
    const success = uniqueTransactions.filter(
      (t) => Number(t.paymentStatus) === 2 || t.paymentStatus === '2' || t.status === 'success'
    );
    const failed = uniqueTransactions.filter(
      (t) => Number(t.paymentStatus) === 3 || t.paymentStatus === '3' || t.status === 'failed'
    );

    const withCoupon = uniqueTransactions.filter(hasCoupon);
    const successWithCoupon = success.filter(hasCoupon);
    const failedWithCoupon = failed.filter(hasCoupon);

    return {
      allTimeTransactions: uniqueTransactions,
      allTimeCount: uniqueTransactions.length,
      allTimeSuccessCount: success.length,
      allTimeFailedCount: failed.length,
      allTimeWithCouponCount: withCoupon.length,
      allTimeWithoutCouponCount: uniqueTransactions.length - withCoupon.length,
      allTimeSuccessWithCoupon: successWithCoupon.length,
      allTimeSuccessWithoutCoupon: success.length - successWithCoupon.length,
      allTimeFailedWithCoupon: failedWithCoupon.length,
      allTimeFailedWithoutCoupon: failed.length - failedWithCoupon.length,
    };
  }, [completeData, dataLoading]);

  // -----------------------
  // Process TODAY's data from CURRENT filter
  // -----------------------
  const {
    todayTransactions,
    todayCount,
    todaySuccessCount,
    todayFailedCount,
    todayWithCouponCount,
    todayWithoutCouponCount,
    todaySuccessWithCoupon,
    todaySuccessWithoutCoupon,
    todayFailedWithCoupon,
    todayFailedWithoutCoupon,
  } = useMemo(() => {
    if (allTransactions.length === 0) {
      return {
        todayTransactions: [],
        todayCount: 0,
        todaySuccessCount: 0,
        todayFailedCount: 0,
        todayWithCouponCount: 0,
        todayWithoutCouponCount: 0,
        todaySuccessWithCoupon: 0,
        todaySuccessWithoutCoupon: 0,
        todayFailedWithCoupon: 0,
        todayFailedWithoutCoupon: 0,
      };
    }

    // 1. Filter today's transactions from current data
    const todayFiltered = filterTodayTransactions(allTransactions);

    // 2. Remove duplicates
    const uniqueToday = dedupeTransactions(todayFiltered);

    // 3. Calculate counts
    const success = uniqueToday.filter(
      (t) => Number(t.paymentStatus) === 2 || t.paymentStatus === '2' || t.status === 'success'
    );
    const failed = uniqueToday.filter(
      (t) => Number(t.paymentStatus) === 3 || t.paymentStatus === '3' || t.status === 'failed'
    );

    const withCoupon = uniqueToday.filter(hasCoupon);
    const successWithCoupon = success.filter(hasCoupon);
    const failedWithCoupon = failed.filter(hasCoupon);

    return {
      todayTransactions: uniqueToday,
      todayCount: uniqueToday.length,
      todaySuccessCount: success.length,
      todayFailedCount: failed.length,
      todayWithCouponCount: withCoupon.length,
      todayWithoutCouponCount: uniqueToday.length - withCoupon.length,
      todaySuccessWithCoupon: successWithCoupon.length,
      todaySuccessWithoutCoupon: success.length - successWithCoupon.length,
      todayFailedWithCoupon: failedWithCoupon.length,
      todayFailedWithoutCoupon: failed.length - failedWithCoupon.length,
    };
  }, [allTransactions]);

  // Debug: Log the counts
  useEffect(() => {
    if (!dataLoading) {
      console.log("=== NAVBAR DEBUG ===");
      console.log("Complete data count:", completeData.length);
      console.log("All time transactions (filtered & deduped):", allTimeCount);
      console.log("Fixed start date:", FIXED_START_DATE.toDateString());
      console.log("Today's date:", new Date().toDateString());
      console.log("===================");
    }
  }, [dataLoading, completeData.length, allTimeCount]);

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

          {/* ALL TIME COUNTS (Nov 10, 2025 to Today - Independent of filter) */}
          <div className="flex items-center gap-8">
            <CountCard
              label="Total (Since Nov 10)"
              count={allTimeCount}
              withCoupon={allTimeWithCouponCount}
              withoutCoupon={allTimeWithoutCouponCount}
              isLoading={dataLoading || isLoading}
            />
            <CountCard
              label="Success"
              count={allTimeSuccessCount}
              withCoupon={allTimeSuccessWithCoupon}
              withoutCoupon={allTimeSuccessWithoutCoupon}
              isLoading={dataLoading || isLoading}
              color="text-success"
            />
            <CountCard
              label="Failed"
              count={allTimeFailedCount}
              withCoupon={allTimeFailedWithCoupon}
              withoutCoupon={allTimeFailedWithoutCoupon}
              isLoading={dataLoading || isLoading}
              color="text-destructive"
            />
          </div>

          {/* TODAY COUNTS (Based on current filter) */}
          <div className="flex items-center gap-8 border-l border-border/40 pl-6">
            <CountCard
              label="Today Total"
              count={todayCount}
              withCoupon={todayWithCouponCount}
              withoutCoupon={todayWithoutCouponCount}
              isLoading={isLoading}
            />
            <CountCard
              label="Today Success"
              count={todaySuccessCount}
              withCoupon={todaySuccessWithCoupon}
              withoutCoupon={todaySuccessWithoutCoupon}
              isLoading={isLoading}
              color="text-success"
            />
            <CountCard
              label="Today Failed"
              count={todayFailedCount}
              withCoupon={todayFailedWithCoupon}
              withoutCoupon={todayFailedWithoutCoupon}
              isLoading={isLoading}
              color="text-destructive"
            />
          </div>

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