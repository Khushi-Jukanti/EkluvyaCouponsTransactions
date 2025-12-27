// src/pages/Index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Tag, RefreshCw, Users } from "lucide-react";
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
import { format, parse, parseISO, subDays } from "date-fns";
import { BASE_URL } from "@/config/api";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Plane, Briefcase, Shirt } from "lucide-react";

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
    // Set default to November 10th of current year to today
    start: format(getNovember10thDate(), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [couponFilter, setCouponFilter] = useState<"all" | "with" | "without">("all");

  const [couponPopoverOpen, setCouponPopoverOpen] = useState(false);
  const [couponSearchCode, setCouponSearchCode] = useState("");
  const [couponSearchTrigger, setCouponSearchTrigger] = useState("");

  const [couponUsersOpen, setCouponUsersOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState("");

  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [mounted, setMounted] = useState(false);

  const [totalAgents, setTotalAgents] = useState(0);
  const [agentsLoading, setAgentsLoading] = useState(true);

  const [topperModalOpen, setTopperModalOpen] = useState(false);
  const [selectedTopperTier, setSelectedTopperTier] = useState<
    "50" | "25" | "10" | null
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

  useEffect(() => {
    if (!couponPopoverOpen) {
      setCouponSearchCode("");
      setCouponSearchTrigger("");
    }
  }, [couponPopoverOpen]);

  // Reset to page 1 on any filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, dateRange]);

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
    const map = new Map<string, any>();
    for (const t of transactions) {
      const mobile = t.phone || t.userPhone || "";
      const email = t.email || t.userEmail || "";
      const key = mobile || email;
      if (!key) continue;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, t);
      } else {
        // keep latest transaction
        const prevTime = new Date(
          existing.date_ist || existing.createdAt
        ).getTime();

        const currTime = new Date(
          t.date_ist || t.createdAt
        ).getTime();

        if (currTime > prevTime) {
          map.set(key, t);
        }
      }
    }
    return Array.from(map.values());
  };

  const filteredTransactions = useMemo(() => {
    let list = [...baseList];

    if (statusFilter !== "all") {
      const targetStatus = statusFilter === "success" ? 2 : 3;
      list = list.filter((t: any) => t.paymentStatus === targetStatus);
    }

    if (couponFilter !== "all") {
      const hasCoupon = (t: any) => {
        const code = t.couponText || t.coupon_code || t.coupon || "";
        return code && code.trim() !== "" && code.toUpperCase() !== "N/A";
      };
      list = list.filter((t: any) =>
        couponFilter === "with" ? hasCoupon(t) : !hasCoupon(t)
      );
    }

    list.sort((a: any, b: any) => {
      const da = new Date(a.date_ist ?? a.createdAt ?? "").getTime();
      const db = new Date(b.date_ist ?? b.createdAt ?? "").getTime();
      return sortDirection === "desc" ? db - da : da - db;
    });

    return dedupeByUser(list);
  }, [baseList, statusFilter, couponFilter, sortDirection]);

  // Pagination
  const totalCount = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const displayedTransactions = filteredTransactions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  const allFilteredTransactions = data?.data || [];

  const handleCouponSearch = () => {
    if (!couponSearchCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    setCouponSearchTrigger(couponSearchCode.trim().toUpperCase());
  };

  const handleCouponKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleCouponSearch();
  };

  const handleViewUsersFromSearch = (code: string) => {
    setSelectedCoupon(code);
    setCouponPopoverOpen(false);
    setCouponUsersOpen(true);
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

  const locationStats = useMemo(() => {
    const map = new Map<string, number>();

    (allTopperData || []).forEach((t: any) => {
      // ✅ Only successful transactions
      if (t.paymentStatus !== 2) return;

      // ✅ Keep same subscription filter
      if (Number(t.amount) !== 5841) return;

      // 🔥 Normalize location
      let location =
        t.agentLocation ||
        t.location ||
        "AGENTS WITHOUT LOCATION";

      // Trim + uppercase
      location = String(location).trim().toUpperCase();

      // Handle N/A, NULL, EMPTY
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

    // 🔥 Sort by count DESC
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
        uniqueUsers: Set<string>; // Track unique users instead of transactions
      }
    >();

    const seenUsers = new Set<string>(); // Global set to track users across all agents

    (allTopperData || []).forEach((t: any) => {
      // ❌ Skip invalid agent
      if (!t.agentName) return;

      // ❌ Skip failed transactions
      if (t.paymentStatus !== 2) return;

      // ❌ Coupon-only filter (5841 amount)
      if (Number(t.amount) !== 5841) return;

      // ✅ Get user identifier (username + mobile)
      const userName = String(t.userName || t.name || "").trim().toLowerCase();
      const userPhone = String(t.phone || t.userPhone || "").trim();
      const userKey = `${userName}|${userPhone}`;

      // Skip if userKey is invalid (no user info)
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

      // ✅ Check if this user has already been counted for ANY agent
      const globalUserKey = `${agentKey}:${userKey}`;

      // ❌ Skip if user already counted for this specific agent
      if (agent.uniqueUsers.has(userKey)) return;

      if (seenUsers.has(userKey)) {
        // User already counted for another agent
        return;
      }

      // ✅ Count this user for the agent
      agent.uniqueUsers.add(userKey);
      seenUsers.add(userKey); // Mark user as counted globally
      agent.count += 1;
    });

    // 🔥 Return sorted list (DESC)
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

  const selectedAgents = useMemo(() => {
    if (selectedTopperTier === "50") return agents50;
    if (selectedTopperTier === "25") return agents25;
    if (selectedTopperTier === "10") return agents10;
    return [];
  }, [selectedTopperTier, agents50, agents25, agents10]);

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
        : agents10;

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

  const onDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setPage(1);
    refetch();
  };

  // Only show loading when actually fetching from server
  const showLoading = isFetching && !isClientSideMode;

  // Check if there's a search query to show transactions
  const hasSearchQuery = searchQuery.trim().length > 0;

  // Check if date range is different from default
  const isDefaultDateRange =
    dateRange.start === format(getNovember10thDate(), "yyyy-MM-dd") &&
    dateRange.end === format(new Date(), "yyyy-MM-dd");

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
          <div className="glass-card rounded-xl p-6 space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">
              🏆 Toppers Dashboard
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 50+ */}
              <div
                onClick={() => {
                  setSelectedTopperTier("50");
                  setTopperModalOpen(true);
                }}
                className="cursor-pointer stat-card flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition"
              >
                <Plane className="h-8 w-8 text-primary" />
                <div className="text-3xl font-bold">{agents50.length}</div>
                <div className="text-sm text-muted-foreground text-center">
                  Agents with 50+ Subscriptions
                </div>
              </div>

              {/* 25+ */}
              <div
                onClick={() => {
                  setSelectedTopperTier("25");
                  setTopperModalOpen(true);
                }}
                className="cursor-pointer stat-card flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition"
              >
                <Briefcase className="h-8 w-8 text-primary" />
                <div className="text-3xl font-bold">{agents25.length}</div>
                <div className="text-sm text-muted-foreground text-center">
                  Agents with 25+ Subscriptions
                </div>
              </div>

              {/* 10+ */}
              <div
                onClick={() => {
                  setSelectedTopperTier("10");
                  setTopperModalOpen(true);
                }}
                className="cursor-pointer stat-card flex flex-col items-center justify-center gap-3 hover:scale-[1.02] transition"
              >
                <Shirt className="h-8 w-8 text-primary" />
                <div className="text-3xl font-bold">{agents10.length}</div>
                <div className="text-sm text-muted-foreground text-center">
                  Agents with 10+ Subscriptions
                </div>
              </div>
            </div>
          </div>

          {/* 📍 Location-wise Subscriptions */}
          <div className="glass-card rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">
                📍 Subscriptions by Location
              </h3>
              <span className="text-sm text-muted-foreground">
                Total Locations: {locationStats.length}
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted sticky top-0 z-10">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-center w-12">S.No</th>
                    <th className="px-3 py-2 text-center">Location</th>
                    <th className="px-3 py-2 text-center">Subscriptions</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedLocations.map((row, idx) => {
                    const serial =
                      (locationPage - 1) * LOCATION_PAGE_SIZE + idx + 1;

                    return (
                      <tr
                        key={row.location}
                        className="border-b last:border-0 hover:bg-muted/40 transition"
                      >
                        <td className="px-3 py-2 text-center text-muted-foreground">
                          {serial}
                        </td>
                        <td className="px-3 py-2 text-center font-medium truncate max-w-[220px]">
                          {row.location}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-primary">
                          {row.count}
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedLocations.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="text-center text-muted-foreground py-8"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {locationTotalPages > 1 && (
              <div className="flex justify-center pt-4">
                <Pagination
                  currentPage={locationPage}
                  totalPages={locationTotalPages}
                  onPageChange={setLocationPage}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                All Transactions
              </h2>
              <p className="text-muted-foreground">
                Search by Mobile, Name, Amount, or Agent
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Total Agents Count */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-large">
                  Total Agents:
                  {agentsLoading ? (
                    <span className="ml-2 inline-block h-5 w-20 shimmer rounded" />
                  ) : (
                    <span className="font-bold text-foreground ml-2">{totalAgents.toLocaleString()}</span>
                  )}
                </span>
              </div>
              <Popover open={couponPopoverOpen} onOpenChange={setCouponPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="glow" className="gap-2">
                    <Tag className="h-4 w-4" />
                    Search Coupon
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  side="bottom"
                  align="end"
                  className="w-[540px] p-4 glass-card-elevated border-border/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-semibold flex items-center gap-2">
                      <Search className="h-5 w-5 text-primary" />
                      Search Coupon Code
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCouponPopoverOpen(false)}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="space-y-6">
                    <div className="flex gap-2 min-w-0">
                      <Input
                        placeholder="Enter coupon code (e.g., ARAM8893)"
                        value={couponSearchCode}
                        onChange={(e) => setCouponSearchCode(e.target.value.toUpperCase())}
                        onKeyPress={handleCouponKeyPress}
                        className="font-mono text-lg h-12"
                      />
                      <Button
                        onClick={handleCouponSearch}
                        disabled={isCouponLoading}
                        className="h-12 px-6"
                        variant="glow"
                      >
                        {isCouponLoading ? (
                          <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                          <Search className="h-5 w-5" />
                        )}
                      </Button>
                    </div>

                    {couponError && couponIsFetched && (
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-center">
                        Coupon not found or inactive
                      </div>
                    )}

                    {coupon && (
                      <div className="space-y-4 animate-slide-up">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                            {coupon.coupon.substring(0, 2)}
                          </div>
                          <div>
                            <h3 className="font-mono text-xl font-bold">
                              {coupon.coupon}
                            </h3>
                            <div className={`inline-flex items-center gap-2`}>
                              <span
                                className={`px-2 py-1 rounded-md text-sm ${coupon.active
                                  ? "bg-success text-foreground"
                                  : "bg-destructive text-destructive-foreground"
                                  }`}
                              >
                                {coupon.active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="stat-card">
                            <div className="text-xs text-muted-foreground mb-1">Discount</div>
                            <p className="font-semibold text-lg">{coupon.discount}%</p>
                          </div>
                          <div className="stat-card">
                            <div className="text-xs text-muted-foreground mb-1">Usage Limit</div>
                            <p className="font-semibold text-lg">{coupon.usageLimit}</p>
                          </div>
                          <div className="stat-card col-span-2">
                            <div className="text-xs text-muted-foreground mb-1">Plan</div>
                            <p className="font-semibold">{coupon.plan}</p>
                          </div>
                        </div>

                        {coupon.agent && (
                          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                              Agent Details
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-sm">{coupon.agent.name}</div>
                              <div className="text-sm">{coupon.agent.phone}</div>
                              <div className="text-sm truncate">{coupon.agent.email}</div>
                              <div className="text-sm">{coupon.agent.location}</div>
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => handleViewUsersFromSearch(coupon.coupon)}
                          className="w-full"
                          variant="glow"
                        >
                          View All Users Who Used This Coupon
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Search + Date */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search by mobile, name, amount, agent..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value.trim().toLowerCase());
                      setPage(1);
                    }}
                    className="pl-11 h-12 text-base font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
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
              {/* Showing X-Y of Z */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
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
                  >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <ExportButton
                    dateRange={dateRange}
                    searchQuery={searchQuery}
                    filteredTransactions={filteredTransactions}
                  />
                </div>
              </div>

              {/* Table - Show empty state if no transactions */}
              {filteredTransactions.length > 0 ? (
                <>
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

                  {/* Pagination */}
                  {totalPages > 1 && (
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
                  )}
                </>
              ) : (
                <div className="glass-card rounded-xl p-12 text-center">
                  <div className="text-4xl mb-4">📭</div>
                  <h3 className="text-xl font-semibold mb-2">No transactions found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search query or date range
                  </p>
                </div>
              )}
            </>
          )}

          {topperModalOpen && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              onClick={() => setTopperModalOpen(false)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/70" />

              {/* Modal */}
              <div
                className="relative bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">
                      {selectedTopperTier === "50" && "Agents with 50+ Subscriptions"}
                      {selectedTopperTier === "25" && "Agents with 25+ Subscriptions"}
                      {selectedTopperTier === "10" && "Agents with 10+ Subscriptions"}
                    </h2>

                    <span className="px-3 py-1 rounded-full bg-white text-black text-lg font-semibold">
                      {activeToppers.length}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTopperModalOpen(false)}
                  >
                    ✕
                  </Button>
                </div>

                {/* Body */}
                <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border m-6">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b">
                        {/* Added S.No column */}
                        <th className="px-2 py-2 text-left font-semibold w-12">
                          S.No
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">
                          Agent Name
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">
                          Coupon
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">
                          Mobile
                        </th>
                        <th className="px-2 py-2 text-left font-semibold">
                          Location
                        </th>
                        <th className="px-2 py-2 text-right font-semibold">
                          Subs
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedToppers.map((agent, idx) => {
                        // Calculate actual serial number based on page
                        const serialNumber = (topperPage - 1) * TOPPER_PAGE_SIZE + idx + 1;

                        return (
                          <tr
                            key={idx}
                            className="border-b last:border-0 hover:bg-muted/40 transition"
                          >
                            {/* S.No cell */}
                            <td className="px-3 py-2 text-left text-muted-foreground font-medium">
                              {serialNumber}
                            </td>
                            <td className="px-3 py-2 font-medium truncate max-w-[180px]">
                              {agent.name}
                            </td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">
                              {agent.coupon}
                            </td>
                            <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                              {agent.mobile}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground truncate max-w-[180px]">
                              {agent.location}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-primary whitespace-nowrap">
                              {agent.count}
                            </td>
                          </tr>
                        );
                      })}

                      {paginatedToppers.length === 0 && (
                        <tr>
                          <td
                            colSpan={6} // Updated colSpan to 6 for new column
                            className="text-center text-muted-foreground py-8"
                          >
                            No agents found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {topperTotalPages > 1 && (
                  <div className="flex justify-center p-4 border-t border-border">
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

      {/* Coupon modal portal */}
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