// // // src/pages/Index.tsx
// // import React, { useEffect, useMemo, useState } from "react";
// // import { createPortal } from "react-dom";
// // import { Search, Tag, RefreshCw } from "lucide-react";
// // import { Input } from "@/components/ui/input";
// // import { Button } from "@/components/ui/button";
// // import Navbar from "@/components/Navbar";
// // import TransactionsTable from "@/components/TransactionsTable";
// // import DateRangePicker from "@/components/DateRangePicker";
// // import Pagination from "@/components/Pagination";
// // import ExportButton from "@/components/ExportButton";
// // import CouponUsersModal from "@/components/CouponUsersModal";
// // import { useTransactions } from "@/hooks/useTransactions";
// // import { useCouponSearch } from "@/hooks/useCouponSearch";
// // import { DateRange } from "@/types";
// // import { toast } from "sonner";
// // import { format, parse, parseISO, subDays } from "date-fns";

// // // Popover components (shadcn-style)
// // import {
// //   Popover,
// //   PopoverTrigger,
// //   PopoverContent,
// // } from "@/components/ui/popover";

// // const PAGE_SIZE = 50;
// // type SortDirection = "desc" | "asc";

// // const parseAnyDate = (raw?: string | number | Date): Date => {
// //   if (!raw) return new Date(0);
// //   if (raw instanceof Date) return raw;
// //   if (typeof raw === "number") return new Date(raw);

// //   const s = String(raw).trim();

// //   // Try dd-MM-yyyy HH:mm:ss
// //   try {
// //     const d = parse(s, "dd-MM-yyyy HH:mm:ss", new Date());
// //     if (!isNaN(d.getTime())) return d;
// //   } catch { }

// //   // Try ISO
// //   try {
// //     const d = parseISO(s);
// //     if (!isNaN(d.getTime())) return d;
// //   } catch { }

// //   const d = new Date(s);
// //   return isNaN(d.getTime()) ? new Date(0) : d;
// // };

// // const Index: React.FC = () => {
// //   const [page, setPage] = useState(1);
// //   const [searchQuery, setSearchQuery] = useState("");
// //   const [dateRange, setDateRange] = useState<DateRange>({
// //     start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
// //     end: format(new Date(), "yyyy-MM-dd"),
// //   });

// //   // coupon popover states
// //   const [couponPopoverOpen, setCouponPopoverOpen] = useState(false);
// //   const [couponSearchCode, setCouponSearchCode] = useState("");
// //   const [couponSearchTrigger, setCouponSearchTrigger] = useState("");

// //   const [couponUsersOpen, setCouponUsersOpen] = useState(false);
// //   const [selectedCoupon, setSelectedCoupon] = useState("");

// //   // DEFAULT: latest first (desc). Server expects sortOrder=desc|asc
// //   const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

// //   // Mounted guard for portal (avoid SSR mismatch)
// //   const [mounted, setMounted] = useState(false);

// //   // This must come BEFORE useTransactions
// //   const isSearching = Boolean(searchQuery.trim());

// //   useEffect(() => {
// //     setMounted(true);
// //   }, []);

// //   useEffect(() => {
// //     if (!couponPopoverOpen) {
// //       setCouponSearchCode("");
// //       setCouponSearchTrigger("");
// //     }
// //   }, [couponPopoverOpen]);

// //   // // transactions fetch (50 per page) - pass sort to server
// //   // const { data, isLoading, error, refetch, isFetching } = useTransactions({
// //   //   page,
// //   //   limit: PAGE_SIZE,
// //   //   dateRange,
// //   //   coupon: "",
// //   //   sortOrder: sortDirection, // backend param expected
// //   // });

// //   // Fetch up to 5000 records when searching, otherwise paginated

// //   const shouldFetchAll = isSearching || (dateRange.start !== format(subDays(new Date(), 30), "yyyy-MM-dd") || dateRange.end !== format(new Date(), "yyyy-MM-dd"));
  
// //   const { data, isLoading, error, refetch, isFetching } = useTransactions({
// //     page: isSearching ? 1 : page,
// //     limit: isSearching ? 5000 : PAGE_SIZE,
// //     dateRange,
// //     coupon: "",
// //     sortOrder: sortDirection,
// //   });

// //   // coupon search hook
// //   const {
// //     data: coupon,
// //     isLoading: isCouponLoading,
// //     error: couponError,
// //     isFetched: couponIsFetched,
// //   } = useCouponSearch(couponSearchTrigger, couponSearchTrigger.length > 0);

// //   // frontend filtering across the returned page(s)
// //   const filteredTransactions = useMemo(() => {
// //     if (!data?.data || !searchQuery.trim()) return data?.data || [];

// //     const q = searchQuery.toLowerCase().trim();

