import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FailedRow, ImportedUser, ImportType } from "./types";
import {
  downloadCsv,
  formatExportDate,
  formatExportGender,
  toCompleteReportRows,
  toFailedExportRows,
  toSuccessExportRows,
} from "./utils";

type ExportSectionProps = {
  users: ImportedUser[];
  failedRows: FailedRow[];
  importType: ImportType;
};

const ExportSection = ({ users, failedRows, importType }: ExportSectionProps) => {
  const exportPrefix = importType === "school-students" ? "b2b-school-students" : "b2c-receipt-users";

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Download className="h-5 w-5 text-primary" />
          Export Users
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Button
          type="button"
          variant="outline"
          className="justify-start gap-2"
          disabled={users.length === 0}
          onClick={() =>
            downloadCsv(`${exportPrefix}-successful-users.csv`, toSuccessExportRows(users, importType))
          }
        >
          <Download className="h-4 w-4" />
          Successful Users
        </Button>

        <Button
          type="button"
          variant="outline"
          className="justify-start gap-2"
          disabled={failedRows.length === 0}
          onClick={() => downloadCsv(`${exportPrefix}-failed-records.csv`, toFailedExportRows(failedRows))}
        >
          <Download className="h-4 w-4" />
          Failed Records
        </Button>

        <Button
          type="button"
          variant="outline"
          className="justify-start gap-2"
          disabled={users.length === 0 && failedRows.length === 0}
          onClick={() =>
            downloadCsv(
              `${exportPrefix}-complete-import-report.csv`,
              toCompleteReportRows(users, failedRows, importType)
            )
          }
        >
          <Download className="h-4 w-4" />
          Complete Report
        </Button>

        <Button
          type="button"
          variant="outline"
          className="justify-start gap-2"
          disabled={users.length === 0}
          onClick={() =>
            downloadCsv(
              `${exportPrefix}-school-share.csv`,
              users.map((user) => ({
                username: user.username || "",
                password: importType === "school-students" ? user.password || "" : "",
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                school_code: user.school_code || "",
                school_name: user.school_name || "",
                school_type: user.school_type || "",
                school_address: user.school_address || "",
                branch: user.branch || "",
                admission_number: user.admission_number || "",
                receipt_no: user.receipt_no || "",
                executive_name: user.executive_name || "",
                executive_phone: user.executive_phone || "",
                dob: formatExportDate(user.dob),
                gender: formatExportGender(user.gender),
                class: user.class || "",
                section: user.section || "",
                preparing_for: user.preparing_for || "",
                phone: user.phone || "",
                email: user.email || "",
                subscription_status: user.subscription_status || "",
                payment_status: user.payment_status || "",
                receipt_status: user.receipt_status || user.receipt_no || "",
              }))
            )
          }
        >
          <Download className="h-4 w-4" />
          User Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExportSection;
