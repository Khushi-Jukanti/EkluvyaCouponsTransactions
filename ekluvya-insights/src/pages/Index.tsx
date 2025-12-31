import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Tag, RefreshCw, Users, XCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import TransactionsTable from "@/components/TransactionsTable";
import DateRangePicker from "@/components/DateRangePicker";
import Pagination from "@/components/Pagination";
import ExportButton from "@/components/ExportButton";
import CouponUsersModal from "@/components/CouponUsersModal";
import { useTransactions } from "@/hooks/useTransactions";
import { useCouponSearch } from "@/hooks/useCouponSearch";
import { DateRange } from "@/types";
import { toast } from "sonner";
import { format, parse, parseISO, isAfter, isValid } from "date-fns";
import { BASE_URL } from "@/config/api";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Plane, Briefcase, Shirt, User } from "lucide-react";

const TOPPER_PAGE_SIZE = 10;
const LOCATION_PAGE_SIZE = 15;
const PAGE_SIZE = 50;
type SortDirection = "desc" | "asc";

const parseAnyDate = (raw?: string | number | Date): Date => {
  if (!raw) return new Date(0);
  if (raw instanceof Date) return raw;
  if (typeof raw === "number") return new Date(raw);

  const s = String(raw).trim();

  try {
    const d = parse(s, "dd-MM-yyyy HH:mm:ss", new Date());
    if (!isNaN(d.getTime())) return d;
  } catch { }

  try {
    const d = parseISO(s);
    if (!isNaN(d.getTime())) return d;
  } catch { }

  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

// Helper function to create November 10th date for current year
const getNovember10thDate = (): Date => {
  const currentYear = new Date().getFullYear();
  return new Date(currentYear, 10, 10); // Month is 0-indexed, so 10 = November
};

const Index: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({
    start: format(getNovember10thDate(), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });
  const [dateError, setDateError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [couponFilter, setCouponFilter] = useState<"all" | "with" | "without">("all");

  const [couponSearchCode, setCouponSearchCode] = useState("");
  const [couponSearchTrigger, setCouponSearchTrigger] = useState("");
  const [hasSearchedCoupon, setHasSearchedCoupon] = useState(false);

  const [couponUsersOpen, setCouponUsersOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState("");

  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [mounted, setMounted] = useState(false);

  const [totalAgents, setTotalAgents] = useState(0);
  const [agentsLoading, setAgentsLoading] = useState(true);

  const [topperModalOpen, setTopperModalOpen] = useState(false);
  const [selectedTopperTier, setSelectedTopperTier] = useState<
    "50" | "25" | "10" | "1-9" | null
  >(null);

  // New state for topper data independent of date filter
  const [allTopperData, setAllTopperData] = useState<any[]>([]);

  // New state for all transactions (for Navbar)
  const [allTransactionsData, setAllTransactionsData] = useState<any[]>([]);

  const [locationPage, setLocationPage] = useState(1);
  useEffect(() => {
    setLocationPage(1);
  }, [allTopperData]);

  // Fetch all data for topper dashboard (independent of date filter)
  useEffect(() => {
    const fetchAllTopperData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/transactions?limit=10000`);
        const json = await res.json();
        if (json.success && json.data) {
          setAllTopperData(json.data);
          setAllTransactionsData(json.data); // Also set for Navbar
        }
      } catch (err) {
        console.error("Failed to load topper data");
      }
    };

    fetchAllTopperData();
  }, []);

  // Fetch total agents count
  useEffect(() => {
    const fetchAgentCount = async () => {
      try {
        const res = await fetch(`${BASE_URL}/total-agents/`);
        const json = await res.json();
        if (json.success) {
          setTotalAgents(json.totalAgents);
        }
      } catch (err) {
        console.error("Failed to load agent count");
      } finally {
        setAgentsLoading(false);
      }
    };

    fetchAgentCount();
  }, []);

  const isClientSideMode = true;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset to page 1 on any filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, dateRange, couponFilter]);

  const { data, isLoading, error, refetch, isFetching } = useTransactions({
    page: isClientSideMode ? 1 : page,
    limit: isClientSideMode ? 5000 : PAGE_SIZE,
    dateRange,
    coupon: "",
    sortOrder: sortDirection,
  });

  const {
    data: coupon,
    isLoading: isCouponLoading,
    error: couponError,
    isFetched: couponIsFetched,
  } = useCouponSearch(couponSearchTrigger, couponSearchTrigger.length > 0);

  // Client-side search
  const searchedList = useMemo(() => {
    if (!data?.data || !searchQuery.trim()) return data?.data || [];

    const q = searchQuery.toLowerCase().trim();

    return data.data.filter((t: any) => {
      const phone = String(t.phone ?? t.userPhone ?? "").toLowerCase();
      const userName = String(t.userName ?? t.name ?? "").toLowerCase();
      const amount = String(t.amount ?? "").toLowerCase();
      const agentName = String(t.agentName ?? "").toLowerCase();
      const agentPhone = String(t.agentPhone ?? "").toLowerCase();
      const agentLocation = String(t.agentLocation ?? t.location ?? "").toLowerCase();
      const email = String(t.email ?? "").toLowerCase();

      return (
        phone.includes(q) ||
        userName.includes(q) ||
        amount.includes(q) ||
        agentName.includes(q) ||
        agentPhone.includes(q) ||
        agentLocation.includes(q) ||
        email.includes(q)
      );
    });
  }, [data?.data, searchQuery]);

  const baseList = searchedList;

  const dedupeByUser = (transactions: any[]) => {
    console.log("🔄 Starting dedupeByUser with", transactions.length, "transactions");

    // Group transactions by user
    const userMap = new Map<string, any[]>();

    // First, group all transactions by user
    for (const t of transactions) {
      const mobile = t.phone || t.userPhone || "";
      const email = t.email || t.userEmail || "";
      const key = email || mobile;

      if (!key) {
        continue; // Skip transactions without identifier
      }

      if (!userMap.has(key)) {
        userMap.set(key, []);
      }
      userMap.get(key)!.push(t);
    }

    console.log(`Found ${userMap.size} unique users`);

    // Now, for each user, decide which transactions to keep
    const result: any[] = [];

    userMap.forEach((userTransactions, key) => {
      // Separate success and failed transactions
      const successTx = userTransactions.filter(t => t.paymentStatus === 2);
      const failedTx = userTransactions.filter(t => t.paymentStatus === 3);
      const otherTx = userTransactions.filter(t => ![2, 3].includes(t.paymentStatus));

      // Always keep the latest success (if any)
      if (successTx.length > 0) {
        const latestSuccess = successTx.sort((a, b) => {
          const da = new Date(a.date_ist ?? a.createdAt ?? "").getTime();
          const db = new Date(b.date_ist ?? b.createdAt ?? "").getTime();
          return db - da; // Newest first
        })[0];
        result.push(latestSuccess);
      }

      // Always keep the latest failed (if any)
      if (failedTx.length > 0) {
        const latestFailed = failedTx.sort((a, b) => {
          const da = new Date(a.date_ist ?? a.createdAt ?? "").getTime();
          const db = new Date(b.date_ist ?? b.createdAt ?? "").getTime();
          return db - da; // Newest first
        })[0];
        result.push(latestFailed);
      }

      // Keep other status transactions
      otherTx.forEach(t => result.push(t));

      // Log duplicates found
      const totalForUser = userTransactions.length;
      const keptForUser = (successTx.length > 0 ? 1 : 0) + (failedTx.length > 0 ? 1 : 0) + otherTx.length;
      if (totalForUser > keptForUser) {
        console.log(`User ${key}: ${totalForUser} transactions → ${keptForUser} kept`);
      }
    });

    // Sort final result
    result.sort((a, b) => {
      const da = new Date(a.date_ist ?? a.createdAt ?? "").getTime();
      const db = new Date(b.date_ist ?? b.createdAt ?? "").getTime();
      return sortDirection === "desc" ? db - da : da - db;
    });

    console.log(`✅ Dedupe complete: ${transactions.length} → ${result.length}`);

    return result;
  };

  const filteredTransactions = useMemo(() => {
    console.log("🔍 Starting filteredTransactions calculation");
    console.log("Base list length:", baseList.length);

    let list = [...baseList];

    if (statusFilter !== "all") {
      const targetStatus = statusFilter === "success" ? 2 : 3;
      const beforeFilter = list.length;
      list = list.filter((t: any) => t.paymentStatus === targetStatus);
      console.log(`Status filter "${statusFilter}" (${targetStatus}): ${beforeFilter} → ${list.length}`);
    }

    if (couponFilter !== "all") {
      const hasCoupon = (t: any) => {
        const code = t.couponText || t.coupon_code || t.coupon || "";
        return code && code.trim() !== "" && code.toUpperCase() !== "N/A";
      };
      const beforeFilter = list.length;
      list = list.filter((t: any) =>
        couponFilter === "with" ? hasCoupon(t) : !hasCoupon(t)
      );
      console.log(`Coupon filter "${couponFilter}": ${beforeFilter} → ${list.length}`);
    }

    // Sort by date
    list.sort((a: any, b: any) => {
      const da = new Date(a.date_ist ?? a.createdAt ?? "").getTime();
      const db = new Date(b.date_ist ?? b.createdAt ?? "").getTime();
      return sortDirection === "desc" ? db - da : da - db;
    });

    console.log("List before dedupe:", list.length);

    // ALWAYS dedupe, regardless of status filter
    const dedupedList = dedupeByUser(list);
    console.log("List after dedupe:", dedupedList.length);

    return dedupedList;
  }, [baseList, statusFilter, couponFilter, sortDirection]);

  // Also update the transactionStats to count deduped totals
  const transactionStats = useMemo(() => {
    console.log("📊 Calculating transaction stats");

    if (!allTransactionsData || allTransactionsData.length === 0) {
      return {
        total: 0,
        success: 0,
        failed: 0
      };
    }

    // Use the same deduplication logic for consistent counts
    const dedupedTransactions = dedupeByUser(allTransactionsData);

    let successCount = 0;
    let failedCount = 0;

    dedupedTransactions.forEach((transaction: any) => {
      const status = transaction.paymentStatus;
      if (status === 2) {
        successCount++;
      } else if (status === 3) {
        failedCount++;
      }
    });

    console.log(`Transaction stats - Total: ${dedupedTransactions.length}, Success: ${successCount}, Failed: ${failedCount}`);

    return {
      total: dedupedTransactions.length, // Use deduped count for consistency
      success: successCount,
      failed: failedCount
    };
  }, [allTransactionsData]);

  // FIXED: Get transactions for current page with S.No
  const displayedTransactions = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredTransactions
      .slice(startIndex, startIndex + PAGE_SIZE)
      .map((transaction, index) => ({
        ...transaction,
        serialNumber: startIndex + index + 1 // Add serial number
      }));
  }, [filteredTransactions, page]);

  // Pagination
  const totalCount = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  const allFilteredTransactions = data?.data || [];

  const handleCouponSearch = () => {
    if (!couponSearchCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    setHasSearchedCoupon(true);
    setCouponSearchTrigger(couponSearchCode.trim().toUpperCase());
  };

  const handleCouponKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleCouponSearch();
  };

  const handleViewUsersFromSearch = (code: string) => {
    setSelectedCoupon(code);
    setCouponUsersOpen(true);
    // Clear search after opening modal
    setShowCouponDropdown(false);
    setCouponSearchCode("");
    setHasSearchedCoupon(false);
    setCouponSearchTrigger("");
    setCouponModalOpen(false); // Close coupon modal
  };

  const handleCouponClick = (code: string) => {
    setSelectedCoupon(code);
    setCouponUsersOpen(true);
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  if (error) {
    toast.error("Failed to load transactions");
  }

  // Date validation function
  const validateDateRange = (range: DateRange): boolean => {
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);

    if (!isValid(startDate) || !isValid(endDate)) {
      setDateError("Invalid date format");
      return false;
    }

    if (isAfter(startDate, endDate)) {
      return false;
    }

    setDateError(null);
    return true;
  };

  const onDateRangeChange = (range: DateRange) => {
    if (validateDateRange(range)) {
      setDateRange(range);
      setPage(1);
      refetch();
    } else {
      toast.error(dateError || "Invalid date range");
    }
  };

  const locationStats = useMemo(() => {
    const map = new Map<string, number>();

    (allTopperData || []).forEach((t: any) => {
      if (t.paymentStatus !== 2) return;
      if (Number(t.amount) !== 5841) return;

      let location =
        t.agentLocation ||
        t.location ||
        "AGENTS WITHOUT LOCATION";

      location = String(location).trim().toUpperCase();

      if (
        location === "" ||
        location === "N/A" ||
        location === "NA" ||
        location === "NULL" ||
        location === "UNDEFINED"
      ) {
        location = "AGENTS WITHOUT LOCATION";
      }

      map.set(location, (map.get(location) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [allTopperData]);

  const locationTotalPages = Math.max(
    1,
    Math.ceil(locationStats.length / LOCATION_PAGE_SIZE)
  );

  const paginatedLocations = locationStats.slice(
    (locationPage - 1) * LOCATION_PAGE_SIZE,
    locationPage * LOCATION_PAGE_SIZE
  );

  const agentStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        mobile: string;
        location: string;
        count: number;
        coupon: string;
        uniqueUsers: Set<string>;
      }
    >();

    const seenUsers = new Set<string>();

    (allTopperData || []).forEach((t: any) => {
      if (!t.agentName) return;
      if (t.paymentStatus !== 2) return;
      if (Number(t.amount) !== 5841) return;

      const userName = String(t.userName || t.name || "").trim().toLowerCase();
      const userPhone = String(t.phone || t.userPhone || "").trim();
      const userKey = `${userName}|${userPhone}`;

      if (!userName && !userPhone) return;

      const agentKey = t.agentName.trim();

      if (!map.has(agentKey)) {
        map.set(agentKey, {
          name: agentKey,
          mobile: t.agentPhone || "—",
          location: t.agentLocation || t.location || "—",
          count: 0,
          coupon: t.couponText || t.coupon_code || t.coupon || "—",
          uniqueUsers: new Set(),
        });
      }

      const agent = map.get(agentKey)!;

      if (agent.uniqueUsers.has(userKey)) return;

      if (seenUsers.has(userKey)) {
        return;
      }

      agent.uniqueUsers.add(userKey);
      seenUsers.add(userKey);
      agent.count += 1;
    });

    return Array.from(map.values())
      .map(({ uniqueUsers, ...rest }) => rest)
      .sort((a, b) => b.count - a.count);
  }, [allTopperData]);

  const agents50 = agentStats.filter(a => a.count >= 50);
  const agents25 = agentStats.filter(
    a => a.count >= 25 && a.count < 50
  );
  const agents10 = agentStats.filter(
    a => a.count >= 10 && a.count < 25
  );
  const agents1to9 = agentStats.filter(
    a => a.count >= 1 && a.count < 10
  );

  const selectedAgents = useMemo(() => {
    if (selectedTopperTier === "50") return agents50;
    if (selectedTopperTier === "25") return agents25;
    if (selectedTopperTier === "10") return agents10;
    if (selectedTopperTier === "1-9") return agents1to9;
    return [];
  }, [selectedTopperTier, agents50, agents25, agents10, agents1to9]);

  const [topperPage, setTopperPage] = useState(1);
  useEffect(() => {
    if (!topperModalOpen) {
      setTopperPage(1);
    }
  }, [topperModalOpen]);

  useEffect(() => {
    setTopperPage(1);
  }, [selectedTopperTier]);

  const activeToppers =
    selectedTopperTier === "50"
      ? agents50
      : selectedTopperTier === "25"
        ? agents25
        : selectedTopperTier === "10"
          ? agents10
          : selectedTopperTier === "1-9"
            ? agents1to9
            : [];

  const topperTotalPages = Math.max(
    1,
    Math.ceil(activeToppers.length / TOPPER_PAGE_SIZE)
  );

  const paginatedToppers = activeToppers.slice(
    (topperPage - 1) * TOPPER_PAGE_SIZE,
    topperPage * TOPPER_PAGE_SIZE
  );

  const topperExportData = selectedAgents.map(a => ({
    Agent: a.name,
    Subscriptions: a.count,
    Tier: `${selectedTopperTier}+`,
  }));

  const toggleSort = () => {
    const next: SortDirection = sortDirection === "desc" ? "asc" : "desc";
    setSortDirection(next);
    setPage(1);
    refetch();
  };

  const showLoading = isFetching && !isClientSideMode;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const isDefaultDateRange =
    dateRange.start === format(getNovember10thDate(), "yyyy-MM-dd") &&
    dateRange.end === format(new Date(), "yyyy-MM-dd");

  const isValidCoupon = useMemo(() => {
    if (!coupon || !coupon.coupon || couponError || !couponIsFetched) {
      return false;
    }

    const couponCode = coupon.coupon.toUpperCase();
    const existsInAgents = agentStats.some(agent =>
      agent.coupon && agent.coupon.toUpperCase() === couponCode
    );

    return existsInAgents;
  }, [coupon, couponError, couponIsFetched, agentStats]);

  const [showCouponDropdown, setShowCouponDropdown] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);

  const handleCouponButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCouponDropdown(!showCouponDropdown);
    if (!showCouponDropdown) {
      setCouponSearchCode("");
      setHasSearchedCoupon(false);
      setCouponSearchTrigger("");
      setCouponModalOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showCouponDropdown && !target.closest('.coupon-search-container')) {
        setShowCouponDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCouponDropdown]);

  useEffect(() => {
    if (hasSearchedCoupon && couponIsFetched) {
      if (isValidCoupon) {
        setCouponModalOpen(true);
        setShowCouponDropdown(false);
      } else if (coupon && coupon.coupon) {
        setCouponModalOpen(false);
      } else {
        setCouponModalOpen(false);
      }
    }
  }, [coupon, couponIsFetched, hasSearchedCoupon, isValidCoupon]);

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <Navbar
        totalTransactions={data?.total || 0}
        allTransactions={allTransactionsData}
        isLoading={isLoading}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header & Coupon Search */}
          <div className="glass-card rounded-xl p-4 md:p-6 space-y-4">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              🏆 Toppers Dashboard
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* 50+ */}
              <div
                onClick={() => {
                  setSelectedTopperTier("50");
                  setTopperModalOpen(true);
                }}
                className="cursor-pointer stat-card flex flex-col items-center justify-center gap-2 md:gap-3 hover:scale-[1.02] transition p-3 md:p-4"
              >
                <Plane className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                <div className="text-2xl md:text-3xl font-bold">{agents50.length}</div>
                <div className="text-xs md:text-sm text-muted-foreground text-center leading-tight md:leading-normal">
                  Agents with 50+ Subscriptions
                </div>
              </div>

              {/* 25+ */}
              <div
                onClick={() => {
                  setSelectedTopperTier("25");
                  setTopperModalOpen(true);
                }}
                className="cursor-pointer stat-card flex flex-col items-center justify-center gap-2 md:gap-3 hover:scale-[1.02] transition p-3 md:p-4"
              >
                <Briefcase className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                <div className="text-2xl md:text-3xl font-bold">{agents25.length}</div>
                <div className="text-xs md:text-sm text-muted-foreground text-center leading-tight md:leading-normal">
                  Agents with 25+ Subscriptions
                </div>
              </div>

              {/* 10+ */}
              <div
                onClick={() => {
                  setSelectedTopperTier("10");
                  setTopperModalOpen(true);
                }}
                className="cursor-pointer stat-card flex flex-col items-center justify-center gap-2 md:gap-3 hover:scale-[1.02] transition p-3 md:p-4"
              >
                <Shirt className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                <div className="text-2xl md:text-3xl font-bold">{agents10.length}</div>
                <div className="text-xs md:text-sm text-muted-foreground text-center leading-tight md:leading-normal">
                  Agents with 10+ Subscriptions
                </div>
              </div>

              {/* 1-9 Subscriptions */}
              <div
                onClick={() => {
                  setSelectedTopperTier("1-9");
                  setTopperModalOpen(true);
                }}
                className="cursor-pointer stat-card flex flex-col items-center justify-center gap-2 md:gap-3 hover:scale-[1.02] transition p-3 md:p-4"
              >
                <User className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                <div className="text-2xl md:text-3xl font-bold">{agents1to9.length}</div>
                <div className="text-xs md:text-sm text-muted-foreground text-center leading-tight md:leading-normal">
                  Agents with 1-9 Subscriptions
                </div>
              </div>
            </div>
          </div>

          {/* 📍 Location-wise Subscriptions */}
          <div className="glass-card rounded-xl p-4 md:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-lg md:text-xl font-bold">
                📍 Subscriptions by Location
              </h3>
              <span className="text-xs md:text-sm text-muted-foreground">
                Total Locations: {locationStats.length}
              </span>
            </div>

            <div className="table-container overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr className="border-b">
                    <th className="px-2 py-2 md:px-3 md:py-2 text-center w-10 md:w-12">S.No</th>
                    <th className="px-2 py-2 md:px-3 md:py-2 text-center">Location</th>
                    <th className="px-2 py-2 md:px-3 md:py-2 text-center">Subscriptions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedLocations.map((row, idx) => {
                    const serial = (locationPage - 1) * LOCATION_PAGE_SIZE + idx + 1;

                    return (
                      <tr
                        key={row.location}
                        className="border-b last:border-0 hover:bg-muted/40 transition"
                      >
                        <td className="px-2 py-2 md:px-3 md:py-2 text-center text-muted-foreground">
                          {serial}
                        </td>
                        <td className="px-2 py-2 md:px-3 md:py-2 text-center font-medium truncate max-w-[150px] md:max-w-[220px]">
                          {row.location}
                        </td>
                        <td className="px-2 py-2 md:px-3 md:py-2 text-center font-bold text-primary">
                          {row.count}
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedLocations.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center text-muted-foreground py-6 md:py-8"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {locationTotalPages > 1 && (
              <div className="flex justify-center pt-3 md:pt-4">
                <Pagination
                  currentPage={locationPage}
                  totalPages={locationTotalPages}
                  onPageChange={setLocationPage}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                All Transactions
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                Search by Mobile, Name, Amount, or Agent
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
              {/* Total Agents Count */}
              <div className="flex items-center gap-2 text-muted-foreground bg-card px-3 py-2 rounded-lg">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span className="text-sm md:text-base">
                  Total Agents:
                  {agentsLoading ? (
                    <span className="ml-2 inline-block h-4 w-16 md:h-5 md:w-20 shimmer rounded" />
                  ) : (
                    <span className="font-bold text-foreground ml-1 md:ml-2">{totalAgents.toLocaleString()}</span>
                  )}
                </span>
              </div>
              <div className="relative coupon-search-container w-full sm:w-auto">
                <Button
                  variant="glow"
                  className="gap-1 md:gap-2 w-full sm:w-auto py-2 md:py-0"
                  onClick={handleCouponButtonClick}
                >
                  <Tag className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="text-sm md:text-base">Search Coupon</span>
                </Button>

                {/* Dropdown Search Form */}
                {showCouponDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-full sm:w-96 glass-card rounded-lg p-3 md:p-4 shadow-lg z-50 border border-border coupon-dropdown">
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex gap-1 md:gap-2 min-w-0">
                        <Input
                          placeholder="Enter coupon code"
                          value={couponSearchCode}
                          onChange={(e) => {
                            setCouponSearchCode(e.target.value.toUpperCase());
                            setHasSearchedCoupon(false);
                          }}
                          onKeyPress={handleCouponKeyPress}
                          className="font-mono text-sm md:text-lg h-10 md:h-12"
                          autoFocus
                        />
                        <Button
                          onClick={handleCouponSearch}
                          disabled={isCouponLoading}
                          className="h-10 md:h-12 px-3 md:px-6"
                          variant="glow"
                        >
                          {isCouponLoading ? (
                            <div className="h-4 w-4 md:h-5 md:w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                          ) : (
                            <Search className="h-4 w-4 md:h-5 md:w-5" />
                          )}
                        </Button>
                      </div>

                      {isCouponLoading && (
                        <div className="flex justify-center p-2 md:p-4">
                          <div className="h-6 w-6 md:h-8 md:w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                      )}

                      {hasSearchedCoupon && couponIsFetched && !isValidCoupon && (
                        <div className="p-3 md:p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                          <div className="flex items-center gap-2 md:gap-3">
                            <XCircle className="h-4 w-4 md:h-6 md:w-6 text-destructive" />
                            <div>
                              <h4 className="font-semibold text-xs md:text-sm text-destructive mb-1">
                                {coupon && coupon.coupon ? "Invalid Coupon Code" : "Coupon Not Found"}
                              </h4>
                              <p className="text-destructive/80 text-xs">
                                {coupon && coupon.coupon
                                  ? `The coupon code "${couponSearchTrigger}" is not associated with any agent.`
                                  : `The coupon code "${couponSearchTrigger}" was not found.`
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search + Date */}
          <div className="glass-card rounded-xl p-3 md:p-4">
            <div className="flex flex-col lg:flex-row gap-3 md:gap-4 items-start lg:items-center justify-between search-date-container">
              <div className="flex-1 w-full">
                <div className="relative search-input-container">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by mobile, name, amount, agent..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value.trim().toLowerCase());
                      setPage(1);
                    }}
                    className="pl-9 md:pl-11 h-10 md:h-12 text-sm md:text-base font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full lg:w-auto date-picker-container">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={onDateRangeChange}
                />
              </div>
            </div>
          </div>

          {/* Show transactions section when there's a search query OR date filter is changed */}
          {(hasSearchQuery || !isDefaultDateRange) && (
            <>
              {/* Showing X-Y of Z - Only show when we have transactions */}
              {totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs md:text-sm text-muted-foreground text-center sm:text-left">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {rangeStart}-{rangeEnd}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      {totalCount}
                    </span>{" "}
                    transactions
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isFetching}
                      className="h-8 md:h-9 px-2 md:px-3"
                    >
                      <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ${isFetching ? "animate-spin" : ""}`} />
                      <span className="ml-1 md:ml-2 text-xs md:text-sm">Refresh</span>
                    </Button>
                    <ExportButton
                      dateRange={dateRange}
                      searchQuery={searchQuery}
                      filteredTransactions={filteredTransactions}
                    />
                  </div>
                </div>
              )}

              {/* Always show the table component */}
              <TransactionsTable
                transactions={displayedTransactions}
                isLoading={showLoading}
                onCouponClick={handleCouponClick}
                sortDirection={sortDirection}
                onToggleSort={toggleSort}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                couponFilter={couponFilter}
                onCouponFilterChange={setCouponFilter}
              />

              {/* Pagination - only show when we have transactions */}
              {filteredTransactions.length > 0 && totalPages > 1 && (
                <div className="pagination-container">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => {
                      setPage(p);
                      if (!isClientSideMode) {
                        refetch();
                      }
                    }}
                    isLoading={showLoading}
                  />
                </div>
              )}
            </>
          )}

          {/* Topper Modal */}
          {topperModalOpen && (
            <div
              className="modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4"
              onClick={() => setTopperModalOpen(false)}
            >
              {/* Modal */}
              <div
                className="relative bg-card rounded-lg md:rounded-2xl shadow-2xl w-full max-w-2xl md:max-w-3xl max-h-[85vh] md:max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
                  <div className="flex items-center gap-2 md:gap-3">
                    <h2 className="text-lg md:text-2xl font-bold truncate max-w-[200px] md:max-w-none">
                      {selectedTopperTier === "50" && "Agents with 50+ Subs"}
                      {selectedTopperTier === "25" && "Agents with 25+ Subs"}
                      {selectedTopperTier === "10" && "Agents with 10+ Subs"}
                      {selectedTopperTier === "1-9" && "Agents with 1-9 Subs"}
                    </h2>
                    <span className="px-2 py-1 md:px-3 md:py-1 rounded-full bg-white text-black text-sm md:text-lg font-semibold whitespace-nowrap">
                      {activeToppers.length}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTopperModalOpen(false)}
                    className="h-8 w-8 md:h-10 md:w-10"
                  >
                    <X className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>

                {/* Body */}
                <div className="max-h-[calc(85vh-120px)] md:max-h-[420px] overflow-y-auto p-2 md:m-6">
                  <div className="table-container rounded-lg border border-border">
                    <table className="w-full border-collapse text-xs md:text-sm">
                      <thead className="sticky top-0 bg-background z-10">
                        <tr className="border-b">
                          <th className="px-2 py-2 text-left font-semibold w-8 md:w-12">
                            S.No
                          </th>
                          <th className="px-2 py-2 text-left font-semibold">
                            Agent Name
                          </th>
                          <th className="px-2 py-2 text-left font-semibold hidden sm:table-cell">
                            Coupon
                          </th>
                          <th className="px-2 py-2 text-left font-semibold hidden lg:table-cell">
                            Mobile
                          </th>
                          <th className="px-2 py-2 text-left font-semibold hidden md:table-cell">
                            Location
                          </th>
                          <th className="px-2 py-2 text-right font-semibold">
                            Subs
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedToppers.map((agent, idx) => {
                          const serialNumber = (topperPage - 1) * TOPPER_PAGE_SIZE + idx + 1;
                          return (
                            <tr
                              key={idx}
                              className="border-b last:border-0 hover:bg-muted/40 transition"
                            >
                              <td className="px-2 py-2 text-left text-muted-foreground font-medium">
                                {serialNumber}
                              </td>
                              <td className="px-2 py-2 font-medium truncate max-w-[100px] md:max-w-[180px]">
                                {agent.name}
                              </td>
                              <td className="px-2 py-2 font-mono text-muted-foreground hidden sm:table-cell">
                                {agent.coupon}
                              </td>
                              <td className="px-2 py-2 font-mono text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                                {agent.mobile}
                              </td>
                              <td className="px-2 py-2 text-muted-foreground truncate max-w-[100px] md:max-w-[180px] hidden md:table-cell">
                                {agent.location}
                              </td>
                              <td className="px-2 py-2 text-right font-bold text-primary whitespace-nowrap">
                                {agent.count}
                              </td>
                            </tr>
                          );
                        })}

                        {paginatedToppers.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="text-center text-muted-foreground py-6 md:py-8"
                            >
                              No agents found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                {topperTotalPages > 1 && (
                  <div className="flex justify-center p-3 md:p-4 border-t border-border">
                    <Pagination
                      currentPage={topperPage}
                      totalPages={topperTotalPages}
                      onPageChange={setTopperPage}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Coupon Details Modal */}
      {couponModalOpen && (
        <div
          className="modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-2 md:p-4"
          onClick={() => setCouponModalOpen(false)}
        >
          <div
            className="relative bg-card rounded-lg md:rounded-2xl shadow-2xl w-full max-w-md md:max-w-lg max-h-[85vh] md:max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <h2 className="text-lg md:text-xl font-semibold">Coupon Details</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCouponModalOpen(false)}
                className="h-8 w-8 md:h-10 md:w-10"
              >
                <X className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-h-[calc(85vh-120px)] md:max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl gradient-primary flex items-center justify-center text-xl md:text-2xl font-bold text-primary-foreground">
                  {coupon?.coupon?.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-mono text-lg md:text-2xl font-bold">
                    {coupon?.coupon}
                  </h3>
                  <div className="flex flex-wrap gap-1 md:gap-2 mt-1 md:mt-2">
                    <span
                      className={`px-2 py-1 md:px-3 md:py-1 rounded-md text-xs md:text-sm ${coupon?.active
                        ? "bg-success text-foreground"
                        : "bg-destructive text-destructive-foreground"
                        }`}
                    >
                      {coupon?.active ? "Active" : "Inactive"}
                    </span>
                    <span className="px-2 py-1 md:px-3 md:py-1 rounded-md text-xs md:text-sm bg-blue-100 text-blue-800">
                      Found in Agents DB
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <div className="stat-card p-3 md:p-4">
                  <div className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Discount</div>
                  <p className="font-semibold text-xl md:text-2xl">{coupon?.discount}%</p>
                </div>
                <div className="stat-card p-3 md:p-4">
                  <div className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Usage Limit</div>
                  <p className="font-semibold text-xl md:text-2xl">{coupon?.usageLimit}</p>
                </div>
                <div className="stat-card col-span-2 p-3 md:p-4">
                  <div className="text-xs md:text-sm text-muted-foreground mb-1 md:mb-2">Plan</div>
                  <p className="font-semibold text-base md:text-lg">{coupon?.plan || "Unknown Plan"}</p>
                </div>
              </div>

              {coupon?.agent && coupon?.agent.name && (
                <div className="p-3 md:p-4 rounded-lg bg-muted/50 space-y-2 md:space-y-3">
                  <h4 className="font-semibold text-xs md:text-sm text-muted-foreground uppercase tracking-wide">
                    Agent Details
                  </h4>
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Name</div>
                      <div className="text-sm font-medium truncate">{coupon.agent.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Phone</div>
                      <div className="text-sm font-medium truncate">{coupon.agent.phone || "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground">Email</div>
                      <div className="text-sm font-medium truncate">{coupon.agent.email || "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground">Location</div>
                      <div className="text-sm font-medium truncate">{coupon.agent.location || "—"}</div>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => handleViewUsersFromSearch(coupon?.coupon || "")}
                className="w-full py-2 md:py-3 text-sm md:text-base"
                variant="glow"
                disabled={!coupon?.active}
                size="lg"
              >
                {coupon?.active
                  ? "View Users Who Used This Coupon"
                  : "Coupon is Inactive - No Users"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Users Modal */}
      {mounted &&
        createPortal(
          <CouponUsersModal
            open={couponUsersOpen}
            onOpenChange={setCouponUsersOpen}
            couponCode={selectedCoupon}
          />,
          document.body
        )}
    </div>
  );
};

export default Index;