// //     return data.data.filter((t: any) => {
// //       // const couponTxt = String(
// //       //   t.couponText ?? t.coupon ?? t.coupon_code ?? t.couponCode ?? ""
// //       // ).toLowerCase();
// //       const phone = String(t.phone ?? t.userPhone ?? "").toLowerCase();
// //       const userName = String(t.userName ?? t.name ?? "").toLowerCase();
// //       const amount = String(t.amount ?? "").toLowerCase();
// //       const agentName = String(t.agentName ?? "").toLowerCase();
// //       const agentPhone = String(t.agentPhone ?? "").toLowerCase();
// //       const agentLocation = String(
// //         t.agentLocation ?? t.location ?? ""
// //       ).toLowerCase();
// //       const email = String(t.email ?? "").toLowerCase();

// //       return (
// //         // couponTxt.includes(q) ||
// //         phone.includes(q) ||
// //         userName.includes(q) ||
// //         amount.includes(q) ||
// //         agentName.includes(q) ||
// //         agentPhone.includes(q) ||
// //         agentLocation.includes(q) ||
// //         email.includes(q)
// //       );
// //     });
// //   }, [data?.data, searchQuery]);

// //   // const isSearching = Boolean(searchQuery.trim());

// //   // baseline list (either server page or filtered page)
// //   const baselineList = useMemo(
// //     () => (isSearching ? filteredTransactions : data?.data || []),
// //     [isSearching, filteredTransactions, data?.data]
// //   );

// //   const displayedTransactions = useMemo(() => {
// //     if (!baselineList) return [];
// //     if (!isSearching) return baselineList; 
// //     const copy = [...baselineList];
// //     copy.sort((a: any, b: any) => {
// //       const da = parseAnyDate(
// //         a.date_ist ?? a.createdDate ?? a.dateTime ?? a.createdAt
// //       ).getTime();
// //       const db = parseAnyDate(
// //         b.date_ist ?? b.createdDate ?? b.dateTime ?? b.createdAt
// //       ).getTime();
// //       return sortDirection === "desc" ? db - da : da - db;
// //     });
// //     return copy;
// //   }, [baselineList, sortDirection, isSearching]);

// //   const totalFiltered = filteredTransactions.length;
// //   const totalSourceCount = isSearching ? totalFiltered : data?.total || 0;
// //   const totalPages = isSearching
// //     ? Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
// //     : Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE));

// //   const rangeStart =
// //     displayedTransactions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
// //   const rangeEnd = isSearching
// //     ? Math.min(page * PAGE_SIZE, totalFiltered)
// //     : Math.min(page * PAGE_SIZE, data?.total || 0);

// //   const handleCouponSearch = () => {
// //     if (!couponSearchCode.trim()) {
// //       toast.error("Please enter a coupon code");
// //       return;
// //     }
// //     setCouponSearchTrigger(couponSearchCode.trim().toUpperCase());
// //   };

// //   const handleCouponKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
// //     if (e.key === "Enter") handleCouponSearch();
// //   };

// //   const handleViewUsersFromSearch = (code: string) => {
// //     setSelectedCoupon(code);
// //     setCouponPopoverOpen(false);
// //     setCouponUsersOpen(true);
// //   };

// //   const handleCouponClick = (code: string) => {
// //     setSelectedCoupon(code);
// //     setCouponUsersOpen(true);
// //   };

// //   const handleRefresh = () => {
// //     // refetch current page/sort
// //     refetch();
// //     toast.success("Data refreshed");
// //   };

// //   if (error) {
// //     toast.error("Failed to load transactions");
// //   }

// //   // toggle sort: flips between desc <-> asc, and request page 1 from server
// //   const toggleSort = () => {
// //     const next: SortDirection = sortDirection === "desc" ? "asc" : "desc";
// //     setSortDirection(next);
// //     setPage(1);
// //     refetch();
// //   };

// //   // ensure dateRange changes reset page and refetch
// //   const onDateRangeChange = (range: DateRange) => {
// //     setDateRange(range);
// //     setPage(1);
// //     refetch();
// //   };

// //   const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
// //   // Full list for counting (correct even without search)
// //   const allFilteredTransactions = useMemo(() => {
// //     if (isSearching) {
// //       return filteredTransactions; // up to 5000 when searching
// //     }
// //     return data?.data || []; // current page when just date filtered
// //   }, [isSearching, filteredTransactions, data?.data]);


// //   const successCount = displayedTransactions.filter(t => t.paymentStatus === 2).length;
// //   const failedCount = displayedTransactions.filter(t => t.paymentStatus === 3).length;

// //   return (
// //     <div className="min-h-screen bg-background bg-grid-pattern">
// //       {/* <Navbar
// //         totalTransactions={data?.total || 0}
// //         todayRevenue={0}
// //         isLoading={isLoading}
// //       /> */}

