// src/components/CouponUsersModal.tsx
import { useState } from "react";
import { Users, Calendar, Phone, CreditCard, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCouponTransactions } from "@/hooks/useCouponSearch";
import { format, parseISO } from "date-fns";

interface CouponUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  couponCode: string;
}

const CouponUsersModal = ({ open, onOpenChange, couponCode }: CouponUsersModalProps) => {
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useCouponTransactions(couponCode, page, open && couponCode.length > 0);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy h:mm a");
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] glass-card-elevated border-border/50">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span>Users for Coupon</span>
                <Badge variant="outline" className="ml-2 font-mono">
                  {couponCode}
                </Badge>
              </div>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {data && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">
                Total Users: {data.totalUsed}
              </span>
            </div>
          )}

          <div className="rounded-lg overflow-hidden border border-border/50 max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead><Calendar className="h-4 w-4 inline mr-1" />Date & Time</TableHead>
                  <TableHead>User Name</TableHead>
                  <TableHead><Phone className="h-4 w-4 inline mr-1" />Phone</TableHead>
                  <TableHead className="text-right"><CreditCard className="h-4 w-4 inline mr-1" />Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 shimmer rounded w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !data?.data || data.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((t: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{formatDate(t.date_ist)}</TableCell>
                      <TableCell className="font-medium">{t.userName}</TableCell>
                      <TableCell>{t.phone}</TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        ₹{t.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            <X className="h-4 w-4 mr-2" /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CouponUsersModal;