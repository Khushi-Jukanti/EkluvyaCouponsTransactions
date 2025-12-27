import { Moon, Sun, Tag, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { BASE_URL } from "@/config/api";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

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
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false); // Changed to false for light theme default
  const [completeData, setCompleteData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Set light theme as default on component mount
  useEffect(() => {
    // Remove dark class if it exists
    document.documentElement.classList.remove("dark");

    // Optional: Add light class if your theme system supports it
    // document.documentElement.classList.add("light");
  }, []);

  // Fetch ALL transactions from the beginning OR use props
  useEffect(() => {
    const fetchCompleteData = async () => {
      try {
        setDataLoading(true);
        // If we have allTransactions from props, use them
        if (allTransactions && allTransactions.length > 0) {
          setCompleteData(allTransactions);
        } else {
          // Otherwise fetch from API
          const response = await fetch(`${BASE_URL}/transactions?limit=100000`);
          const data = await response.json();

          if (data.success && data.data) {
            setCompleteData(data.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch complete data:", error);
        setCompleteData([]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchCompleteData();
  }, [allTransactions]);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Logout function
  const handleLogout = async () => {
    try {
      setLogoutLoading(true);

      // Call backend logout endpoint
      await api.post("/auth/logout");

      // Clear local storage
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userName");

      // Redirect to login page
      navigate("/login");

    } catch (error) {
      console.error("Logout error:", error);
      // Even if backend fails, clear frontend and redirect
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userName");
      navigate("/login");
    } finally {
      setLogoutLoading(false);
    }
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

  // NEW: Deduplication logic for a specific transaction list
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

  // Function to filter today's transactions - ALWAYS based on current date
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

    // 2. Separate success and failed transactions BEFORE deduplication
    const allSuccess = dateFiltered.filter(t =>
      t.paymentStatus === 2 ||
      t.paymentStatus === '2' ||
      t.status === 'success' ||
      t.status === 2
    );

    const allFailed = dateFiltered.filter(t =>
      t.paymentStatus === 3 ||
      t.paymentStatus === '3' ||
      t.status === 'failed' ||
      t.status === 3
    );

    // 3. Deduplicate success and failed transactions SEPARATELY
    const uniqueSuccess = dedupeTransactions(allSuccess);
    const uniqueFailed = dedupeTransactions(allFailed);

    // 4. Combine for total unique transactions
    const uniqueTransactions = [...uniqueSuccess, ...uniqueFailed];

    // 5. Calculate counts
    const withCoupon = uniqueTransactions.filter(hasCoupon);
    const successWithCoupon = uniqueSuccess.filter(hasCoupon);
    const failedWithCoupon = uniqueFailed.filter(hasCoupon);

    return {
      allTimeTransactions: uniqueTransactions,
      allTimeCount: uniqueTransactions.length,
      allTimeSuccessCount: uniqueSuccess.length,
      allTimeFailedCount: uniqueFailed.length,
      allTimeWithCouponCount: withCoupon.length,
      allTimeWithoutCouponCount: uniqueTransactions.length - withCoupon.length,
      allTimeSuccessWithCoupon: successWithCoupon.length,
      allTimeSuccessWithoutCoupon: uniqueSuccess.length - successWithCoupon.length,
      allTimeFailedWithCoupon: failedWithCoupon.length,
      allTimeFailedWithoutCoupon: uniqueFailed.length - failedWithCoupon.length,
    };
  }, [completeData, dataLoading]);

  // -----------------------
  // Process TODAY's data from COMPLETE DATA (not filtered data)
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
    if (completeData.length === 0 || dataLoading) {
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

    // 1. Filter today's transactions from COMPLETE data
    const todayFiltered = filterTodayTransactions(completeData);

    // 2. Separate success and failed transactions BEFORE deduplication
    const todaySuccess = todayFiltered.filter(t =>
      t.paymentStatus === 2 ||
      t.paymentStatus === '2' ||
      t.status === 'success' ||
      t.status === 2
    );

    const todayFailed = todayFiltered.filter(t =>
      t.paymentStatus === 3 ||
      t.paymentStatus === '3' ||
      t.status === 'failed' ||
      t.status === 3
    );

    // 3. Deduplicate success and failed transactions SEPARATELY
    const uniqueTodaySuccess = dedupeTransactions(todaySuccess);
    const uniqueTodayFailed = dedupeTransactions(todayFailed);

    // 4. Combine for total unique transactions
    const uniqueToday = [...uniqueTodaySuccess, ...uniqueTodayFailed];

    // 5. Calculate counts
    const withCoupon = uniqueToday.filter(hasCoupon);
    const successWithCoupon = uniqueTodaySuccess.filter(hasCoupon);
    const failedWithCoupon = uniqueTodayFailed.filter(hasCoupon);

    return {
      todayTransactions: uniqueToday,
      todayCount: uniqueToday.length,
      todaySuccessCount: uniqueTodaySuccess.length,
      todayFailedCount: uniqueTodayFailed.length,
      todayWithCouponCount: withCoupon.length,
      todayWithoutCouponCount: uniqueToday.length - withCoupon.length,
      todaySuccessWithCoupon: successWithCoupon.length,
      todaySuccessWithoutCoupon: uniqueTodaySuccess.length - successWithCoupon.length,
      todayFailedWithCoupon: failedWithCoupon.length,
      todayFailedWithoutCoupon: uniqueTodayFailed.length - failedWithCoupon.length,
    };
  }, [completeData, dataLoading]);

  // Debug: Log the counts
  useEffect(() => {
    if (!dataLoading) {
      console.log("=== NAVBAR DEBUG ===");
      console.log("Complete data count:", completeData.length);
      console.log("All time transactions (filtered & deduped):", allTimeCount);
      console.log("All time success:", allTimeSuccessCount);
      console.log("All time failed:", allTimeFailedCount);
      console.log("Today count:", todayCount);
      console.log("Today success:", todaySuccessCount);
      console.log("Today failed:", todayFailedCount);
      console.log("Fixed start date:", FIXED_START_DATE.toDateString());
      console.log("Today's date:", new Date().toDateString());
      console.log("===================");
    }
  }, [dataLoading, completeData.length, allTimeCount, allTimeSuccessCount, allTimeFailedCount, todayCount, todaySuccessCount, todayFailedCount]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">

        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
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
              label="Total"
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
              color="text-green-600 dark:text-green-400"
            />
            <CountCard
              label="Failed"
              count={allTimeFailedCount}
              withCoupon={allTimeFailedWithCoupon}
              withoutCoupon={allTimeFailedWithoutCoupon}
              isLoading={dataLoading || isLoading}
              color="text-red-600 dark:text-red-400"
            />
          </div>

          {/* TODAY COUNTS (Based on current date, not filtered data) */}
          <div className="flex items-center gap-8 border-l border-border/40 pl-6">
            <CountCard
              label="Today Total"
              count={todayCount}
              withCoupon={todayWithCouponCount}
              withoutCoupon={todayWithoutCouponCount}
              isLoading={dataLoading || isLoading}
            />
            <CountCard
              label="Today Success"
              count={todaySuccessCount}
              withCoupon={todaySuccessWithCoupon}
              withoutCoupon={todaySuccessWithoutCoupon}
              isLoading={dataLoading || isLoading}
              color="text-green-600 dark:text-green-400"
            />
            <CountCard
              label="Today Failed"
              count={todayFailedCount}
              withCoupon={todayFailedWithCoupon}
              withoutCoupon={todayFailedWithoutCoupon}
              isLoading={dataLoading || isLoading}
              color="text-red-600 dark:text-red-400"
            />
          </div>

          {/* THEME AND LOGOUT BUTTONS */}
          <div className="flex items-center gap-2 border-l border-border/40 pl-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={logoutLoading}
              title="Logout"
              className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
            >
              {logoutLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
            </Button>
          </div>
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
    <p className={`text-xs ${color || "text-gray-600 dark:text-gray-400"}`}>{label}</p>
    {isLoading ? (
      <div className="h-7 w-24 shimmer rounded mx-auto" />
    ) : (
      <p className={`font-bold text-2xl ${color || "text-gray-900 dark:text-white"}`}>
        {count.toLocaleString()}
      </p>
    )}
    {withCoupon !== undefined && withoutCoupon !== undefined && (
      <div className="mt-2 flex items-center justify-center gap-3 text-xs">
        <span className={`flex items-center gap-1 ${color || "text-blue-600 dark:text-blue-400"}`}>
          <Tag className="h-3 w-3" />
          {withCoupon.toLocaleString()}
        </span>
        <span className="text-gray-500 dark:text-gray-500">
          / {withoutCoupon.toLocaleString()}
        </span>
      </div>
    )}
  </div>
);

export default Navbar;