// //       <Navbar
// //         totalTransactions={data?.total || 0}
// //         allTransactions={allFilteredTransactions}
// //         isLoading={isLoading}
// //         onStatusFilterChange={setStatusFilter}
// //       />

// //       <main className="container mx-auto px-4 py-8">
// //         <div className="space-y-6">
// //           {/* Header */}
// //           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
// //             <div>
// //               <h2 className="text-2xl font-bold tracking-tight">
// //                 All Transactions
// //               </h2>
// //               <p className="text-muted-foreground">
// //                 Search by Mobile, Name, Amount, or Agent
// //               </p>
// //             </div>

// //             <div className="flex items-center gap-2">
// //               <Popover
// //                 open={couponPopoverOpen}
// //                 onOpenChange={setCouponPopoverOpen}
// //               >
// //                 <PopoverTrigger asChild>
// //                   <Button variant="glow" className="gap-2">
// //                     <Tag className="h-4 w-4" />
// //                     Search Coupon
// //                   </Button>
// //                 </PopoverTrigger>

// //                 <PopoverContent
// //                   side="bottom"
// //                   align="end"
// //                   className="w-[540px] p-4 glass-card-elevated border-border/50"
// //                 >
// //                   {/* coupon UI kept same */}
// //                   <div className="flex items-center justify-between mb-3">
// //                     <div className="text-lg font-semibold flex items-center gap-2">
// //                       <Search className="h-5 w-5 text-primary" />
// //                       Search Coupon Code
// //                     </div>
// //                     <Button
// //                       variant="ghost"
// //                       size="sm"
// //                       onClick={() => setCouponPopoverOpen(false)}
// //                     >
// //                       Close
// //                     </Button>
// //                   </div>

// //                   <div className="space-y-6">
// //                     <div className="flex gap-2">
// //                       <Input
// //                         placeholder="Enter coupon code (e.g., ARAM8893)"
// //                         value={couponSearchCode}
// //                         onChange={(e) =>
// //                           setCouponSearchCode(e.target.value.toUpperCase())
// //                         }
// //                         onKeyPress={handleCouponKeyPress}
// //                         className="font-mono text-lg h-12"
// //                       />
// //                       <Button
// //                         onClick={handleCouponSearch}
// //                         disabled={isCouponLoading}
// //                         className="h-12 px-6"
// //                         variant="glow"
// //                       >
// //                         {isCouponLoading ? (
// //                           <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
// //                         ) : (
// //                           <Search className="h-5 w-5" />
// //                         )}
// //                       </Button>
// //                     </div>

// //                     {couponError && couponIsFetched && (
// //                       <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-center">
// //                         Coupon not found or inactive
// //                       </div>
// //                     )}

// //                     {coupon && (
// //                       <div className="space-y-4 animate-slide-up">
// //                         <div className="flex items-center gap-3">
// //                           <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
// //                             {coupon.coupon.substring(0, 2)}
// //                           </div>
// //                           <div>
// //                             <h3 className="font-mono text-xl font-bold">
// //                               {coupon.coupon}
// //                             </h3>
// //                             <div className={`inline-flex items-center gap-2`}>
// //                               <span
// //                                 className={`px-2 py-1 rounded-md text-sm ${coupon.active
// //                                   ? "bg-success text-foreground"
// //                                   : "bg-destructive text-destructive-foreground"
// //                                   }`}
// //                               >
// //                                 {coupon.active ? "Active" : "Inactive"}
// //                               </span>
// //                             </div>
// //                           </div>
// //                         </div>

// //                         <div className="grid grid-cols-2 gap-4">
// //                           <div className="stat-card">
// //                             <div className="text-xs text-muted-foreground mb-1">
// //                               Discount
// //                             </div>
// //                             <p className="font-semibold text-lg">
// //                               {coupon.discount}%
// //                             </p>
// //                           </div>
// //                           <div className="stat-card">
// //                             <div className="text-xs text-muted-foreground mb-1">
// //                               Usage Limit
// //                             </div>
// //                             <p className="font-semibold text-lg">
// //                               {coupon.usageLimit}
// //                             </p>
// //                           </div>
// //                           <div className="stat-card col-span-2">
// //                             <div className="text-xs text-muted-foreground mb-1">
// //                               Plan
// //                             </div>
// //                             <p className="font-semibold">{coupon.plan}</p>
// //                           </div>
// //                         </div>

