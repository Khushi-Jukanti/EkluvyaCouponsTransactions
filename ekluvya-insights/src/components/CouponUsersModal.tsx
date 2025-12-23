// src/components/CouponUsersModal.tsx
import React, { useEffect, useState } from "react";
import { Users, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCouponTransactions } from "@/hooks/useCouponSearch";
import { BASE_URL } from "@/config/api";

const parseIndianDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(0);
  const [datePart, time] = dateStr.split(" ");
  const [dd, mm, yyyy] = datePart.split(/[-/]/);
  const [hh = "00", mi = "00", ss = "00"] = time ? time.split(":") : [];
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`);
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  couponCode: string;
}

// Helper function to create a unique key for each user transaction
const createUserKey = (transaction: any): string => {
  // Combine phone and name for uniqueness
  // Use "unknown" as fallback for missing values
  const phone = transaction.phone || "unknown";
  const name = transaction.userName || "unknown";
  return `${phone}-${name}`.toLowerCase();
};

const CouponUsersModal: React.FC<Props> = ({ open, onOpenChange, couponCode }) => {
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(true);

  // Fetch all pages when modal opens
  useEffect(() => {
    if (!open) {
      setAllTransactions([]);
      setIsLoadingAll(true);
      return;
    }

    const fetchAllPages = async () => {
      setIsLoadingAll(true);
      const allData: any[] = [];
      let page = 1;
      let hasMore = true;

      try {
        while (hasMore) {
          const response = await fetch(`${BASE_URL}/coupons/${couponCode}/transactions?page=${page}&limit=50`);

          if (!response.ok) {
            throw new Error(`Failed to fetch page ${page}: ${response.statusText}`);
          }

          const json = await response.json();

          if (!json.success || !json.data) break;

          allData.push(...json.data);

          // Check if there's another page
          hasMore = json.pagination?.page < json.pagination?.pages;
          page++;

          // Optional: Add a small delay to avoid overwhelming the server
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (error) {
        console.error("Error fetching coupon transactions:", error);
      } finally {
        setIsLoadingAll(false);
      }

      setAllTransactions(allData);
    };

    fetchAllPages();
  }, [open, couponCode]);

  // Process transactions: filter successful, remove duplicates, and sort
  const processedTransactions = React.useMemo(() => {
    // First, filter only successful transactions
    const successful = allTransactions.filter((t: any) => t.status === 2);

    // Remove duplicates based on user identifier (phone + name)
    const uniqueUsersMap = new Map<string, any>();

    successful.forEach((transaction: any) => {
      const userKey = createUserKey(transaction);

      // If we haven't seen this user before, add them to the map
      if (!uniqueUsersMap.has(userKey)) {
        uniqueUsersMap.set(userKey, transaction);
      } else {
        // If user already exists, keep the earliest transaction
        const existing = uniqueUsersMap.get(userKey);
        const existingDate = parseIndianDate(existing.date_ist);
        const currentDate = parseIndianDate(transaction.date_ist);

        // Keep the transaction with the earliest date
        if (currentDate.getTime() < existingDate.getTime()) {
          uniqueUsersMap.set(userKey, transaction);
        }
      }
    });

    // Convert map back to array and sort by date (newest first)
    return Array.from(uniqueUsersMap.values()).sort((a: any, b: any) => {
      return parseIndianDate(b.date_ist).getTime() - parseIndianDate(a.date_ist).getTime();
    });
  }, [allTransactions]);

  // Use processed transactions for total count
  const totalUsed = processedTransactions.length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative bg-card rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Coupon Users</h2>
              <Badge variant="outline" className="mt-2 text-lg px-4 py-1 font-mono">
                {couponCode}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-xl font-bold text-primary">
              Total Used: <span className="text-3xl">{totalUsed}</span>
              {allTransactions.length > 0 && allTransactions[0]?.totalUsed && (
                <span className="text-sm text-muted-foreground ml-2">
                  (from {allTransactions[0]?.totalUsed} total transactions)
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 border-b">
              <TableRow>
                <TableHead className="w-[190px]">Date & Time</TableHead>
                <TableHead>User Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right w-[140px]">Amount</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoadingAll ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-36 shimmer rounded bg-muted/40" /></TableCell>
                    <TableCell><div className="h-4 w-48 shimmer rounded bg-muted/40" /></TableCell>
                    <TableCell><div className="h-4 w-32 shimmer rounded bg-muted/40" /></TableCell>
                    <TableCell><div className="h-4 w-24 shimmer rounded bg-muted/40 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : processedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No successful uses found for this coupon.
                  </TableCell>
                </TableRow>
              ) : (
                processedTransactions.map((t: any) => (
                  <TableRow key={`${t._id}-${t.date_ist}`} className="hover:bg-muted/50">
                    <TableCell className="text-sm font-medium">
                      {t.date_ist || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {t.userName || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {t.phone || "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-success text-lg">
                      ₹{Number(t.amount || 0).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default CouponUsersModal;