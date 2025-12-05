// src/components/ExportButton.tsx
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Transaction } from "@/types";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface ExportButtonProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

const ExportButton = ({ transactions, isLoading }: ExportButtonProps) => {
  const exportToExcel = () => {
    if (!transactions || transactions.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Date & Time (IST)", "User Name", "Phone", "Email", "Coupon Code",
      "Amount (₹)", "Agent Name", "Agent Phone", "Agent Location"
    ];

    const rows = transactions.map(t => [
      format(parseISO(t.date_ist), "yyyy-MM-dd HH:mm:ss"),
      t.userName,
      t.phone,
      t.email,
      t.couponText || "",
      t.amount.toString(),
      t.agentName,
      t.agentPhone,
      t.agentLocation
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ekluvya-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Exported successfully!", {
      description: `${transactions.length} transactions downloaded`,
    });
  };

  return (
    <Button
      variant="glass"
      onClick={exportToExcel}
      disabled={isLoading || !transactions || transactions.length === 0}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export to Excel
    </Button>
  );
};

export default ExportButton;