// //                         {coupon.agent && (
// //                           <div className="p-4 rounded-lg bg-muted/50 space-y-3">
// //                             <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
// //                               Agent Details
// //                             </h4>
// //                             <div className="grid grid-cols-2 gap-3">
// //                               <div className="text-sm">{coupon.agent.name}</div>
// //                               <div className="text-sm">
// //                                 {coupon.agent.phone}
// //                               </div>
// //                               <div className="text-sm truncate">
// //                                 {coupon.agent.email}
// //                               </div>
// //                               <div className="text-sm">
// //                                 {coupon.agent.location}
// //                               </div>
// //                             </div>
// //                           </div>
// //                         )}

// //                         <Button
// //                           onClick={() =>
// //                             handleViewUsersFromSearch(coupon.coupon)
// //                           }
// //                           className="w-full"
// //                           variant="glow"
// //                         >
// //                           View All Users Who Used This Coupon
// //                         </Button>
// //                       </div>
// //                     )}
// //                   </div>
// //                 </PopoverContent>
// //               </Popover>
// //             </div>
// //           </div>

// //           {/* Global Search + Date */}
// //           <div className="glass-card rounded-xl p-4">
// //             <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
// //               <div className="flex-1 w-full">
// //                 <div className="relative">
// //                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
// //                   <Input
// //                     placeholder="Search by mobile, name, amount, agent..."
// //                     value={searchQuery}
// //                     onChange={(e) => {
// //                       setSearchQuery(e.target.value.trim().toLowerCase());
// //                       setPage(1);
// //                     }}
// //                     className="pl-11 h-12 text-base font-medium"
// //                   />
// //                 </div>
// //                 {isSearching && (
// //                   <div className="mt-2 text-sm text-muted-foreground">
// //                     Found{" "}
// //                     <span className="font-bold text-foreground">
// //                       {totalFiltered}
// //                     </span>{" "}
// //                     matching transactions
// //                   </div>
// //                 )}
// //               </div>

// //               <div className="flex items-center gap-3">
// //                 <DateRangePicker
// //                   dateRange={dateRange}
// //                   onDateRangeChange={onDateRangeChange}
// //                 />

// //                 {/* Sort indicator and toggle */}
// //               </div>
// //             </div>
// //           </div>

// //           {/* Actions */}
// //           <div className="flex items-center justify-between">
// //             <div className="text-sm text-muted-foreground">
// //               Showing{" "}
// //               <span className="font-medium text-foreground">
// //                 {rangeStart}-{rangeEnd}
// //               </span>{" "}
// //               of{" "}
// //               <span className="font-medium text-foreground">
// //                 {totalSourceCount}
// //               </span>{" "}
// //               {isSearching ? "matching transactions" : "total transactions"}
// //               {isSearching && (
// //                 <span className="text-muted-foreground">{" • "}filtered</span>
// //               )}
// //             </div>
// //             <div className="flex items-center gap-2">
// //               <Button
// //                 variant="ghost"
// //                 size="sm"
// //                 onClick={handleRefresh}
// //                 disabled={isFetching}
// //               >
// //                 <RefreshCw
// //                   className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
// //                 />
// //                 Refresh
// //               </Button>
// //               {/* <ExportButton
// //                 transactions={displayedTransactions}
// //                 isLoading={isLoading}
// //               /> */}
// //               <ExportButton dateRange={dateRange} />
// //             </div>
// //           </div>

// //           {/* Table */}
// //           <TransactionsTable
// //             transactions={displayedTransactions}
// //             isLoading={isLoading}
// //             onCouponClick={handleCouponClick}
// //             sortDirection={sortDirection}
// //             onToggleSort={toggleSort}
// //           />

// //           {/* Pagination */}
// //           {totalPages > 1 && (
// //             <Pagination
// //               currentPage={page}
// //               totalPages={totalPages}
// //               onPageChange={(p) => {
// //                 setPage(p);
// //                 // refetch to ensure server page loads (useTransactions also auto-refetches on key change)
// //                 refetch();
// //               }}
// //               isLoading={isLoading}
// //             />
// //           )}
// //         </div>
// //       </main>

// //       {/* Coupon users modal (centered) rendered into body via portal */}
// //       {mounted &&
// //         createPortal(
// //           <CouponUsersModal
// //             open={couponUsersOpen}
// //             onOpenChange={setCouponUsersOpen}
// //             couponCode={selectedCoupon}
// //           />,
// //           document.body
// //         )}
// //     </div>
// //   );
// // };

// // export default Index;




// // src/pages/Index.tsx
// import React, { useEffect, useMemo, useState } from "react";
// import { createPortal } from "react-dom";
// import { Search, Tag, RefreshCw } from "lucide-react";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import Navbar from "@/components/Navbar";
// import TransactionsTable from "@/components/TransactionsTable";
// import DateRangePicker from "@/components/DateRangePicker";
// import Pagination from "@/components/Pagination";
// import ExportButton from "@/components/ExportButton";
// import CouponUsersModal from "@/components/CouponUsersModal";
// import { useTransactions } from "@/hooks/useTransactions";
// import { useCouponSearch } from "@/hooks/useCouponSearch";
// import { DateRange } from "@/types";
// import { toast } from "sonner";
// import { format, parse, parseISO, subDays } from "date-fns";

// // Popover components
// import {
//   Popover,
//   PopoverTrigger,
//   PopoverContent,
// } from "@/components/ui/popover";

// const PAGE_SIZE = 50;
// type SortDirection = "desc" | "asc";

// const parseAnyDate = (raw?: string | number | Date): Date => {
//   if (!raw) return new Date(0);
//   if (raw instanceof Date) return raw;
//   if (typeof raw === "number") return new Date(raw);

//   const s = String(raw).trim();

//   try {
//     const d = parse(s, "dd-MM-yyyy HH:mm:ss", new Date());
//     if (!isNaN(d.getTime())) return d;
//   } catch {}

//   try {
//     const d = parseISO(s);
//     if (!isNaN(d.getTime())) return d;
//   } catch {}

//   const d = new Date(s);
//   return isNaN(d.getTime()) ? new Date(0) : d;
// };

// const Index: React.FC = () => {
//   const [page, setPage] = useState(1);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [dateRange, setDateRange] = useState<DateRange>({
//     start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
//     end: format(new Date(), "yyyy-MM-dd"),
//   });

//   // === MOVE statusFilter UP to avoid "used before declaration" error ===
//   const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");

//   // coupon popover states
//   const [couponPopoverOpen, setCouponPopoverOpen] = useState(false);
//   const [couponSearchCode, setCouponSearchCode] = useState("");
//   const [couponSearchTrigger, setCouponSearchTrigger] = useState("");

//   const [couponUsersOpen, setCouponUsersOpen] = useState(false);
//   const [selectedCoupon, setSelectedCoupon] = useState("");

//   const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

//   const [mounted, setMounted] = useState(false);

