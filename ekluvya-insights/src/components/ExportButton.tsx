// src/components/ExportAllButton.tsx
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRange } from "@/types";
import { toast } from "sonner";

interface ExportAllButtonProps {
  dateRange: DateRange;
  searchQuery?: string;
  filteredTransactions: any[];
}

const ExportAllButton = ({
  dateRange,
  searchQuery = "",
  filteredTransactions
}: ExportAllButtonProps) => {
  const total = filteredTransactions.length;

  const handleExport = () => {
    if (total === 0) {
      toast.error("No transactions to export");
      return;
    }

    const headers = [
      "S.No",
      "Date & Time (IST)",
      "User Name",
      "Phone",
      "Email",
      "Coupon Code",
      "Amount (₹)",
      "Status",
      "Payment Status",
      "Payment Mode",
      "Payment Date",
      "Agent Account No.",
      "Agent Name",
      "Agent Phone",
      "Agent Location",
    ];

    const rows = filteredTransactions.map((t: any, index: number) => {
      const isFailed = t.paymentStatus != null && Number(t.paymentStatus) === 3;
      const statusText = isFailed ? "Failed" : "Success";

      // Determine payment status - check various possible properties
      let paymentStatusText = "Paid"; // Default
      if (t.paymentStatus === "Paid" || t.payment_status === "Paid") {
        paymentStatusText = "Paid";
      } else if (t.paymentStatus === "Pending" || t.payment_status === "Pending") {
        paymentStatusText = "Pending";
      } else if (t.paymentStatus === "Failed" || t.payment_status === "Failed") {
        paymentStatusText = "Failed";
      }

      // Get payment date - try multiple approaches
      const getPaymentDate = () => {
        // 1. First check if paymentDate exists and is not empty
        if (t.paymentDate && t.paymentDate !== "—" && t.paymentDate !== "-") {
          return t.paymentDate;
        }

        // 2. Check if it's in payment_date property
        if (t.payment_date && t.payment_date !== "—" && t.payment_date !== "-") {
          return t.payment_date;
        }

        // 3. Check if paymentDateFormatted exists (might be used in UI)
        if (t.paymentDateFormatted) {
          return t.paymentDateFormatted;
        }

        // 4. Check if there's a settlementDate
        if (t.settlementDate) {
          return t.settlementDate;
        }

        // 5. Calculate based on transaction date + 3 days (as per your data pattern)
        const transactionDate = t.date_ist || t.createdAt || t.transactionDate;
        if (transactionDate) {
          try {
            const transDate = new Date(transactionDate);
            if (!isNaN(transDate.getTime())) {
              const paymentDate = new Date(transDate);
              paymentDate.setDate(paymentDate.getDate() + 3);
              return paymentDate;
            }
          } catch (error) {
            console.error("Error calculating payment date:", error);
          }
        }
        return "";
      };

      const paymentDate = getPaymentDate();

      // Debug logging for first few entries
      if (index < 3) {
        console.log(`Transaction ${index + 1} payment data:`, {
          originalPaymentDate: t.paymentDate,
          calculatedPaymentDate: paymentDate,
          transactionDate: t.date_ist,
          transactionObject: t
        });
      }

      return [
        index + 1, // S.No
        t.date_ist || t.createdAt || t.transaction_date || "",
        t.userName || t.user_name || t.name || "",
        t.phone || t.userPhone || t.user_phone || t.mobile || "",
        t.email || t.user_email || "",
        t.couponText || t.coupon_code || t.couponCode || t.coupons || "",
        t.amount || t.transaction_amount || t.amount_paid || 0,
        statusText,
        paymentStatusText,
        t.paymentMode || t.payment_mode || t.mode || "BANK TRANSFER",
        paymentDate,
        t.agentAccountNo || t.agent_account_no || t.account_no || t.accountNumber || "—",
        t.agentName || t.agent_name || t.agent || "",
        t.agentPhone || t.agent_phone || t.agent_mobile || "",
        t.agentLocation || t.location || t.agent_location || t.city || "",
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const fileDate = new Date().toISOString().slice(0, 10);
    const fileName = searchQuery.trim()
      ? `ekluvya-search-results-${fileDate}.csv`
      : `ekluvya-transactions-${fileDate}.csv`;

    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Export Complete!", {
      description: `${total} transactions downloaded`,
    });
  };

  return (
    <Button
      variant="glow"
      size="lg"
      onClick={handleExport}
      disabled={total === 0}
      className="gap-3 font-semibold"
    >
      <Download className="h-5 w-5" />
      {searchQuery.trim() ? "Export Results" : "Export All Transactions"}
      {total > 0 && ` (${total})`}
    </Button>
  );
};

export default ExportAllButton;