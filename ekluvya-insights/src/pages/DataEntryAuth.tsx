import { useState } from "react";
import { useDataEntryLightTheme } from "@/hooks/useDataEntryLightTheme";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { dataEntryError } from "@/lib/dataEntry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fields = [
  { key: "name", label: "Full name", type: "text", max: 150, autoComplete: "name" },
  { key: "email", label: "Email", type: "email", max: 254, autoComplete: "email" },
  { key: "phone", label: "Phone number", type: "tel", max: 20, autoComplete: "tel" },
  { key: "school_name", label: "School name", type: "text", max: 200, autoComplete: "organization" },
  { key: "location", label: "School location", type: "text", max: 300, autoComplete: "address-level2" },
  { key: "password", label: "Password", type: "password", max: 72, autoComplete: "new-password" },
] as const;
type Field = typeof fields[number]["key"];

function validateField(key: Field, value: string) {
  if (!value.trim()) return `${fields.find(field => field.key === key)?.label} is required.`;
  if (key === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Enter a valid email address.";
  if (key === "phone" && !/^\d{10,15}$/.test(value.trim().replace(/[\s()+-]/g, ""))) return "Enter a valid phone number with 10–15 digits.";
  if (key === "password") {
    if (value.length < 8) return "Use at least 8 characters.";
    if (new TextEncoder().encode(value).length > 72) return "Password is too long. Use at most 72 bytes (fewer non-English characters).";
  }
  return "";
}

export default function DataEntryAuth() {
  useDataEntryLightTheme();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", school_name: "", location: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  return <main className="min-h-screen bg-background text-foreground flex items-start justify-center px-3 py-4 sm:items-center sm:px-4 sm:py-8">
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-1 p-4 pb-3 sm:px-6 sm:pt-5"><CardTitle className="text-xl leading-tight sm:text-2xl">Register as a data-entry operator</CardTitle><p className="text-sm text-muted-foreground">Validate student details, submit registrations, and track your imports.</p><p className="text-xs text-muted-foreground"><span className="text-red-600" aria-hidden="true">*</span> All fields are required.</p></CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-5">
        <form noValidate className="space-y-3" onSubmit={async event => {
          event.preventDefault();
          if (busy || message) return;
          setSubmitted(true); setError("");
          const invalid = fields.find(field => validateField(field.key, form[field.key]));
          if (invalid) { document.getElementById(`operator-${invalid.key}`)?.focus(); return; }
          setBusy(true); setMessage("");
          try {
              await api.post("/data-entry/register", { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase(), phone: form.phone.trim(), school_name: form.school_name.trim(), location: form.location.trim() });
              setForm(current => ({ ...current, password: "" }));
              setSubmitted(false); setTouched({});
              setMessage("Registration successful. Sign in to start importing students.");
              toast.success("Account created successfully. Please sign in.");
              navigate("/", { replace: true });
          } catch (err) { setError(dataEntryError(err, "Unable to complete your request.")); }
          finally { setBusy(false); }
        }}>
          {fields.map(field => {
            const fieldError = (submitted || touched[field.key]) ? validateField(field.key, form[field.key]) : "";
            const id = `operator-${field.key}`;
            return <div key={field.key} className="space-y-1">
              <Label htmlFor={id}>{field.label} <span className="text-red-600" aria-hidden="true">*</span></Label>
              <Input id={id} required disabled={busy || Boolean(message)} type={field.type} maxLength={field.max} autoComplete={field.autoComplete} inputMode={field.key === "phone" ? "tel" : field.key === "email" ? "email" : undefined} minLength={field.key === "password" ? 8 : undefined} className={`h-11 text-base sm:h-10 sm:text-sm ${fieldError ? "border-red-600 focus-visible:ring-red-600" : ""}`} value={form[field.key]} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? `${id}-error` : field.key === "password" ? "password-hint" : undefined} onBlur={() => setTouched(current => ({ ...current, [field.key]: true }))} onChange={event => { setForm(current => ({ ...current, [field.key]: event.target.value })); setError(""); }} />
              {fieldError && <p id={`${id}-error`} className="text-xs text-red-600" aria-live="polite">{fieldError}</p>}
              {field.key === "password" && !fieldError && <p id="password-hint" className="text-xs text-muted-foreground">Use at least 8 characters.</p>}
            </div>;
          })}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-green-700">{message} <Link className="underline" to="/">Sign in</Link></p>}
          <Button disabled={busy || Boolean(message)} className="h-11 w-full">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account</Button>
        </form>
        <div className="mt-3 text-center text-sm"><Link className="inline-flex min-h-11 items-center text-primary hover:underline" to="/">Already registered? Sign in</Link></div>
      </CardContent>
    </Card>
  </main>;
}
