import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "@/lib/api";
import { dataEntryError, formatEntryDate } from "@/lib/dataEntry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { ImportedUser, SubscriptionPlan } from "@/components/accountant/school-students/types";

type Import = { import_id: string; source_file_name: string; created_at: string; insertion_status?: string; review_locked?: boolean; requested_by?: { name?: string; email?: string }; successful_users: ImportedUser[]; source_rows?: Record<string, unknown>[] };
const eligible = (user: ImportedUser) => Boolean(user.user_id) && ["Pending", "Failed"].includes(user.subscription_status || "Pending");

export default function StudentVerification() {
  const [imports, setImports] = useState<Import[]>([]);
  const [detail, setDetail] = useState<Import | null>(null);
  const { importId = "" } = useParams<{ importId: string }>();
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [token, setToken] = useState("");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planId, setPlanId] = useState("");
  const [selection, setSelection] = useState<string[]>([]);
  const [student, setStudent] = useState<ImportedUser | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [search, setSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);

  useEffect(() => {
    if (importId) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true);
    api.get("/school-students/import-history", { params: { page, limit: 20, from: from || undefined, to: to || undefined, importType: "sr_receipt_users" }, signal: controller.signal }).then(({ data }) => { setImports(data.items); setPages(data.pagination.totalPages); }).catch(err => { if (!axios.isCancel(err)) setError(dataEntryError(err, "Unable to fetch imports.")); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, from, to, refresh, importId]);
  useEffect(() => {
    setDetail(null); setSelection([]); setStudent(null); setStudentPage(1); setSearch("");
    if (!importId) { setDetailLoading(false); return; }
    const controller = new AbortController(); setDetailLoading(true);
    api.get(`/school-students/import-history/${encodeURIComponent(importId)}`, { signal: controller.signal }).then(({ data }) => setDetail(data.log)).catch(err => { if (!axios.isCancel(err)) setError(dataEntryError(err, "Unable to fetch students.")); }).finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [importId, refresh]);
  const filtered = (detail?.successful_users || []).filter(user => [user.first_name, user.last_name, user.username, user.school_name, user.phone, user.subscription_status].join(" ").toLowerCase().includes(search.toLowerCase()));
  const rows = filtered.slice((studentPage - 1) * 20, studentPage * 20);
  const selectable = rows.filter(eligible).map(user => user.user_id!);
  const locked = busy || detail?.review_locked || detail?.insertion_status !== "Inserted";
  const chosenPlan = plans.find(plan => plan._id === planId);
  const selectedUsers = (detail?.successful_users || []).filter(user => selection.includes(user.user_id!));
  const toggle = (id: string) => setSelection(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 150 ? [...current, id] : current);
  const fetchPlans = async () => {
    setFetching(true); setError(""); setPlans([]); setPlanId("");
    try { const { data } = await api.post("/school-students/subscriptions", { adminToken: token.trim() }); setPlans(data.subscriptions || []); if (!data.subscriptions?.length) setError("No subscription plans returned."); }
    catch (err) { setError(dataEntryError(err, "Unable to fetch subscription plans.")); }
    finally { setFetching(false); }
  };
  const assign = async () => {
    setBusy(true); setError(""); setNotice("");
    try { const { data } = await api.post("/school-students/review-assign", { importId, userIds: selection, adminToken: token.trim(), planId }, { timeout: 90000 }); setNotice(data.message); }
    catch (err) { setError(dataEntryError(err, "Result not confirmed. Refresh and verify the selected students before retrying.")); }
    finally { setBusy(false); setConfirm(false); setSelection([]); setRefresh(value => value + 1); }
  };
  return <main className="mx-auto w-full min-w-0 max-w-7xl space-y-3 px-3 py-4 sm:px-6">
    {importId && <Button asChild variant="outline" className="h-11 w-11 p-0 sm:w-auto sm:px-4"><Link to="/admin/dashboard/student-verification" aria-label="Back to imports"><ArrowLeft className="h-4 w-4" /><span className="ml-2 hidden sm:inline">Back to imports</span></Link></Button>}
    <h1 className="text-xl font-semibold sm:text-2xl">Verify students & assign subscriptions</h1>
    <p className="text-sm text-muted-foreground">Open an import, review student details, and approve a subscription for one or multiple students. Dates are India time.</p>
    {error && <p role="alert" className="rounded border border-destructive p-3 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="rounded border p-3 text-sm">{notice}</p>}
    {!importId && <>
    <div className="grid max-w-xl grid-cols-2 gap-3"><div><Label htmlFor="review-from">Inserted from</Label><Input disabled={busy} id="review-from" type="date" value={from} max={to || undefined} onChange={e => { setFrom(e.target.value); setPage(1); }} /></div><div><Label htmlFor="review-to">Inserted to</Label><Input disabled={busy} id="review-to" type="date" value={to} min={from || undefined} onChange={e => { setTo(e.target.value); setPage(1); }} /></div></div>
    {loading ? <p role="status">Loading imports…</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{imports.map(item => <Link key={item.import_id} to={`/admin/dashboard/student-verification/${encodeURIComponent(item.import_id)}`} className={`rounded-lg border p-3 text-left ${importId === item.import_id ? "border-primary bg-primary/5" : "bg-card"}`}><p className="break-words font-medium">{item.source_file_name}</p><p className="text-xs text-muted-foreground">{formatEntryDate(item.created_at)} · {item.requested_by?.name || "Staff import"}</p><p className="mt-1 text-xs">{item.successful_users.length} inserted · {item.successful_users.filter(eligible).length} awaiting assignment</p></Link>)}</div>}
    {!loading && imports.length === 0 && <p>No imports found for these dates.</p>}
    {pages > 1 && <div className="flex gap-x-3"><Button variant="outline" disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span>{page} / {pages}</span><Button variant="outline" disabled={busy || page >= pages} onClick={() => setPage(page + 1)}>Next</Button></div>}
    </>}
    {importId && detailLoading && <p role="status">Loading student details…</p>}
    {importId && detail && <Card className="min-w-0 overflow-hidden"><CardContent className="space-y-4 p-3 sm:p-5">
      <h2 className="break-words text-lg font-semibold">{detail.source_file_name}</h2>
      <p className="text-xs text-muted-foreground">Submitted by {detail.requested_by?.name || "Staff"} {detail.requested_by?.email} · {formatEntryDate(detail.created_at)}</p>
      {locked && !busy && <p className="text-sm text-destructive">This import is incomplete or an assignment is awaiting verification. Assignment is disabled.</p>}
      <div className="grid gap-3 md:grid-cols-2"><div className="space-y-1"><Label htmlFor="review-token">Admin token</Label><Input disabled={busy || fetching} id="review-token" type="password" autoComplete="off" value={token} onChange={e => { setToken(e.target.value); setPlans([]); setPlanId(""); }} placeholder="Enter subscription admin token" /><Button variant="outline" disabled={busy || fetching || !token.trim()} onClick={fetchPlans}>{fetching ? "Fetching…" : "Fetch subscription plans"}</Button></div><div className="space-y-1"><Label htmlFor="review-plan">Subscription plan</Label><select id="review-plan" className="min-h-11 w-full rounded-md border bg-background px-3 text-sm" disabled={busy || !plans.length} value={planId} onChange={e => setPlanId(e.target.value)}><option value="">Select a plan</option>{plans.map(plan => <option key={plan._id} value={plan._id}>{plan.name}{plan.days ? ` · ${plan.days} days` : ""}{plan.total_amount != null ? ` · ${plan.total_amount}` : ""}</option>)}</select></div></div>
      <Label htmlFor="review-search">Search students</Label><Input id="review-search" value={search} onChange={e => { setSearch(e.target.value); setStudentPage(1); }} placeholder="Name, username, school, phone or status" />
      <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b"><th className="p-2"><input type="checkbox" aria-label="Select eligible students on this page" disabled={locked || !selectable.length} checked={!!selectable.length && selectable.every(id => selection.includes(id))} onChange={e => setSelection(current => e.target.checked ? [...new Set([...current, ...selectable])].slice(0, 150) : current.filter(id => !selectable.includes(id)))} /></th>{["Student", "Username", "School / class", "Phone / email", "Subscription", "Review"].map(title => <th className="p-2" key={title}>{title}</th>)}</tr></thead><tbody>{rows.map(user => <tr className="border-b" key={user.user_id}><td className="p-2"><input type="checkbox" aria-label={`Select ${user.username}`} disabled={locked || !eligible(user) || (!selection.includes(user.user_id!) && selection.length >= 150)} checked={selection.includes(user.user_id!)} onChange={() => toggle(user.user_id!)} /></td><td className="p-2">{user.first_name} {user.last_name}</td><td className="p-2">{user.username}</td><td className="p-2">{user.school_name}<br />{user.class}</td><td className="p-2">{user.phone}<br />{user.email}</td><td className="p-2">{user.subscription_status || "Pending"}</td><td className="p-2"><Button variant="link" onClick={() => setStudent(user)}>View details</Button></td></tr>)}</tbody></table></div>
      {!rows.length && <p>No matching students.</p>}
      {filtered.length > 20 && <div className="flex gap-x-3"><Button variant="outline" disabled={studentPage === 1} onClick={() => setStudentPage(studentPage - 1)}>Previous students</Button><span>{studentPage} / {Math.ceil(filtered.length / 20)}</span><Button variant="outline" disabled={studentPage * 20 >= filtered.length} onClick={() => setStudentPage(studentPage + 1)}>Next students</Button></div>}
      <p className="text-sm">{selection.length} selected (maximum 150 per assignment). The header checkbox selects this page only.</p>
      <Button className="min-h-11 w-full sm:w-auto" disabled={locked || !selection.length || !chosenPlan || !token.trim()} onClick={() => setConfirm(true)}>Review & assign to {selection.length} students</Button>
    </CardContent></Card>}
    <Dialog open={!!student || confirm} onOpenChange={open => { if (!open && !busy) { setStudent(null); setConfirm(false); } }}><DialogContent className="flex max-h-[85dvh] w-[calc(100vw_-_1.5rem)] max-w-2xl flex-col overflow-hidden rounded-lg" style={{ animation: "none", transform: "translate(-50%, -50%)" }}>
      <DialogHeader><DialogTitle>{confirm ? "Confirm approval & subscription" : "Student details"}</DialogTitle><DialogDescription>{confirm ? `${chosenPlan?.name} · ${selection.length} students. Confirm that you have verified these students before assigning.` : "Review the student's submitted details and initial credentials."}</DialogDescription></DialogHeader>
      <div className="min-h-0 overflow-y-auto">{confirm ? <ul className="space-y-2">{selectedUsers.map(user => <li key={user.user_id} className="text-sm">{user.first_name} {user.last_name} · {user.username} · {user.school_name}</li>)}</ul> : student && <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{Object.entries({ ...(detail?.source_rows?.[(student.rowNumber || 2) - 2] || {}), ...student }).map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-xs capitalize text-muted-foreground">{key.replace(/_/g, " ")}</dt><dd className="break-words text-sm">{typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "-")}</dd></div>)}</dl>}</div>
      <DialogFooter><DialogClose asChild><Button disabled={busy} variant="outline">Close</Button></DialogClose>{confirm && <Button disabled={busy} onClick={assign}>{busy ? "Assigning…" : "Approve & assign subscription"}</Button>}</DialogFooter>
    </DialogContent></Dialog>
  </main>;
}
