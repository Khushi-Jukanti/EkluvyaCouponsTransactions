import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, FileSpreadsheet, Loader2, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ExportSection from "@/components/accountant/school-students/ExportSection";
import ImportSummary from "@/components/accountant/school-students/ImportSummary";
import UserManagementTable from "@/components/accountant/school-students/UserManagementTable";
import type { ImportResult, ImportType } from "@/components/accountant/school-students/types";

type ImportLogListItem = {
  import_id: string;
  import_type: "school_students" | "offline_receipt_users" | "sr_receipt_users";
  source_file_name?: string | null;
  summary?: Record<string, any>;
  subscription_assignment?: Record<string, any>;
  successful_users?: any[];
  log_file_name?: string | null;
  created_at: string;
  updated_at: string;
};

type ImportLogDetails = ImportLogListItem & {
  source_rows?: Record<string, any>[];
  successful_users?: any[];
  failed_rows?: any[];
};

const toImportType = (type?: string): ImportType =>
  type === "offline_receipt_users"
    ? "offline-receipts"
    : type === "sr_receipt_users"
      ? "sr-receipts"
      : "school-students";

const toResult = (log: ImportLogDetails): ImportResult => ({
  success: true,
  totalRows: log.summary?.totalRecords || log.source_rows?.length || 0,
  validRows: log.successful_users?.length || 0,
  inserted: log.summary?.successfullyInserted || log.summary?.inserted || 0,
  updated: log.summary?.updated || 0,
  failed: log.summary?.failedRecords || log.failed_rows?.length || 0,
  successfulUsers: log.successful_users || [],
  failedRows: log.failed_rows || [],
  summary: log.summary || {},
  subscriptionAssignment: {
    status: log.subscription_assignment?.status || "skipped",
    assigned: log.subscription_assignment?.assigned || 0,
    failed: log.subscription_assignment?.failed || 0,
    message: log.subscription_assignment?.message,
  },
  importLog: {
    importId: log.import_id,
    fileName: log.log_file_name || "",
  },
});

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "-";

const isInDateRange = (value: string, from?: string, to?: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (from) {
    const fromDate = new Date(`${from}T00:00:00`);
    if (date < fromDate) return false;
  }

  if (to) {
    const toDate = new Date(`${to}T23:59:59.999`);
    if (date > toDate) return false;
  }

  return true;
};

