import { useEffect, useState } from "react";
import { useDataEntryLightTheme } from "@/hooks/useDataEntryLightTheme";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FileCheck2, History, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function DataEntryLayout() {
  useDataEntryLightTheme();
  const navigate = useNavigate();
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("token") || localStorage.getItem("role") !== "data_entry") { navigate("/data-entry/login", { replace: true }); return; }
    const controller = new AbortController();
    api.get("/data-entry/me", { signal: controller.signal }).then(({ data }) => setName(data.user.name)).catch(err => {
      if (axios.isCancel(err)) return;
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("userName");
        navigate("/", { replace: true });
      }
      else setError(true);
    });
    return () => controller.abort();
  }, [navigate]);
  if (error) return <div role="alert" className="p-8">Unable to verify your account. <Button onClick={() => window.location.reload()}>Retry</Button></div>;
  if (name === null) return <p role="status" className="p-8">Verifying your data-entry account…</p>;
  const navigation = <div className="flex min-h-0 flex-1 flex-col gap-6 p-4">
    <div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Signed in as</p><p className="mt-1 break-words text-sm font-semibold">{name}</p><p className="mt-1 text-xs text-muted-foreground">Data-entry operator</p></div>
    <nav className="space-y-2" aria-label="Data entry navigation">{[{ to: "/validate", label: "Validate & insert", icon: FileCheck2 }, { to: "/data-entry/history", label: "My import history", icon: History }].map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="h-5 w-5 shrink-0" />{label}</NavLink>)}</nav>
    <Button variant="outline" className="mt-auto min-h-11 justify-start gap-3" onClick={() => { setMenuOpen(false); localStorage.removeItem("token"); localStorage.removeItem("role"); localStorage.removeItem("userName"); navigate("/", { replace: true }); }}><LogOut className="h-4 w-4" />Sign out</Button>
  </div>;
  return <div className="min-h-screen bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto border-r bg-background lg:flex"><div className="border-b px-6 py-6"><p className="text-xl font-bold">Ekluvya</p><p className="mt-1 text-sm text-muted-foreground">Data-entry workspace</p></div>{navigation}</aside>
    <div className="min-w-0 lg:pl-64">
      <header className="sticky top-0 z-40 flex items-center justify-start gap-x-3 border-b bg-background pl-2 pr-4 pb-3 lg:hidden" style={{ paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild><Button variant="outline" size="icon" className="h-11 w-11 shrink-0" aria-label="Open navigation menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
          <SheetContent side="left" className="flex w-[min(20rem,85vw)] flex-col gap-0 overflow-y-auto p-0"><SheetHeader className="border-b p-5 text-left"><SheetTitle>Ekluvya</SheetTitle><SheetDescription>Data-entry workspace</SheetDescription></SheetHeader>{navigation}</SheetContent>
        </Sheet>
        <div className="min-w-0"><p className="font-semibold">Data-entry workspace</p><p className="truncate text-xs text-muted-foreground">{name}</p></div>
      </header>
      <Outlet />
    </div>
  </div>;
}
