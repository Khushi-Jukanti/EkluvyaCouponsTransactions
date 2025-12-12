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
import { format, parseISO, parse } from "date-fns";
import {
  User,
  Phone,
  Mail,
  MapPin,
  ChevronUp,
  ChevronDown,
  FilterIcon
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onCouponClick: (code: string) => void;
  sortDirection?: "asc" | "desc";
  onToggleSort?: () => void;
  statusFilter: "all" | "success" | "failed";
  onStatusFilterChange: (filter: "all" | "success" | "failed") => void;
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

const parseAnyDate = (raw?: string | number | Date): Date => {
  if (!raw) return new Date(0);
  if (raw instanceof Date) return raw;
  if (typeof raw === "number") return new Date(raw);

  const s = String(raw).trim();
  try {
    const d = parse(s, "dd-MM-yyyy HH:mm:ss", new Date());
    if (!isNaN(d.getTime())) return d;
  } catch {
    // ignore
  }

  // Try ISO
  try {
    const d = parseISO(s);
    if (!isNaN(d.getTime())) return d;
  } catch {
    // ignore
  }

  // Last resort
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

const TransactionsTable = ({
  transactions,
  isLoading,
  onCouponClick,
  sortDirection = "desc",
  onToggleSort,
  statusFilter,
  onStatusFilterChange,
}: TransactionsTableProps) => {
  const formatDate = (dateRaw?: string | number | Date) => {
    const d = parseAnyDate(dateRaw as any);
    // keep same format as your UI: dd-MM-yyyy HH:mm:ss
    return format(d, "dd-MM-yyyy HH:mm:ss");
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">
                <div className="flex items-center gap-3">
                  <span>Date & Time (IST)</span>

                  {/* Sort toggle button inside header */}
                  <button
                    onClick={() => onToggleSort?.()}
                    className="inline-flex items-center justify-center rounded p-1 hover:bg-muted/20"
                    aria-label={
                      sortDirection === "desc"
                        ? "Sort by date: newest first (click to show oldest first)"
                        : "Sort by date: oldest first (click to show newest first)"
                    }
                    title="Toggle sort by date"
                  >
                    {sortDirection === "desc" ? (
                      <ChevronDown className="h-4 w-4 text-foreground" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-foreground" />
                    )}
                  </button>
                </div>
              </TableHead>

              <TableHead className="text-muted-foreground font-semibold">
                User Name
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">
                Phone
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">
                Email
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">
                Coupon Code
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-right">
                Amount
              </TableHead>
              {/* <TableHead className="text-muted-foreground font-semibold text-center">
                Status
              </TableHead> */}
              <TableHead className="text-muted-foreground font-semibold">
                <div className="flex items-center justify-center gap-1">
                  {/* Filter Icon */}


                  {/* Label */}
                  {/* <span className="text-sm">Status</span> */}

                  {/* Compact Dropdown */}
                  <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                    <SelectTrigger className="h-8 w-26 border-0 bg-transparent hover:bg-muted/50 px-2 text-sm font-medium focus:ring-0 focus:ring-primary/20">
                      <FilterIcon className="h-4 w-4 text-primary" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">
                Agent Name
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">
                Agent Phone
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">
                Agent Location
              </TableHead>
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
              transactions.map((transaction, index) => {
                const isFailed = transaction.paymentStatus === 3;
                return (
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
                        <span className="font-medium">
                          {transaction.userName}
                        </span>
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
                        <span className="text-sm truncate max-w-[150px]">
                          {transaction.email}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors font-mono"
                        onClick={() =>
                          onCouponClick(transaction.couponText || "")
                        }
                      >
                        {transaction.couponText || "N/A"}
                      </Badge>
                    </TableCell>

                    {/* <TableCell className="text-right">
                      <span className="font-semibold text-success">
                        ₹{transaction.amount.toLocaleString()}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={transaction.paymentStatus === 2 ? "default" : "destructive"}
                        className={transaction.paymentStatus === 2 ? "bg-success" : ""}
                      >
                        {transaction.paymentStatusText || "Unknown"}
                      </Badge>
                    </TableCell> */}

                    {/* Amount: Red if failed, Green if success */}
                    <TableCell className="text-right">
                      <span
                        className={`font-semibold ${isFailed ? "text-destructive" : "text-success"}`}
                        title={isFailed ? "Payment Failed" : "Payment Successful"}
                      >
                        ₹{transaction.amount.toLocaleString("en-IN")}
                      </span>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="text-center">
                      <Badge
                        variant={isFailed ? "destructive" : "default"}
                        className={isFailed ? "" : "bg-success text-success-foreground"}
                      >
                        {transaction.paymentStatusText || (isFailed ? "Failed" : "Success")}
                      </Badge>
                    </TableCell>

                    <TableCell className="font-medium">
                      {transaction.agentName}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span className="text-sm">{transaction.agentPhone}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="text-sm">
                          {transaction.agentLocation}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransactionsTable;