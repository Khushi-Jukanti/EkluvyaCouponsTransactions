import { useEffect, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { dataEntryError, downloadEntrySheet, formatEntryDate } from "@/lib/dataEntry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ImportedUser } from "@/components/accountant/school-students/types";

type Student = ImportedUser & { inserted_at?: string; subscription_assigned_at?: string };
type ImportLog = {
  import_id: string; source_file_name: string; created_at: string; validated_at?: string; inserted_at?: string;
  insertion_status?: string; successful_users: Student[]; source_rows?: Record<string, unknown>[];
};
const count = (log: ImportLog, status: string) => log.successful_users.filter(user => (user.subscription_status || "Pending") === status).length;

export default function DataEntryHistory() {
  const [params] = useSearchParams();
  const { importId } = useParams<{ importId: string }>();
  const selected = importId || "";
  const legacyImportId = params.get("importId");
  const [items, setItems] = useState<ImportLog[]>([]);
  const [details, setDetails] = useState<ImportLog | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (selected || legacyImportId) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError("");
    api.get("/data-entry/history", { params: { page, from: from || undefined, to: to || undefined }, signal: controller.signal }).then(({ data }) => {
      setItems(data.items); setTotalPages(data.pagination.totalPages);
    }).catch(err => { if (!axios.isCancel(err)) { setItems([]); setError(dataEntryError(err, "Unable to load history.")); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, from, to, selected, legacyImportId]);

  useEffect(() => {
    setSelectedStudent(null); setDetails(null); setStudentPage(1); setSearch(""); setDetailError("");
    if (!selected) { setDetailLoading(false); return; }
    const controller = new AbortController(); setDetailLoading(true);
    api.get(`/data-entry/history/${encodeURIComponent(selected)}`, { signal: controller.signal }).then(({ data }) => setDetails(data.log)).catch(err => {
      if (!axios.isCancel(err)) setDetailError(dataEntryError(err, "Unable to load import details."));
    }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selected]);

  const students = (details?.successful_users || []).filter(user => [user.first_name, user.last_name, user.username, user.phone, user.school_name, user.subscription_status].join(" ").toLowerCase().includes(search.toLowerCase()));
  const exportCredentials = () => {
    if (!details) return;
    downloadEntrySheet(`${details.import_id}-credentials`, details.successful_users.map(user => ({
      ...(details.source_rows?.[(user.rowNumber || 2) - 2] || {}),
      ...user, import_id: details.import_id,
      validated_at: formatEntryDate(details.validated_at), inserted_at: formatEntryDate(user.inserted_at || details.inserted_at || details.created_at),
      subscription_assigned_at: formatEntryDate(user.subscription_assigned_at),
    })));
  };
  if (!selected && legacyImportId) return <Navigate to={`/data-entry/history/${encodeURIComponent(legacyImportId)}`} replace />;
  return <main className={`mx-auto w-full min-w-0 max-w-6xl px-4 ${selected ? "space-y-3 pb-4 pt-1 sm:space-y-6 sm:py-8" : "space-y-4 py-4 sm:space-y-5 sm:py-6"}`}>
    {selected ? <div className="flex items-center justify-start gap-x-2 sm:flex-col sm:items-start sm:gap-y-4">
      <Button asChild variant="outline" className="h-11 w-11 shrink-0 p-0 sm:w-auto sm:px-4"><Link to="/data-entry/history" aria-label="Back to import history"><ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="ml-2 hidden sm:inline">Back to import history</span></Link></Button>
      <h1 className="text-lg font-semibold leading-tight sm:text-3xl sm:font-bold">Import details</h1>
    </div> : <header className="space-y-1"><h1 className="text-xl font-semibold leading-tight sm:text-2xl">My import history</h1><p className="text-sm leading-relaxed text-muted-foreground">Your student submissions, credentials, and subscription progress. All times are India time.</p></header>}
    {!selected && <>
    <div className="grid w-full max-w-lg grid-cols-2 gap-2 sm:gap-3"><div className="min-w-0 space-y-1"><Label className="text-xs sm:text-sm" htmlFor="history-from">Inserted from</Label><Input className="h-11 w-full min-w-0 max-w-full px-2 text-xs sm:text-sm" id="history-from" type="date" value={from} max={to || undefined} onChange={event => { setFrom(event.target.value); setPage(1); }} /></div><div className="min-w-0 space-y-1"><Label className="text-xs sm:text-sm" htmlFor="history-to">Inserted to</Label><Input className="h-11 w-full min-w-0 max-w-full px-2 text-xs sm:text-sm" id="history-to" type="date" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); setPage(1); }} /></div></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading ? <p role="status">Loading your imports…</p> : <>
      {!items.length && !error && <Card><CardContent className="p-6">No imports found. <Link className="text-primary underline" to="/validate">Validate and insert your first sheet</Link>.</CardContent></Card>}
      <div className="grid gap-3 md:grid-cols-2">{items.map(log => <Link key={log.import_id} to={`/data-entry/history/${encodeURIComponent(log.import_id)}`} className={`rounded-lg border p-4 text-left ${selected === log.import_id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
        <p className="break-words font-semibold">{log.source_file_name}</p><p className="mt-1 text-sm text-muted-foreground">{formatEntryDate(log.inserted_at || log.created_at)}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant="secondary">Inserted: {log.successful_users.length}</Badge><Badge variant="outline">Pending: {count(log, "Pending")}</Badge><Badge variant="outline">Assigned: {count(log, "Assigned")}</Badge>{count(log, "Failed") > 0 && <Badge variant="destructive">Assignment failed: {count(log, "Failed")}</Badge>}{count(log, "Needs verification") > 0 && <Badge variant="outline">Needs verification: {count(log, "Needs verification")}</Badge>}</div>
      </Link>)}</div>
      {totalPages > 0 && <div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm">Page {page} of {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button></div>}
    </>}
    </>}
    {selected && detailLoading && <p role="status">Loading students…</p>}
    {selected && detailError && <p role="alert" className="text-destructive">{detailError}</p>}
    {selected && details && <Card className="min-w-0 max-w-full overflow-hidden"><CardHeader className="grid grid-cols-1 gap-2 space-y-0 px-3 py-2 sm:px-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"><div className="min-w-0 space-y-1"><CardTitle className="break-words">{details.source_file_name}</CardTitle><p className="text-sm text-muted-foreground">Validated: {formatEntryDate(details.validated_at)} · Inserted: {formatEntryDate(details.inserted_at || details.created_at)}</p><p className="text-sm">Insertion: {details.insertion_status || "Inserted"}. Subscription status is shown separately for each student.</p></div><Button className="h-auto min-h-11 w-full whitespace-normal px-4 py-2 xl:w-auto xl:max-w-xs xl:justify-self-end" onClick={exportCredentials}>Download student details, usernames &amp; passwords</Button></CardHeader><CardContent className="min-w-0 space-y-2 px-3 pb-2 pt-0 sm:px-6">
      <p className="text-xs text-muted-foreground">These are the initial passwords issued during import. They may no longer work if a student has changed their password.</p>
      <Label htmlFor="student-search">Search students or subscription status</Label><Input id="student-search" value={search} onChange={event => { setSearch(event.target.value); setStudentPage(1); }} placeholder="Name, username, school, phone, or status" />
      <div role="region" aria-label="Imported students" tabIndex={0} className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-md border"><table className="w-full min-w-[1050px] text-left text-sm [&_td]:max-w-60 [&_td]:break-words"><thead><tr className="border-b">{["Student", "Receipt / username", "password", "School / class", "Phone / email", "Insertion", "Subscription", "All details"].map(title => <th className="p-3 whitespace-nowrap" key={title}>{title}</th>)}</tr></thead><tbody>{students.slice((studentPage - 1) * 20, studentPage * 20).map(user => <tr key={user.user_id} className="border-b align-top"><td className="p-3">{[user.first_name, user.last_name].filter(Boolean).join(" ")}</td><td className="p-3">{user.username || user.receipt_no || "-"}{user.receipt_no && user.username && user.receipt_no !== user.username && <p className="text-xs text-muted-foreground">Receipt: {user.receipt_no}</p>}</td><td className="p-3 font-mono">{user.password || "-"}</td><td className="p-3">{user.school_name}<br />{user.class || "—"}</td><td className="p-3">{user.phone || "—"}<br />{user.email || "—"}</td><td className="p-3">{user.import_status || "Inserted"}<br /><span className="text-xs text-muted-foreground">{formatEntryDate(user.inserted_at || details.inserted_at)}</span></td><td className="p-3">{user.subscription_status || "Pending"}{user.subscription_assigned_at && <p className="text-xs text-muted-foreground">{formatEntryDate(user.subscription_assigned_at)}</p>}</td><td className="p-3"><Button variant="link" className="h-auto min-h-11 whitespace-nowrap p-0" onClick={() => setSelectedStudent(user)}>View details</Button></td></tr>)}</tbody></table></div>
      {!students.length && <p>No matching students.</p>}
      {students.length > 20 && <div className="flex items-center gap-3"><Button variant="outline" disabled={studentPage === 1} onClick={() => setStudentPage(studentPage - 1)}>Previous students</Button><span>{studentPage} / {Math.ceil(students.length / 20)}</span><Button variant="outline" disabled={studentPage * 20 >= students.length} onClick={() => setStudentPage(studentPage + 1)}>Next students</Button></div>}
    </CardContent></Card>}
    <Dialog open={selectedStudent !== null} onOpenChange={open => { if (!open) setSelectedStudent(null); }}>
      <DialogContent
        className="flex max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_1.5rem)] max-w-2xl flex-col overflow-hidden rounded-lg p-4 sm:max-h-[85dvh] sm:p-6"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", animation: "none" }}
      >
        <DialogHeader className="shrink-0 pr-8 text-left">
          <DialogTitle>Student details</DialogTitle>
          <DialogDescription className="break-words">{[selectedStudent?.first_name, selectedStudent?.last_name].filter(Boolean).join(" ")} — Read-only registration details</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain pr-2">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {selectedStudent && Object.entries({ ...(details?.source_rows?.[(selectedStudent.rowNumber || 2) - 2] || {}), ...selectedStudent }).map(([key, value]) => <div className="min-w-0" key={key}>
              <dt className="text-xs font-medium capitalize text-muted-foreground">{key === "password" ? "Initial password" : key.replace(/_/g, " ")}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{String(value ?? "-")}</dd>
            </div>)}
          </dl>
        </div>
        <DialogFooter className="shrink-0 border-t pt-3"><DialogClose asChild><Button className="min-h-11 w-full sm:w-auto" variant="outline">Close</Button></DialogClose></DialogFooter>
      </DialogContent>
    </Dialog>
  </main>;
}
