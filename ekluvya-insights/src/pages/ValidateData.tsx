import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { dataEntryError, downloadEntrySheet, formatEntryDate } from "@/lib/dataEntry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PreviewTable from "@/components/accountant/school-students/PreviewTable";
import type { ImportResult } from "@/components/accountant/school-students/types";

type ReportRow = Record<string, string | number | null>;
type ValidationResult = ImportResult & { report: ReportRow[]; validationId: string; validatedAt: string };
const columns = ["RECEIPT NO (OR) ADMISSION NO", "NAME", "SURNAME", "DOB", "PHONE", "EMAIL", "CLASS", "SCHOOL NAME", "SCHOOL LOCATION", "EXECUTIVE NAME", "EXECUTIVE PHONE"];

function downloadSheet(name: string, rows: ReportRow[]) {
  const headers = Array.from(new Set(rows.flatMap(Object.keys)));
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    // Keep spreadsheet applications from interpreting uploaded values as formulas.
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = [headers.map(cell).join(","), ...rows.map(row => headers.map(key => cell(row[key])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ValidateData() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState("");
  const [inserted, setInserted] = useState<{ importId: string; inserted: number; message: string } | null>(null);
  const [download, setDownload] = useState<"report" | "template" | null>(null);
  const [sheetName, setSheetName] = useState("");
  const cleanName = sheetName.trim().replace(/\.csv$/i, "");
  const validName = cleanName.length > 0 && cleanName.length <= 100 && !/[<>:"/\\|?*]/.test(cleanName) && !Array.from(cleanName).some(char => char.charCodeAt(0) < 32) && !/[. ]$/.test(cleanName);

  const validate = async () => {
    if (!file) return;
    setBusy(true); setResult(null); setError(""); setInserted(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const { data } = await api.post<ValidationResult>("/data-entry/validate", body, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 180000,
      });
      const formatDuplicateError = (message: string) => message.replace(
        /receipt no already exists in database/g,
        "receipt no/Admission Number already exists in database",
      );
      setResult({
        ...data,
        failedRows: data.failedRows.map(row => ({ ...row, error: formatDuplicateError(row.error) })),
        report: data.report.map(row => ({
          ...row,
          ...(typeof row["Validation Error"] === "string"
            ? { "Validation Error": formatDuplicateError(row["Validation Error"]) }
            : {}),
        })),
      });
      toast.success("Validation complete. Review the results below.");
    } catch (err: unknown) {
      const response = err as { response?: { data?: { message?: string } } };
      setError(response.response?.data?.message || "Validation could not finish. Please try again.");
    } finally { setBusy(false); }
  };

  const insertUsers = async () => {
    if (!file || !result?.validationId || result.failed || inserted) return;
    setBusy(true); setError("");
    const body = new FormData(); body.append("file", file); body.append("validationId", result.validationId);
    try {
      const { data } = await api.post("/data-entry/insert", body, { headers: { "Content-Type": "multipart/form-data" }, timeout: 180000 });
      setInserted(data); toast.success(data.message);
    } catch (err) {
      setError(dataEntryError(err, "Insertion could not be confirmed. Check My import history before retrying; retrying this same submission is safe."));
    } finally { setBusy(false); }
  };

  const askName = (kind: "report" | "template") => { setSheetName(""); setDownload(kind); };

  return (
    <main className="min-w-0 bg-background px-3 py-5 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto min-w-0 max-w-6xl space-y-4 sm:space-y-6">
        <Link to="/data-entry/history" className="text-sm text-primary hover:underline">View my import history</Link>
        <header className="space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">Validate and insert students</h1>
          <p className="text-muted-foreground">Validate your SR receipt sheet, then insert students without a subscription. Your submissions are recorded under your data-entry account for accountant review.</p>
        </header>
        <Card>
          <CardHeader className="p-4 sm:p-6"><CardTitle>Prepare and validate your sheet</CardTitle></CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>Use the column headers below or download the template. Put headers in row 1 and one student per row on the first worksheet. Remove blank rows.</li>
              <li>Fill in receipt/admission number, NAME, DOB, PHONE, SCHOOL NAME, SCHOOL LOCATION, and EXECUTIVE NAME. These are required for the SR import. Other listed fields are optional.</li>
              <li>Use a valid DOB in DD/MM/YYYY format, for example 15/08/2012; future dates are not allowed. Mobile numbers must have 10 digits starting with 6–9, optionally prefixed with +91. Store receipt numbers and phone numbers as text to preserve leading zeros. Do not repeat receipt numbers, email addresses, or phone numbers.</li>
              <li>Upload an .xlsx, .xls, or .csv file (up to 15 MB and 5,000 students), then click Validate sheet. Checks use the same SR import rules and database duplicate checks as School Management.</li>
              <li>Correct invalid fields and remove duplicate rows. If a user already exists in the database, remove that row and submit those details separately to the admin office.</li>
              <li>Every row must pass before insertion. We check again when you insert. After insertion, download usernames and initial passwords from your import history.</li>
            </ol>
            <div className="overflow-x-auto rounded-md border p-3 text-sm"><p className="min-w-max font-mono">{columns.join(" | ")}</p></div>
            <p className="text-sm text-muted-foreground">Existing import headers such as receipt_no, first_name, last_name, school_name, school_address, and executive_name also work. Downloads include all uploaded rows. If all rows pass, only the original data columns are included. If any row fails, Validation Row, Validation Status, and Validation Error are added.</p>
            <Button className="min-h-11 w-full sm:w-auto" variant="outline" onClick={() => askName("template")}><Download className="mr-2 h-4 w-4" />Download template</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 sm:p-6"><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" />Upload SR users sheet</CardTitle></CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
            <Label htmlFor="validation-file">Excel or CSV file</Label>
            <Input className="min-w-0 max-w-full" id="validation-file" type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={event => {
              const selected = event.target.files?.[0] || null;
              setResult(null); setFile(null); setError(""); setInserted(null);
              if (selected && (!/\.(xlsx|xls|csv)$/i.test(selected.name) || selected.size > 15 * 1024 * 1024)) {
                setError("Choose an .xlsx, .xls, or .csv file no larger than 15 MB."); event.target.value = ""; return;
              }
              setFile(selected);
            }} />
            <Button className="min-h-11 w-full sm:w-auto" onClick={validate} disabled={!file || busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? "Validating…" : "Validate sheet"}</Button>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
        {result && <>
          <section className="min-w-0 space-y-3" aria-label="Student validation preview">
            <p className="text-sm text-muted-foreground">Preview shows up to 25 valid rows. Swipe horizontally to see all columns. Download the report for every row and its validation result.</p>
            <div className="min-w-0 max-w-full overflow-hidden break-words"><PreviewTable users={result.preview || []} failedRows={result.failedRows} importType="sr-receipts" /></div>
          </section>
          <div className="flex flex-col items-stretch gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4" aria-live="polite">
            <p><strong>{result.totalRows}</strong> rows · <strong>{result.readyToInsert || 0}</strong> valid · <strong>{result.failed}</strong> need correction</p>
            <Button className="h-auto min-h-11 w-full whitespace-normal py-3 sm:w-auto sm:shrink-0" onClick={() => askName("report")} disabled={!result.report.length}><Download className="mr-2 h-4 w-4" />Download validation report</Button>
          </div>
          <p className="text-sm text-muted-foreground">Validated {formatEntryDate(result.validatedAt)} (India time).</p>
          {result.failed > 0 ? <div className="space-y-3 rounded-lg border border-destructive/30 p-4"><p role="alert">Insertion is blocked until every row passes. Correct invalid details. Remove rows for users already in the database and submit those details separately to the admin office.</p><Button className="min-h-11 w-full sm:w-auto" variant="outline" onClick={() => downloadEntrySheet("failed-student-rows", result.report.filter(row => row["Validation Status"] === "Needs correction"))}>Download failed rows</Button></div> : !inserted && <div className="flex flex-col items-stretch gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><p>All rows passed. Students will be created without a subscription.</p><Button className="min-h-11 w-full sm:w-auto sm:shrink-0" onClick={insertUsers} disabled={busy || result.totalRows === 0 || result.readyToInsert !== result.totalRows}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Insert {result.readyToInsert} {result.readyToInsert === 1 ? "student" : "students"}</Button></div>}
          {inserted && <div role="status" className="space-y-3 break-words rounded-lg border border-green-300 bg-green-50 p-4 text-green-950"><p className="font-semibold">{inserted.message}</p><p>{inserted.inserted} students inserted. Reference: {inserted.importId}</p><Button className="h-auto min-h-11 w-full whitespace-normal py-3 sm:w-auto" asChild><Link to={`/data-entry/history/${encodeURIComponent(inserted.importId)}`}>View details & download usernames and passwords</Link></Button></div>}

        </>}
        <Dialog open={download !== null} onOpenChange={open => { if (!open) setDownload(null); }}>
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg rounded-lg">
            <DialogHeader><DialogTitle>Name your sheet</DialogTitle><DialogDescription>Enter a name for this download. Your sheet will be saved as a CSV file.</DialogDescription></DialogHeader>
            <Label htmlFor="sheet-name">Sheet name</Label>
            <Input id="sheet-name" autoFocus value={sheetName} maxLength={104} onChange={event => setSheetName(event.target.value)} placeholder="Example: SR students October" />
            {sheetName && !validName && <p className="text-sm text-destructive">Use 1–100 characters without file path characters or a trailing dot.</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDownload(null)}>Cancel</Button>
              <Button disabled={!validName} onClick={() => {
                const rows = download === "template" ? [Object.fromEntries(columns.map(column => [column, ""]))] : result?.report || [];
                downloadSheet(cleanName, rows); setDownload(null);
              }}>Download CSV</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
