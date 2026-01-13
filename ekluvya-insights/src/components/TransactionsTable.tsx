import React, { useState } from "react";
import { Transaction, PaymentData } from "@/types";
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
  FilterIcon,
  Tag,
  Check,
  Calendar,
  DollarSign,
  Eye,
  Edit,
  Lock,
  Building,
  CreditCard,
  Wallet
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TransactionsTableProps {
  transactions: (Transaction & { serialNumber?: number })[];
  isLoading: boolean;
  onCouponClick: (code: string) => void;
  sortDirection?: "asc" | "desc";
  onToggleSort?: () => void;
  statusFilter: "all" | "success" | "failed";
  onStatusFilterChange: (filter: "all" | "success" | "failed") => void;
  couponFilter: "all" | "with" | "without";
  onCouponFilterChange: (filter: "all" | "with" | "without") => void;
  // New props for payment management
  onTransactionSelect?: (transactionId: string, isChecked: boolean) => void;
  selectedTransactions?: Set<string>;
  onSelectAll?: (transactions: any[]) => void;
  isSelectAll?: boolean;
  onPaymentUpdate?: (transactionId: string, paymentData: PaymentData) => void;
  isUpdatingPayment?: boolean;
  // Role-based props
  userRole?: 'admin' | 'accountant';
}

