// src/components/ExportAllButton.tsx
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRange } from "@/types";
import { toast } from "sonner";

interface ExportAllButtonProps {
  dateRange: DateRange;
  searchQuery?: string;
  // Pass the FULL filtered list (not just current page)
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
      "Date & Time (IST)",
      "User Name",
      "Phone",
      "Email",
      "Coupon Code",
      "Amount (₹)",
      "Status",
      "Agent Name",
      "Agent Phone",
      "Agent Location",
    ];

    const rows = filteredTransactions.map((t: any) => {
      const isFailed = t.paymentStatus != null && Number(t.paymentStatus) === 3;
      const statusText = isFailed ? "Failed" : "Success";

      return [
        t.date_ist || "",
        t.userName || "",
        t.phone || t.userPhone || "",
        t.email || "",
        t.couponText || t.coupon_code || "",
        t.amount || 0,
        statusText,
        t.agentName || "",
        t.agentPhone || "",
        t.agentLocation || t.location || "",
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