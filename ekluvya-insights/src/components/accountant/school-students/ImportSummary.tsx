import { AlertCircle, CheckCircle2, Clock3, CopyX, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ImportResult } from "./types";

type ImportSummaryProps = {
  result: ImportResult;
};

const SummaryCard = ({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  tone: "green" | "orange" | "red" | "blue";
  icon: typeof Users;
}) => {
  const styles = {
    green: "border-green-200 bg-green-50 text-green-800",
    orange: "border-orange-200 bg-orange-50 text-orange-800",
    red: "border-red-200 bg-red-50 text-red-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
  };

  return (
    <Card className={styles[tone]}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm opacity-80">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <Icon className="h-5 w-5 opacity-80" />
      </CardContent>
    </Card>
  );
};

const ImportSummary = ({ result }: ImportSummaryProps) => {
  const successCount =
    result.summary?.successfullyInserted ??
    result.summary?.successfullyProcessed ??
    result.inserted ??
    0;
  const failedCount = result.summary?.failedRecords ?? result.failed ?? 0;
  const skippedCount = Math.max(
    0,
    (result.totalRows || 0) - Number(successCount || 0) - Number(failedCount || 0)
  );
  const duplicates = result.failedRows?.filter((row) =>
    row.error?.toLowerCase().includes("duplicate")
  ).length;
  const assigned = result.subscriptionAssignment?.assigned || 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <SummaryCard label="Total Records" value={result.totalRows || 0} tone="blue" icon={Users} />
      <SummaryCard label="Success" value={successCount || 0} tone="green" icon={CheckCircle2} />
      <SummaryCard label="Failed" value={failedCount || 0} tone="red" icon={AlertCircle} />
      <SummaryCard label="Skipped" value={skippedCount} tone="orange" icon={Clock3} />
      <SummaryCard label="Duplicates" value={duplicates || 0} tone="orange" icon={CopyX} />
      <SummaryCard label="Subscribed" value={assigned} tone="green" icon={CheckCircle2} />
    </div>
  );
};

export default ImportSummary;
