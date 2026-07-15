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
import { inferAdmissionNumber } from "./utils";

type PreviewTableProps = {
  users: ImportedUser[];
  failedRows: FailedRow[];
  importType: ImportType;
};

const PreviewTable = ({ users, failedRows, importType }: PreviewTableProps) => (
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
              <TableHead>School Code</TableHead>
              <TableHead>Admission / Receipt</TableHead>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Preparing For</TableHead>
              <TableHead>Validation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.slice(0, 25).map((user, index) => (
              <TableRow key={`${user.username || user.receipt_no || index}`}>
                <TableCell>{user.school_code || user.school_name || "-"}</TableCell>
                <TableCell>{inferAdmissionNumber(user)}</TableCell>
                <TableCell>{user.first_name || "-"}</TableCell>
                <TableCell>{user.last_name || "-"}</TableCell>
                <TableCell>{user.email || "-"}</TableCell>
                <TableCell>{user.phone || "-"}</TableCell>
                <TableCell>{user.class || "-"}</TableCell>
                <TableCell>{user.section || "-"}</TableCell>
                <TableCell>{user.preparing_for || "-"}</TableCell>
                <TableCell className="text-green-600">Valid</TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
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

export default PreviewTable;
