import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import Pagination from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FailedRow, ImportedUser, ImportType, ResultFilter } from "./types";
import { getSchoolValue, getUserDisplayName, inferAdmissionNumber } from "./utils";

type UserManagementTableProps = {
  users: ImportedUser[];
  failedRows: FailedRow[];
  importType: ImportType;
};

const PAGE_SIZE = 10;

const UserManagementTable = ({
  users,
  failedRows,
  importType,
}: UserManagementTableProps) => {
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const schools = useMemo(() => {
    const values = users
      .map((user) => user.school_code || user.school_name)
      .filter(Boolean) as string[];
    return Array.from(new Set(values)).sort();
  }, [users]);

  const rows = useMemo(() => {
    const successRows = users.map((user) => ({
      type: "success" as ResultFilter,
      user,
      error: "",
    }));
    const failRows = failedRows.map((row) => ({
      type: "failed" as ResultFilter,
      user: {
        username: row.username || row.receipt_no || "-",
        import_status: "Failed",
        rowNumber: row.rowNumber,
      } as ImportedUser,
      error: row.error,
    }));

    return [...successRows, ...failRows].filter((row) => {
      const user = row.user;
      const searchText = [
        user.username,
        user.first_name,
        user.last_name,
        user.school_code,
        user.school_name,
        inferAdmissionNumber(user),
        user.phone,
        row.error,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const userType = user.receipt_no ? "b2c" : "b2b";

      return (
        (resultFilter === "all" || row.type === resultFilter) &&
        (subscriptionFilter === "all" ||
          (user.subscription_status || "pending").toLowerCase() === subscriptionFilter) &&
        (schoolFilter === "all" ||
          user.school_code === schoolFilter ||
          user.school_name === schoolFilter) &&
        (userTypeFilter === "all" || userType === userTypeFilter) &&
        searchText.includes(query.trim().toLowerCase())
      );
    });
  }, [failedRows, importType, query, resultFilter, schoolFilter, subscriptionFilter, userTypeFilter, users]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          User Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search username, name, school, admission, phone"
              className="pl-9"
            />
          </div>

          <Select value={resultFilter} onValueChange={(value) => setResultFilter(value as ResultFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>

          <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subscriptions</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={schoolFilter} onValueChange={setSchoolFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
              {schools.map((school) => (
                <SelectItem key={school} value={school}>{school}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All User Types</SelectItem>
              <SelectItem value="b2b">B2B</SelectItem>
              <SelectItem value="b2c">B2C</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Admission / Receipt</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map((row, index) => (
                <TableRow key={`${row.user.user_id || row.user.username}-${index}`}>
                  <TableCell className="font-mono">{row.user.username || "-"}</TableCell>
                  <TableCell>{getUserDisplayName(row.user)}</TableCell>
                  <TableCell className="font-mono">{row.user.password || "-"}</TableCell>
                  <TableCell>{getSchoolValue(row.user)}</TableCell>
                  <TableCell>{inferAdmissionNumber(row.user)}</TableCell>
                  <TableCell className="font-mono text-xs">{row.user.user_id || "-"}</TableCell>
                  <TableCell>{row.user.subscription_status || "Pending"}</TableCell>
                  <TableCell>
                    <Badge variant={row.type === "failed" ? "destructive" : "secondary"}>
                      {row.user.import_status || row.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[260px] whitespace-normal text-destructive">
                    {row.error || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {pagedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No users match the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </CardContent>
    </Card>
  );
};

export default UserManagementTable;
