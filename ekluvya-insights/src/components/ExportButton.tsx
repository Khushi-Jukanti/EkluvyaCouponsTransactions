// src/components/ExportAllButton.tsx
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/hooks/useTransactions";
import { DateRange } from "@/types";
import { toast } from "sonner";

interface ExportAllButtonProps {
  dateRange: DateRange;
  searchQuery?: string;
}

const ExportAllButton = ({ dateRange, searchQuery = "" }: ExportAllButtonProps) => {
  const { data, isFetching } = useTransactions({
    page: 1,
    limit: 10000,
    dateRange,
    sortOrder: "desc",
    exportAll: true, // ← This triggers full fetch
  });

  const transactions = data?.data || [];
  const total = data?.total || 0;

  const handleExport = () => {
    if (transactions.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Date & Time (IST)",
      "User Name",
      "Phone",
      "Email",
      "Coupon Code",
      "Amount (₹)",
      "Agent Name",
      "Agent Phone",
      "Agent Location",
    ];

    const rows = transactions.map((t: any) => [
      t.date_ist || "",
      t.userName || "",
      t.phone || t.userPhone || "",
      t.email || "",
      t.couponText || t.coupon_code || "",
      t.amount || 0,
      t.agentName || "",
      t.agentPhone || "",
      t.agentLocation || t.location || "",
    ]);

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
    link.download = `ekluvya-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Export Complete!", {
      description: `${transactions.length} transactions downloaded`,
    });
  };

  return (
    <Button
      variant="glow"
      size="lg"
      onClick={handleExport}
      disabled={isFetching || total === 0}
      className="gap-3 font-semibold"
    >
      <Download className="h-5 w-5" />
      Export All Transactions
      {total > 0 && ` (${total})`}
      {isFetching && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      )}
    </Button>
  );
};

export default ExportAllButton;