const TableSkeleton = () => (
  <>
    {Array.from({ length: 10 }).map((_, i) => (
      <TableRow key={i} className="animate-pulse">
        {Array.from({ length: 17 }).map((_, j) => (
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
  couponFilter,
  onCouponFilterChange,
  // New props
  onTransactionSelect,
  selectedTransactions = new Set(),
  onSelectAll,
  isSelectAll = false,
  onPaymentUpdate,
  isUpdatingPayment = false,
  // Role-based props
  userRole = 'admin'
}: TransactionsTableProps) => {
  const formatDate = (dateRaw?: string | number | Date) => {
    const d = parseAnyDate(dateRaw as any);
    return format(d, "dd-MM-yyyy HH:mm:ss");
  };

  const formatPaymentDate = (dateRaw?: string | number | Date) => {
    if (!dateRaw) return '';
    const d = parseAnyDate(dateRaw as any);
    return format(d, "yyyy-MM-dd");
  };

  const shouldAllowPaymentEditing = (transaction: Transaction & { serialNumber?: number }) => {
    // Only accountants can edit
    if (userRole !== 'accountant') {
      return false;
    }

    // Check coupon code
    const couponText = transaction.couponText || transaction.coupon_code || transaction.coupon || "";
    const isCouponValid = couponText && couponText.trim().toUpperCase() !== "N/A" && couponText.trim() !== "";

    // Check agent details
    const agentName = transaction.agentName || "";
    const isAgentValid = agentName &&
      agentName.trim().toLowerCase() !== "no agent" &&
      agentName.trim() !== "" &&
      agentName.trim().toLowerCase() !== "n/a";

    // Allow editing only if both conditions are met
    return isCouponValid && isAgentValid;
  };

  // Helper to get payment editing reason if not allowed
  const getPaymentEditRestrictionReason = (transaction: Transaction & { serialNumber?: number }) => {
    if (userRole !== 'accountant') {
      return "Admin view only";
    }

    const couponText = transaction.couponText || transaction.coupon_code || transaction.coupon || "";
    const agentName = transaction.agentName || "";

    if (!couponText || couponText.trim().toUpperCase() === "N/A" || couponText.trim() === "") {
      return "No valid coupon code";
    }

    if (!agentName || agentName.trim().toLowerCase() === "no agent" || agentName.trim() === "" || agentName.trim().toLowerCase() === "n/a") {
      return "No agent assigned";
    }

    return null;
  };

  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingPaymentData, setEditingPaymentData] = useState<PaymentData>({
    agent_payment_status: 'pending',
    agent_payment_mode: '',
    agent_payment_date: format(new Date(), 'yyyy-MM-dd')
  });

  const paymentModes = [
    'Bank Transfer',
    'UPI',
    'Cash',
    'Cheque',
    'Paytm',
    'Google Pay',
    'PhonePe',
    'Credit Card',
    'Debit Card',
    'Net Banking'
  ];

  const handleRowSelect = (transactionId: string, checked: boolean) => {
    onTransactionSelect?.(transactionId, checked);
  };

  const handleAllSelect = () => {
    onSelectAll?.(transactions);
  };

  const handleEditPayment = (transaction: Transaction & { serialNumber?: number }) => {
    // Check if payment editing is allowed
    if (!shouldAllowPaymentEditing(transaction)) {
      const reason = getPaymentEditRestrictionReason(transaction);
      toast.error(`Cannot edit payment: ${reason}`);
      return;
    }

    const transactionId = transaction._id || transaction.transactionId || '';
    console.log('✏️ Editing transaction:', transactionId);
    console.log('Current payment status:', transaction.agent_payment_status);
    console.log('Current payment mode:', transaction.agent_payment_mode);
    console.log('Current payment date:', transaction.agent_payment_date);

    setEditingTransactionId(transactionId);

    // Get current status, default to 'pending'
    let currentStatus: PaymentData['agent_payment_status'] = 'pending';
    if (transaction.agent_payment_status === 'paid') {
      currentStatus = 'paid';
    } else if (transaction.agent_payment_status === 'pending') {
      currentStatus = 'pending';
    }

    // Get current mode and date - keep existing values even for pending
    let currentMode = transaction.agent_payment_mode || '';
    let currentDate = '';

    if (transaction.agent_payment_date) {
      try {
        const dateObj = typeof transaction.agent_payment_date === 'string'
          ? new Date(transaction.agent_payment_date)
          : transaction.agent_payment_date;
        currentDate = format(dateObj, 'yyyy-MM-dd');
      } catch (error) {
        currentDate = format(new Date(), 'yyyy-MM-dd');
      }
    } else {
      currentDate = format(new Date(), 'yyyy-MM-dd');
    }

    setEditingPaymentData({
      agent_payment_status: currentStatus,
      agent_payment_mode: currentMode,
      agent_payment_date: currentDate
    });
  };

  // Handle status change - keep existing mode/date when changing to pending
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as PaymentData['agent_payment_status'];

    setEditingPaymentData(prev => {
      const newData = { ...prev, agent_payment_status: newStatus };

      // If changing to paid and date is empty, set today's date
      if (newStatus === 'paid' && !prev.agent_payment_date) {
        newData.agent_payment_date = format(new Date(), 'yyyy-MM-dd');
      }

      return newData;
    });
  };

  const handleSavePayment = (transactionId: string) => {
    console.log('💾 Saving payment for:', transactionId);
    console.log('📝 Payment data to save:', editingPaymentData);

    if (onPaymentUpdate) {
      onPaymentUpdate(transactionId, editingPaymentData);
      setEditingTransactionId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingTransactionId(null);
  };

  // Helper to render payment status badge - UPDATED TO SHOW FOR ALL USERS
  const renderPaymentStatusBadge = (status?: string, transaction?: Transaction) => {
    // Show actual status for ALL users, not just for editable transactions
    if (!status || status.toLowerCase() === 'pending') {
      return (
        <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
          Pending
        </Badge>
      );
    } else if (status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed') {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border border-green-200">
          <Check className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-gray-700 border-gray-300">
          {status}
        </Badge>
      );
    }
  };

  // Helper to render payment mode text - UPDATED TO SHOW FOR ALL USERS
  const renderPaymentMode = (mode?: string, status?: string, transaction?: Transaction) => {
    const isPending = !status || status.toLowerCase() === 'pending';

    if (isPending) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }

    if (!mode || mode.trim() === '') {
      return <span className="text-sm text-muted-foreground">—</span>;
    }

    return (
      <span className="text-sm">
        {mode.replace('_', ' ').replace(/-/g, ' ').toUpperCase()}
      </span>
    );
  };

  // Helper to render payment date - UPDATED TO SHOW FOR ALL USERS
  const renderPaymentDate = (date?: string | Date, status?: string, transaction?: Transaction) => {
    const isPending = !status || status.toLowerCase() === 'pending';

    if (isPending) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }

    if (!date) {
      return <span className="text-sm text-muted-foreground">—</span>;
    }

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return (
        <div className="flex items-center justify-center gap-1">
          <Calendar className="h-3 w-3 text-gray-500" />
          <span className="text-xs">
            {format(dateObj, 'dd/MM/yyyy')}
          </span>
        </div>
      );
    } catch {
      return <span className="text-sm text-muted-foreground">—</span>;
    }
  };

  // Helper to render agent account number with tooltip for bank details
  const renderAgentAccountNumber = (transaction: Transaction & { serialNumber?: number }) => {
    const accountNo = transaction.agent_account_no;
    const bankName = transaction.agent_bank_name;
    const ifscCode = transaction.agent_ifsc_code;
    const branchName = transaction.agent_branch_name;

    if (!accountNo || accountNo.trim() === '') {
      return <span className="text-sm text-muted-foreground">—</span>;
    }

    const hasBankDetails = bankName || ifscCode || branchName;

    if (hasBankDetails) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center cursor-help">
                <span className="font-mono text-sm font-medium">
                  {accountNo.length > 8 ? `••••${accountNo.slice(-4)}` : accountNo}
                </span>
                {bankName && (
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {bankName}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-card border border-border shadow-lg">
              <div className="space-y-2 p-2">
                {bankName && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Bank:</span>
                    <p className="text-sm font-medium">{bankName}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Account No:</span>
                  <p className="text-sm font-mono font-medium">{accountNo}</p>
                </div>
                {ifscCode && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">IFSC:</span>
                    <p className="text-sm font-mono">{ifscCode}</p>
                  </div>
                )}
                {branchName && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Branch:</span>
                    <p className="text-sm">{branchName}</p>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div className="flex flex-col items-center">
        <span className="font-mono text-sm font-medium">{accountNo}</span>
      </div>
    );
  };

  // Check if user can edit (accountant only)
  const canEditPayment = userRole === 'accountant';

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              {/* Checkbox Column for Selection - Only for accountants */}
              {canEditPayment && onTransactionSelect && (
                <TableHead className="text-muted-foreground font-semibold text-center w-12">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isSelectAll}
                      onCheckedChange={handleAllSelect}
                      className="h-4 w-4"
                    />
                  </div>
                </TableHead>
              )}

              {/* S.No Column */}
              <TableHead className="text-muted-foreground font-semibold text-center w-12">
                S.No
              </TableHead>

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
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-sm font-medium">Coupons</span>
                  <div className="flex items-center gap-1">
                    <Select value={couponFilter} onValueChange={onCouponFilterChange}>
                      <SelectTrigger className="h-8 w-26 border-0 bg-transparent hover:bg-muted/50 px-1 text-sm font-medium">
                        <Tag className="h-4 w-4 text-primary" />
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="with">With Coupon</SelectItem>
                        <SelectItem value="without">Without Coupon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TableHead>

              <TableHead className="text-muted-foreground font-semibold text-right">
                Amount
              </TableHead>

              <TableHead className="text-muted-foreground font-semibold">
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-sm font-medium">Status</span>
                  <div className="flex items-center gap-1">
                    <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                      <SelectTrigger className="h-8 w-26 border-0 bg-transparent hover:bg-muted/50 px-2 text-sm font-medium focus:ring-0">
                        <FilterIcon className="h-4 w-4 text-primary" />
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TableHead>

              {/* New Payment Management Columns */}
              <TableHead className="text-muted-foreground font-semibold text-center">
                <div className="flex flex-col items-center gap-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Payment Status</span>
                </div>
              </TableHead>

              <TableHead className="text-muted-foreground font-semibold text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-medium">Payment Mode</span>
                </div>
              </TableHead>

              <TableHead className="text-muted-foreground font-semibold text-center">
                <div className="flex flex-col items-center gap-1">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Payment Date</span>
                </div>
              </TableHead>

              {/* Actions Column - Only for accountants */}
              {canEditPayment && (
                <TableHead className="text-muted-foreground font-semibold text-center">
                  <span className="text-sm font-medium">Actions</span>
                </TableHead>
              )}

              <TableHead className="text-muted-foreground font-semibold">
                Agent Name
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">
                Agent Phone
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold text-center">
                <div className="flex flex-col items-center gap-1">
                  <Building className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Agent Account No.</span>
                </div>
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
                <TableCell
                  colSpan={canEditPayment && onTransactionSelect ? 17 : 16}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <User className="h-8 w-8" />
                    <p>No transactions found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction, index) => {
                const isFailed = transaction.paymentStatus === 3;
                const transactionId = transaction._id || transaction.transactionId || `temp-${index}`;
                const isSelected = selectedTransactions.has(transactionId);
                const isEditing = editingTransactionId === transactionId;

                return (
                  <TableRow
                    key={transactionId}
                    className={`table-row-hover border-border/30 ${isSelected ? 'bg-primary/5' : ''}`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* Checkbox for selection - Only for accountants */}
                    {canEditPayment && onTransactionSelect && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleRowSelect(transactionId, checked as boolean)
                            }
                            className="h-4 w-4"
                          />
                        </div>
                      </TableCell>
                    )}

                    {/* S.No Cell */}
                    <TableCell className="text-center text-muted-foreground font-medium">
                      {transaction.serialNumber || index + 1}
                    </TableCell>

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
                        {transaction.couponText || transaction.coupon_code || transaction.coupon || "N/A"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <span
                        className={`font-semibold ${isFailed ? "text-destructive" : "text-success"}`}
                        title={isFailed ? "Payment Failed" : "Payment Successful"}
                      >
                        ₹{transaction.amount?.toLocaleString("en-IN") || "0"}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant={isFailed ? "destructive" : "default"}
                        className={isFailed ? "" : "bg-success text-success-foreground"}
                      >
                        {transaction.paymentStatusText || (isFailed ? "Failed" : "Success")}
                      </Badge>
                    </TableCell>

                    {/* Payment Status Column - UPDATED TO SHOW FOR ALL USERS */}
                    <TableCell className="text-center">
                      {shouldAllowPaymentEditing(transaction) ? (
                        isEditing ? (
                          <select
                            value={editingPaymentData.agent_payment_status}
                            onChange={handleStatusChange}
                            className="w-full border rounded px-2 py-1 text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                          </select>
                        ) : (
                          renderPaymentStatusBadge(transaction.agent_payment_status, transaction)
                        )
                      ) : (
                        // SHOW STATUS FOR ALL USERS, not just editable ones
                        renderPaymentStatusBadge(transaction.agent_payment_status, transaction)
                      )}
                    </TableCell>

                    {/* Payment Mode Column - UPDATED TO SHOW FOR ALL USERS */}
                    <TableCell className="text-center">
                      {shouldAllowPaymentEditing(transaction) ? (
                        isEditing ? (
                          <select
                            value={editingPaymentData.agent_payment_mode}
                            onChange={(e) => setEditingPaymentData(prev => ({
                              ...prev,
                              agent_payment_mode: e.target.value
                            }))}
                            className={`w-full border rounded px-2 py-1 text-sm ${editingPaymentData.agent_payment_status === 'pending' ? 'bg-gray-100 text-gray-600' : ''}`}
                          >
                            <option value="">Select Mode</option>
                            {paymentModes.map(mode => (
                              <option key={mode} value={mode}>{mode}</option>
                            ))}
                          </select>
                        ) : (
                          renderPaymentMode(transaction.agent_payment_mode, transaction.agent_payment_status, transaction)
                        )
                      ) : (
                        // SHOW MODE FOR ALL USERS when status is paid
                        renderPaymentMode(transaction.agent_payment_mode, transaction.agent_payment_status, transaction)
                      )}
                    </TableCell>

                    {/* Payment Date Column - UPDATED TO SHOW FOR ALL USERS */}
                    <TableCell className="text-center">
                      {shouldAllowPaymentEditing(transaction) ? (
                        isEditing ? (
                          <input
                            type="date"
                            value={editingPaymentData.agent_payment_date || ''}
                            onChange={(e) => setEditingPaymentData(prev => ({
                              ...prev,
                              agent_payment_date: e.target.value
                            }))}
                            className={`w-full border rounded px-2 py-1 text-sm ${editingPaymentData.agent_payment_status === 'pending' ? 'bg-gray-100 text-gray-600' : ''}`}
                          />
                        ) : (
                          renderPaymentDate(transaction.agent_payment_date, transaction.agent_payment_status, transaction)
                        )
                      ) : (
                        // SHOW DATE FOR ALL USERS when status is paid
                        renderPaymentDate(transaction.agent_payment_date, transaction.agent_payment_status, transaction)
                      )}
                    </TableCell>

                    {/* Actions Column - Only for accountants */}
                    {canEditPayment && (
                      <TableCell className="text-center">
                        {shouldAllowPaymentEditing(transaction) ? (
                          isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSavePayment(transactionId)}
                                disabled={isUpdatingPayment ||
                                  (editingPaymentData.agent_payment_status === 'paid' &&
                                    (!editingPaymentData.agent_payment_mode || !editingPaymentData.agent_payment_date))}
                                className="h-6 px-2"
                              >
                                {isUpdatingPayment ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="h-6 px-2"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditPayment(transaction)}
                              className="h-6 px-2"
                            >
                              Edit
                            </Button>
                          )
                        ) : (
                          <span
                            className="text-xs text-gray-400 cursor-help"
                            title={getPaymentEditRestrictionReason(transaction)}
                          >
                            <Lock className="h-4 w-4 inline mr-1" />
                            Locked
                          </span>
                        )}
                      </TableCell>
                    )}

                    <TableCell className="font-medium">
                      {transaction.agentName}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span className="text-sm">{transaction.agentPhone}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      {renderAgentAccountNumber(transaction)}
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