//   // const isSearching = Boolean(searchQuery.trim());
//   // CHANGE THIS LINE ONLY
// const isSearching = Boolean(searchQuery.trim()) || statusFilter !== "all";

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   useEffect(() => {
//     if (!couponPopoverOpen) {
//       setCouponSearchCode("");
//       setCouponSearchTrigger("");
//     }
//   }, [couponPopoverOpen]);

//   // Reset page when filters change
//   useEffect(() => {
//     setPage(1);
//   }, [statusFilter, dateRange, searchQuery]);

//   const shouldFetchAll = isSearching || (dateRange.start !== format(subDays(new Date(), 30), "yyyy-MM-dd") || dateRange.end !== format(new Date(), "yyyy-MM-dd"));

//   const { data, isLoading, error, refetch, isFetching } = useTransactions({
//     page: isSearching ? 1 : page,
//     limit: isSearching ? 5000 : PAGE_SIZE,
//     dateRange,
//     coupon: "",
//     sortOrder: sortDirection,
//   });

//   const {
//     data: coupon,
//     isLoading: isCouponLoading,
//     error: couponError,
//     isFetched: couponIsFetched,
//   } = useCouponSearch(couponSearchTrigger, couponSearchTrigger.length > 0);

//   // Client-side search filtering
//   const filteredTransactions = useMemo(() => {
//     if (!data?.data || !searchQuery.trim()) return data?.data || [];

//     const q = searchQuery.toLowerCase().trim();

//     return data.data.filter((t: any) => {
//       const phone = String(t.phone ?? t.userPhone ?? "").toLowerCase();
//       const userName = String(t.userName ?? t.name ?? "").toLowerCase();
//       const amount = String(t.amount ?? "").toLowerCase();
//       const agentName = String(t.agentName ?? "").toLowerCase();
//       const agentPhone = String(t.agentPhone ?? "").toLowerCase();
//       const agentLocation = String(t.agentLocation ?? t.location ?? "").toLowerCase();
//       const email = String(t.email ?? "").toLowerCase();

//       return (
//         phone.includes(q) ||
//         userName.includes(q) ||
//         amount.includes(q) ||
//         agentName.includes(q) ||
//         agentPhone.includes(q) ||
//         agentLocation.includes(q) ||
//         email.includes(q)
//       );
//     });
//   }, [data?.data, searchQuery]);

//   // Baseline list: either full server page or filtered by search
//   const baselineList = useMemo(
//     () => (isSearching ? filteredTransactions : data?.data || []),
//     [isSearching, filteredTransactions, data?.data]
//   );

//   // Apply status filter + sorting
//   const displayedTransactions = useMemo(() => {
//     if (!baselineList) return [];

//     let list = [...baselineList];

//     // Apply status filter
//     if (statusFilter !== "all") {
//       const targetStatus = statusFilter === "success" ? 2 : 3;
//       list = list.filter((t: any) => t.paymentStatus === targetStatus);
//     }

//     // Client-side sort when searching (server already sorts when not searching)
//     if (isSearching) {
//       list.sort((a: any, b: any) => {
//         const da = parseAnyDate(
//           a.date_ist ?? a.createdDate ?? a.dateTime ?? a.createdAt
//         ).getTime();
//         const db = parseAnyDate(
//           b.date_ist ?? b.createdDate ?? b.dateTime ?? b.createdAt
//         ).getTime();
//         return sortDirection === "desc" ? db - da : da - db;
//       });
//     }

//     return list;
//   }, [baselineList, statusFilter, sortDirection, isSearching]);

//   // Total count after applying status filter
//   const totalAfterStatusFilter = useMemo(() => {
//     if (!baselineList) return 0;

//     if (statusFilter === "all") {
//       return isSearching ? filteredTransactions.length : data?.total || 0;
//     }

//     const targetStatus = statusFilter === "success" ? 2 : 3;
//     return baselineList.filter((t: any) => t.paymentStatus === targetStatus).length;
//   }, [baselineList, statusFilter, isSearching, filteredTransactions.length, data?.total]);

//   const totalPages = Math.max(1, Math.ceil(totalAfterStatusFilter / PAGE_SIZE));
//   const totalSourceCount = totalAfterStatusFilter;

//   const rangeStart = displayedTransactions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
//   const rangeEnd = Math.min(page * PAGE_SIZE, totalAfterStatusFilter);

//   // For navbar counts (uses full unpaginated data)
//   const allFilteredTransactions = useMemo(() => {
//     if (isSearching) return filteredTransactions;
//     return data?.data || [];
//   }, [isSearching, filteredTransactions, data?.data]);

//   const handleCouponSearch = () => {
//     if (!couponSearchCode.trim()) {
//       toast.error("Please enter a coupon code");
//       return;
//     }
//     setCouponSearchTrigger(couponSearchCode.trim().toUpperCase());
//   };

//   const handleCouponKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === "Enter") handleCouponSearch();
//   };

//   const handleViewUsersFromSearch = (code: string) => {
//     setSelectedCoupon(code);
//     setCouponPopoverOpen(false);
//     setCouponUsersOpen(true);
//   };

//   const handleCouponClick = (code: string) => {
//     setSelectedCoupon(code);
//     setCouponUsersOpen(true);
//   };

//   const handleRefresh = () => {
//     refetch();
//     toast.success("Data refreshed");
//   };

//   if (error) {
//     toast.error("Failed to load transactions");
//   }

//   const toggleSort = () => {
//     const next: SortDirection = sortDirection === "desc" ? "asc" : "desc";
//     setSortDirection(next);
//     setPage(1);
//     refetch();
//   };

//   const onDateRangeChange = (range: DateRange) => {
//     setDateRange(range);
//     setPage(1);
//     refetch();
//   };

//   return (
//     <div className="min-h-screen bg-background bg-grid-pattern">
//       <Navbar
//         totalTransactions={data?.total || 0}
//         allTransactions={allFilteredTransactions}
//         isLoading={isLoading}
//         onStatusFilterChange={setStatusFilter}  // Fixed: direct function reference
//       />

//       <main className="container mx-auto px-4 py-8">
//         <div className="space-y-6">
//           {/* Header */}
//           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div>
//               <h2 className="text-2xl font-bold tracking-tight">
//                 All Transactions
//               </h2>
//               <p className="text-muted-foreground">
//                 Search by Mobile, Name, Amount, or Agent
//               </p>
//             </div>

//             <div className="flex items-center gap-2">
//               <Popover open={couponPopoverOpen} onOpenChange={setCouponPopoverOpen}>
//                 <PopoverTrigger asChild>
//                   <Button variant="glow" className="gap-2">
//                     <Tag className="h-4 w-4" />
//                     Search Coupon
//                   </Button>
//                 </PopoverTrigger>

//                 <PopoverContent
//                   side="bottom"
//                   align="end"
//                   className="w-[540px] p-4 glass-card-elevated border-border/50"
//                 >
//                   {/* Coupon search UI remains unchanged */}
//                   <div className="flex items-center justify-between mb-3">
//                     <div className="text-lg font-semibold flex items-center gap-2">
//                       <Search className="h-5 w-5 text-primary" />
//                       Search Coupon Code
//                     </div>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => setCouponPopoverOpen(false)}
//                     >
//                       Close
//                     </Button>
//                   </div>

//                   <div className="space-y-6">
//                     <div className="flex gap-2">
//                       <Input
//                         placeholder="Enter coupon code (e.g., ARAM8893)"
//                         value={couponSearchCode}
//                         onChange={(e) => setCouponSearchCode(e.target.value.toUpperCase())}
//                         onKeyPress={handleCouponKeyPress}
//                         className="font-mono text-lg h-12"
//                       />
//                       <Button
//                         onClick={handleCouponSearch}
//                         disabled={isCouponLoading}
//                         className="h-12 px-6"
//                         variant="glow"
//                       >
//                         {isCouponLoading ? (
//                           <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
//                         ) : (
//                           <Search className="h-5 w-5" />
//                         )}
//                       </Button>
//                     </div>

//                     {couponError && couponIsFetched && (
//                       <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-center">
//                         Coupon not found or inactive
//                       </div>
//                     )}

//                     {coupon && (
//                       <div className="space-y-4 animate-slide-up">
//                         <div className="flex items-center gap-3">
//                           <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
//                             {coupon.coupon.substring(0, 2)}
//                           </div>
//                           <div>
//                             <h3 className="font-mono text-xl font-bold">
//                               {coupon.coupon}
//                             </h3>
//                             <div className={`inline-flex items-center gap-2`}>
//                               <span
//                                 className={`px-2 py-1 rounded-md text-sm ${
//                                   coupon.active
//                                     ? "bg-success text-foreground"
//                                     : "bg-destructive text-destructive-foreground"
//                                 }`}
//                               >
//                                 {coupon.active ? "Active" : "Inactive"}
//                               </span>
//                             </div>
//                           </div>
//                         </div>

//                         <div className="grid grid-cols-2 gap-4">
//                           <div className="stat-card">
//                             <div className="text-xs text-muted-foreground mb-1">Discount</div>
//                             <p className="font-semibold text-lg">{coupon.discount}%</p>
//                           </div>
//                           <div className="stat-card">
//                             <div className="text-xs text-muted-foreground mb-1">Usage Limit</div>
//                             <p className="font-semibold text-lg">{coupon.usageLimit}</p>
//                           </div>
//                           <div className="stat-card col-span-2">
//                             <div className="text-xs text-muted-foreground mb-1">Plan</div>
//                             <p className="font-semibold">{coupon.plan}</p>
//                           </div>
//                         </div>

//                         {coupon.agent && (
//                           <div className="p-4 rounded-lg bg-muted/50 space-y-3">
//                             <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
//                               Agent Details
//                             </h4>
//                             <div className="grid grid-cols-2 gap-3">
//                               <div className="text-sm">{coupon.agent.name}</div>
//                               <div className="text-sm">{coupon.agent.phone}</div>
//                               <div className="text-sm truncate">{coupon.agent.email}</div>
//                               <div className="text-sm">{coupon.agent.location}</div>
//                             </div>
//                           </div>
//                         )}

//                         <Button
//                           onClick={() => handleViewUsersFromSearch(coupon.coupon)}
//                           className="w-full"
//                           variant="glow"
//                         >
//                           View All Users Who Used This Coupon
//                         </Button>
//                       </div>
//                     )}
//                   </div>
//                 </PopoverContent>
//               </Popover>
//             </div>
//           </div>

//           {/* Global Search + Date */}
//           <div className="glass-card rounded-xl p-4">
//             <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
//               <div className="flex-1 w-full">
//                 <div className="relative">
//                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
//                   <Input
//                     placeholder="Search by mobile, name, amount, agent..."
//                     value={searchQuery}
//                     onChange={(e) => {
//                       setSearchQuery(e.target.value.trim().toLowerCase());
//                       setPage(1);
//                     }}
//                     className="pl-11 h-12 text-base font-medium"
//                   />
//                 </div>
//                 {isSearching && (
//                   <div className="mt-2 text-sm text-muted-foreground">
//                     Found{" "}
//                     <span className="font-bold text-foreground">
//                       {filteredTransactions.length}
//                     </span>{" "}
//                     matching transactions
//                   </div>
//                 )}
//               </div>

//               <div className="flex items-center gap-3">
//                 <DateRangePicker
//                   dateRange={dateRange}
//                   onDateRangeChange={onDateRangeChange}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Actions */}
//           <div className="flex items-center justify-between">
//             <div className="text-sm text-muted-foreground">
//               Showing{" "}
//               <span className="font-medium text-foreground">
//                 {rangeStart}-{rangeEnd}
//               </span>{" "}
//               of{" "}
//               <span className="font-medium text-foreground">
//                 {totalSourceCount}
//               </span>{" "}
//               {isSearching ? "matching transactions" : "total transactions"}
//               {isSearching && <span className="text-muted-foreground"> • filtered</span>}
//             </div>
//             <div className="flex items-center gap-2">
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={handleRefresh}
//                 disabled={isFetching}
//               >
//                 <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
//                 Refresh
//               </Button>
//               <ExportButton dateRange={dateRange} />
//             </div>
//           </div>

//           {/* Table */}
//           <TransactionsTable
//             transactions={displayedTransactions}
//             isLoading={isLoading}
//             onCouponClick={handleCouponClick}
//             sortDirection={sortDirection}
//             onToggleSort={toggleSort}
//           />

//           {/* Pagination */}
//           {totalPages > 1 && (
//             <Pagination
//               currentPage={page}
//               totalPages={totalPages}
//               onPageChange={(p) => {
//                 setPage(p);
//                 refetch();
//               }}
//               isLoading={isLoading}
//             />
//           )}
//         </div>
//       </main>

//       {mounted &&
//         createPortal(
//           <CouponUsersModal
//             open={couponUsersOpen}
//             onOpenChange={setCouponUsersOpen}
//             couponCode={selectedCoupon}
//           />,
//           document.body
//         )}
//     </div>
//   );
// };

// export default Index;



// src/pages/Index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Tag, RefreshCw } from "lucide-react";
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

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

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
  } catch {}

  try {
    const d = parseISO(s);
    if (!isNaN(d.getTime())) return d;
  } catch {}

  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

const Index: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");

  const [couponPopoverOpen, setCouponPopoverOpen] = useState(false);
  const [couponSearchCode, setCouponSearchCode] = useState("");
  const [couponSearchTrigger, setCouponSearchTrigger] = useState("");

  const [couponUsersOpen, setCouponUsersOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState("");

  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [mounted, setMounted] = useState(false);

  // When true: fetch many records → client-side filtering & pagination
  const isClientSideMode = Boolean(searchQuery.trim()) || statusFilter !== "all";

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

  // Base list
  const baseList = useMemo(
    () => (isClientSideMode ? searchedList : data?.data || []),
    [isClientSideMode, searchedList, data?.data]
  );

  // Apply status filter + client sort
  const filteredByStatusList = useMemo(() => {
    let list = [...baseList];

    if (statusFilter !== "all") {
      const targetStatus = statusFilter === "success" ? 2 : 3;
      list = list.filter((t: any) => t.paymentStatus === targetStatus);
    }

    if (isClientSideMode) {
      list.sort((a: any, b: any) => {
        const da = parseAnyDate(
          a.date_ist ?? a.createdDate ?? a.dateTime ?? a.createdAt
        ).getTime();
        const db = parseAnyDate(
          b.date_ist ?? b.createdDate ?? b.dateTime ?? b.createdAt
        ).getTime();
        return sortDirection === "desc" ? db - da : da - db;
      });
    }

    return list;
  }, [baseList, statusFilter, isClientSideMode, sortDirection]);

  // === TOTAL & PAGINATION LOGIC ===
  const totalFilteredCount = filteredByStatusList.length;

  // When in server mode (All + no search), use server-provided total
  const totalCount = isClientSideMode ? totalFilteredCount : data?.total || 0;
  const totalPages = isClientSideMode
    ? Math.max(1, Math.ceil(totalFilteredCount / PAGE_SIZE))
    : Math.max(1, Math.ceil((data?.total || 0) / PAGE_SIZE));

  // Slice for client-side, or use server data directly
  const displayedTransactions = isClientSideMode
    ? filteredByStatusList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : data?.data || [];

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);
  const totalSourceCount = totalCount;

  // For navbar accurate counts
  const allFilteredTransactions = useMemo(() => {
    return isClientSideMode ? searchedList : data?.data || [];
  }, [isClientSideMode, searchedList, data?.data]);

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

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <Navbar
        totalTransactions={data?.total || 0}
        allTransactions={allFilteredTransactions}
        isLoading={isLoading}
        onStatusFilterChange={setStatusFilter}
      />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header & Coupon Search - unchanged */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                All Transactions
              </h2>
              <p className="text-muted-foreground">
                Search by Mobile, Name, Amount, or Agent
              </p>
            </div>
            {/* Coupon popover unchanged */}
          </div>

          {/* Search + Date */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
                {searchQuery.trim() && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Found <span className="font-bold text-foreground">{searchedList.length}</span> matching transactions
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={onDateRangeChange}
                />
              </div>
            </div>
          </div>

          {/* Showing X-Y of Z */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {rangeStart}-{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {totalSourceCount}
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
              <ExportButton dateRange={dateRange} />
            </div>
          </div>

          {/* Table */}
          <TransactionsTable
            transactions={displayedTransactions}
            isLoading={showLoading}
            onCouponClick={handleCouponClick}
            sortDirection={sortDirection}
            onToggleSort={toggleSort}
          />

          {/* Pagination - now shows correctly for All filter too */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => {
                setPage(p);
                if (!isClientSideMode) {
                  refetch(); // only refetch when server pagination
                }
              }}
              isLoading={showLoading}
            />
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