const ImportHistory = () => {
  const [items, setItems] = useState<ImportLogListItem[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<string>("");
  const [details, setDetails] = useState<ImportLogDetails | null>(null);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const selectedResult = useMemo(() => (details ? toResult(details) : null), [details]);
  const selectedImportType = toImportType(details?.import_type);
  const filteredItems = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();

    return items.filter((item) => {
      if (!isInDateRange(item.created_at, dateFilter.from, dateFilter.to)) {
        return false;
      }

      if (!query) return true;

      const searchableText = [
        item.import_id,
        item.source_file_name,
        item.log_file_name,
        item.summary?.schoolName,
        item.summary?.schoolCode,
        item.summary?.school_name,
        item.summary?.school_code,
        ...(item.successful_users || []).flatMap((user) => [
          user.school_name,
          user.school_code,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [dateFilter.from, dateFilter.to, items, schoolSearch]);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get("/school-students/import-history", {
        params: {
          page: 1,
          limit: 100,
          from: dateFilter.from || undefined,
          to: dateFilter.to || undefined,
        },
      });

      setItems(data.items || []);

      setSelectedImportId((current) => current || data.items?.[0]?.import_id || "");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch import history");
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter.from, dateFilter.to]);

  const fetchDetails = async (importId: string) => {
    if (!importId) return;

    try {
      setIsDetailsLoading(true);
      const { data } = await api.get(`/school-students/import-history/${importId}`);
      setDetails(data.log);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch import details");
    } finally {
      setIsDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchDetails(selectedImportId);
  }, [selectedImportId]);

  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedImportId("");
      setDetails(null);
      return;
    }

    if (!filteredItems.some((item) => item.import_id === selectedImportId)) {
      setSelectedImportId(filteredItems[0].import_id);
    }
  }, [filteredItems, selectedImportId]);

  return (
    <div className="h-screen overflow-hidden bg-background bg-grid-pattern">
      <main className="flex h-full w-full flex-col overflow-hidden px-4 py-6 lg:px-6">
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <div className="shrink-0 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Import History
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Review previous Excel imports, inserted users, failed rows,
                uploaded sheet data, and subscription assignment status.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <div className="relative w-full sm:min-w-[320px] xl:w-[420px]">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  value={schoolSearch}
                  onChange={(event) => setSchoolSearch(event.target.value)}
                  placeholder="Search by school name"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <Button type="button" variant="outline" onClick={fetchHistory} disabled={isLoading} className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
            <Card className="glass-card flex min-h-0 flex-col overflow-hidden">
              <CardHeader className="space-y-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  History
                </CardTitle>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                    From
                    <input
                      type="date"
                      value={dateFilter.from}
                      max={dateFilter.to || undefined}
                      onChange={(event) =>
                        setDateFilter((current) => ({ ...current, from: event.target.value }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                    To
                    <input
                      type="date"
                      value={dateFilter.to}
                      min={dateFilter.from || undefined}
                      onChange={(event) =>
                        setDateFilter((current) => ({ ...current, to: event.target.value }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </label>
                </div>
                {(dateFilter.from || dateFilter.to) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter({ from: "", to: "" })}
                    className="w-full gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Dates
                  </Button>
                )}
              </CardHeader>
              <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-3">
                {filteredItems.map((item) => (
                  <button
                    key={item.import_id}
                    type="button"
                    onClick={() => setSelectedImportId(item.import_id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedImportId === item.import_id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background/70 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {item.source_file_name || item.log_file_name || item.import_id}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(item.created_at)}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {item.import_type === "offline_receipt_users" ? "B2C" : "B2B"}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <span>Total: {item.summary?.totalRecords || 0}</span>
                      <span>Success: {item.summary?.successfullyInserted || item.summary?.successfullyProcessed || 0}</span>
                      <span>Failed: {item.summary?.failedRecords || 0}</span>
                    </div>
                  </button>
                ))}

                {!isLoading && filteredItems.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {items.length === 0 ? "No import history found yet." : "No imports match these filters."}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="min-h-0 space-y-6 overflow-y-auto pr-2">
              {isDetailsLoading && (
                <Card className="glass-card">
                  <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading import details
                  </CardContent>
                </Card>
              )}

              {details && selectedResult && (
                <>
                  <Card className="glass-card">
                    <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Import ID</p>
                        <p className="mt-1 break-all font-mono text-sm">{details.import_id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Source File</p>
                        <p className="mt-1 font-medium">{details.source_file_name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date & Time</p>
                        <p className="mt-1 font-medium">{formatDateTime(details.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Subscription</p>
                        <p className="mt-1 font-medium capitalize">
                          {details.subscription_assignment?.status || "skipped"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <ImportSummary result={selectedResult} />

                  <UserManagementTable
                    users={details.successful_users || []}
                    failedRows={details.failed_rows || []}
                    importType={selectedImportType}
                  />

                  <ExportSection
                    users={details.successful_users || []}
                    failedRows={details.failed_rows || []}
                    importType={selectedImportType}
                  />

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        Uploaded Sheet Data
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(details.source_rows?.[0] || {}).map((key) => (
                                <TableHead key={key}>{key}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(details.source_rows || []).slice(0, 50).map((row, index) => (
                              <TableRow key={index}>
                                {Object.keys(details.source_rows?.[0] || {}).map((key) => (
                                  <TableCell key={key}>{row[key] || "-"}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                            {(details.source_rows || []).length === 0 && (
                              <TableRow>
                                <TableCell className="h-24 text-center text-muted-foreground">
                                  No uploaded sheet rows stored for this import.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Showing first 50 uploaded sheet rows.
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ImportHistory;
