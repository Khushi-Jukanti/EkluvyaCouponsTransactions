// src/components/TransactionsTable.tsx
import { Transaction } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { User, Phone, Mail, MapPin } from "lucide-react";

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onCouponClick: (code: string) => void;
}

const TableSkeleton = () => (
  <>
    {Array.from({ length: 10 }).map((_, i) => (
      <TableRow key={i} className="animate-pulse">
        {Array.from({ length: 9 }).map((_, j) => (
          <TableCell key={j}>
            <div className="h-4 shimmer rounded w-full" />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

const TransactionsTable = ({
  transactions,
  isLoading,
  onCouponClick,
}: TransactionsTableProps) => {
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "MMM d, yyyy h:mm a");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Date & Time (IST)</TableHead>
              <TableHead className="text-muted-foreground font-semibold">User Name</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Phone</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Email</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Coupon Code</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-right">Amount</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Agent Name</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Agent Phone</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Agent Location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <User className="h-8 w-8" />
                    <p>No transactions found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction, index) => (
                <TableRow
                  key={transaction.transactionId || index}
                  className="table-row-hover border-border/30"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell className="font-medium text-xs">
                    {formatDate(transaction.date_ist)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{transaction.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span className="text-sm">{transaction.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="text-sm truncate max-w-[150px]">{transaction.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors font-mono"
                      onClick={() => onCouponClick(transaction.couponText || "")}
                    >
                      {transaction.couponText || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-success">
                      ₹{transaction.amount.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{transaction.agentName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span className="text-sm">{transaction.agentPhone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="text-sm">{transaction.agentLocation}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransactionsTable;