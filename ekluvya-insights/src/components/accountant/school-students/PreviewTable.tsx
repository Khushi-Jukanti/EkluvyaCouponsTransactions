import { AlertCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FailedRow, ImportedUser, ImportType } from "./types";

type PreviewTableProps = {
  users: ImportedUser[];
  failedRows: FailedRow[];
  importType: ImportType;
};

const preferredColumns = [
  "rowNumber",
  "school_code",
  "admission_number",
  "receipt_no",
  "username",
  "first_name",
  "last_name",
  "email",
  "phone",
  "dob",
  "gender",
  "school_name",
  "school_type",
  "school_address",
  "branch",
  "class",
  "section",
  "preparing_for",
  "executive_name",
  "executive_phone",
];

const formatHeader = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateValue = (value: unknown) => {
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) return String(value || "-");

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/\//g, "-");
};

const formatGenderValue = (value: unknown) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "1" || normalized === "male") return "Male";
  if (normalized === "2" || normalized === "female") return "Female";
  if (normalized === "3" || normalized === "other" || normalized === "others") {
    return "Other";
  }

  return value ? String(value) : "-";
};

const formatValue = (key: string, value: unknown) => {
  if (value === undefined || value === null || value === "") return "-";
  if (key === "dob") return formatDateValue(value);
  if (key === "gender") return formatGenderValue(value);
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const getPreviewColumns = (users: ImportedUser[]) => {
  const keys = Array.from(
    new Set(users.flatMap((user) => Object.keys(user).filter((key) => key !== "password")))
  );

  return [
    ...preferredColumns.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !preferredColumns.includes(key)),
    "validation",
  ];
};

const PreviewTable = ({ users, failedRows, importType }: PreviewTableProps) => {
  const columns = getPreviewColumns(users);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Eye className="h-5 w-5 text-primary" />
          Import Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{formatHeader(column)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 25).map((user, index) => (
                <TableRow key={`${user.username || user.receipt_no || index}`}>
                  {columns.map((column) => (
                    <TableCell key={column} className="whitespace-nowrap">
                      {column === "validation" ? (
                        <span className="text-green-600">Valid</span>
                      ) : (
                        formatValue(column, (user as Record<string, unknown>)[column])
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={Math.max(columns.length, 1)} className="h-24 text-center text-muted-foreground">
                    Preview users will appear here after validation.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

      {failedRows.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            Validation errors
          </div>
          <div className="space-y-1">
            {failedRows.slice(0, 8).map((row, index) => (
              <p key={`${row.rowNumber}-${index}`}>
                Row {row.rowNumber || "-"}: {row.error}
              </p>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Showing first 25 valid {importType === "school-students" ? "school student" : "receipt"} rows.
      </p>
    </CardContent>
  </Card>
  );
};

export default PreviewTable;
