import { useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PreviewTable from "@/components/accountant/school-students/PreviewTable";
import type { ImportResult } from "@/components/accountant/school-students/types";

type ReportRow = Record<string, string | number | null>;
type ValidationResult = ImportResult & { report: ReportRow[] };
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
  useLayoutEffect(() => {
    // Apply before paint and include dialogs rendered through a portal to body.
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    const previousColorScheme = root.style.colorScheme;
    root.classList.remove("dark");
    root.style.colorScheme = "light";

    return () => {
      root.classList.toggle("dark", wasDark);
      root.style.colorScheme = previousColorScheme;
    };
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState("");
  const [download, setDownload] = useState<"report" | "template" | null>(null);
  const [sheetName, setSheetName] = useState("");
  const cleanName = sheetName.trim().replace(/\.csv$/i, "");
  const validName = cleanName.length > 0 && cleanName.length <= 100 && !/[<>:"/\\|?*\x00-\x1f]/.test(cleanName) && !/[. ]$/.test(cleanName);

  const validate = async () => {
    if (!file) return;
    setBusy(true); setResult(null); setError("");
    const body = new FormData();
    body.append("file", file);
    try {
      const { data } = await api.post<ValidationResult>("/school-students/validate-sr-receipts", body, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 180000,
      });
      setResult(data);
      toast.success("Validation complete. Review the results below.");
    } catch (err: unknown) {
      const response = err as { response?: { data?: { message?: string } } };
      setError(response.response?.data?.message || "Validation could not finish. Please try again.");
    } finally { setBusy(false); }
  };

  const askName = (kind: "report" | "template") => { setSheetName(""); setDownload(kind); };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link to="/" className="text-sm text-primary hover:underline">Back to login</Link>
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Validate your data</h1>
          <p className="text-muted-foreground">Check your SR Offline Receipt Users sheet before import. No login is needed, and validation does not create or update users.</p>
        </header>
        <Card>
          <CardHeader><CardTitle>Prepare and validate your sheet</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>Use the column headers below or download the template. Put headers in row 1 and one student per row on the first worksheet. Remove blank rows.</li>
              <li>Fill in receipt/admission number, NAME, SCHOOL NAME, and EXECUTIVE NAME. These are required for the SR import. Other listed fields are optional.</li>
              <li>Use DD/MM/YYYY for DOB, for example 15/08/2012. Store receipt numbers and phone numbers as text to preserve leading zeros. Do not repeat receipt numbers, email addresses, or phone numbers.</li>
              <li>Upload an .xlsx, .xls, or .csv file (up to 15 MB and 5,000 students), then click Validate sheet. Checks use the same SR import rules and database duplicate checks as School Management.</li>
              <li>Review errors, download the complete report with your chosen name, correct your source sheet, and upload it again. A valid result reflects the database at the time of validation.</li>
            </ol>
            <div className="overflow-x-auto rounded-md border p-3 text-sm"><p className="min-w-max font-mono">{columns.join(" | ")}</p></div>
            <p className="text-sm text-muted-foreground">Existing import headers such as receipt_no, first_name, last_name, school_name, school_address, and executive_name also work. Downloads include all uploaded rows. If all rows pass, only the original data columns are included. If any row fails, Validation Row, Validation Status, and Validation Error are added.</p>
            <Button variant="outline" onClick={() => askName("template")}><Download className="mr-2 h-4 w-4" />Download template</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" />Upload SR users sheet</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="validation-file">Excel or CSV file</Label>
            <Input id="validation-file" type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={event => {
              const selected = event.target.files?.[0] || null;
              setResult(null); setFile(null); setError("");
              if (selected && (!/\.(xlsx|xls|csv)$/i.test(selected.name) || selected.size > 15 * 1024 * 1024)) {
                setError("Choose an .xlsx, .xls, or .csv file no larger than 15 MB."); event.target.value = ""; return;
              }
              setFile(selected);
            }} />
            <Button onClick={validate} disabled={!file || busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? "Validating…" : "Validate sheet"}</Button>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
        {result && <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4" aria-live="polite">
            <p><strong>{result.totalRows}</strong> rows · <strong>{result.readyToInsert || 0}</strong> valid · <strong>{result.failed}</strong> need correction</p>
            <Button onClick={() => askName("report")} disabled={!result.report.length}><Download className="mr-2 h-4 w-4" />Download validation report</Button>
          </div>
          <p className="text-sm text-muted-foreground">Preview shows up to 25 valid rows. Download the report for every row and its validation result.</p>
          <PreviewTable users={result.preview || []} failedRows={result.failedRows} importType="sr-receipts" />
        </>}
        <Dialog open={download !== null} onOpenChange={open => { if (!open) setDownload(null); }}>
          <DialogContent>
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
