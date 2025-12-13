// src/components/CouponUsersModal.tsx
import React, { useEffect, useState } from "react";
import { Users, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCouponTransactions } from "@/hooks/useCouponSearch";
import {BASE_URL} from "@/config/api";

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

      while (hasMore) {
        const response = await fetch(`${BASE_URL}/coupons/${couponCode}/transactions?page=${page}&limit=50`);
        const json = await response.json();

        if (!json.success || !json.data) break;

        allData.push(...json.data);

        // Check if there's another page
        hasMore = json.pagination?.page < json.pagination?.pages;
        page++;
      }

      setAllTransactions(allData);
      setIsLoadingAll(false);
    };

    fetchAllPages();
  }, [open, couponCode]);

  // Filter only successful + sort by date
  const successfulTransactions = React.useMemo(() => {
    return allTransactions
      .filter((t: any) => t.status === 2)
      .sort((a: any, b: any) => {
        return parseIndianDate(b.date_ist).getTime() - parseIndianDate(a.date_ist).getTime();
      });
  }, [allTransactions]);

  // Use backend's accurate totalUsed (successful only)
  const totalUsed = allTransactions.length > 0
    ? allTransactions[0]?.totalUsed || successfulTransactions.length
    : 0;

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
              ) : successfulTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No successful uses found for this coupon.
                  </TableCell>
                </TableRow>
              ) : (
                successfulTransactions.map((t: any) => (
                  <TableRow key={t._id} className="hover:bg-muted/50">
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