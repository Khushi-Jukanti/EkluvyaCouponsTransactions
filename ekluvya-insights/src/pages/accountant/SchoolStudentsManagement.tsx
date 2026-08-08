import { useMemo, useState } from "react";
import { FileSpreadsheet, KeyRound, Loader2, Play, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import ExportSection from "@/components/accountant/school-students/ExportSection";
import ImportOptions from "@/components/accountant/school-students/ImportOptions";
import ImportSummary from "@/components/accountant/school-students/ImportSummary";
import ImportTypeSelector from "@/components/accountant/school-students/ImportTypeSelector";
import PreviewTable from "@/components/accountant/school-students/PreviewTable";
import SubscriptionPanel from "@/components/accountant/school-students/SubscriptionPanel";
import UploadSection from "@/components/accountant/school-students/UploadSection";
import UserManagementTable from "@/components/accountant/school-students/UserManagementTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type {
  ImportResult,
  ImportType,
  SubscriptionPlan,
} from "@/components/accountant/school-students/types";
import {
  getSuccessfulUsers,
  importEndpoints,
  importTypeLabels,
} from "@/components/accountant/school-students/utils";

const SchoolStudentsManagement = () => {
  const [importType, setImportType] = useState<ImportType>("school-students");
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [assignSubscriptions, setAssignSubscriptions] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [planId, setPlanId] = useState("");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFetchingPlans, setIsFetchingPlans] = useState(false);
  const [isAssigningLater, setIsAssigningLater] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    adminToken: "",
    studentId: "",
    password: "",
    confirmPassword: "",
  });
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const users = useMemo(() => getSuccessfulUsers(result), [result]);
  const previewUsers = useMemo(() => getSuccessfulUsers(previewResult), [previewResult]);
  const importedUsers = useMemo(() => getSuccessfulUsers(result), [result]);
  const failedRows = result?.failedRows || [];
  const assignedCount = result?.subscriptionAssignment?.assigned || 0;
  const pendingCount = Math.max(0, importedUsers.length - assignedCount);
  const progressValue = isPreviewing ? 35 : isImporting ? 68 : isAssigningLater ? 82 : 100;

  const resetForNewFile = (nextFile: File | null) => {
    setFile(nextFile);
    setPreviewResult(null);
    setResult(null);
  };

  const buildFormData = (mode: "preview" | "import") => {
    if (!file) return null;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("dryRun", mode === "preview" ? "true" : String(dryRun));
    formData.append("assignSubscriptions", mode === "preview" ? "false" : String(assignSubscriptions));

    if (adminToken.trim()) {
      formData.append("adminToken", adminToken.trim());
    }

    if (planId.trim()) {
      formData.append("planId", planId.trim());
    }

    return formData;
  };

  const runPreview = async () => {
    const formData = buildFormData("preview");

    if (!formData) {
      toast.error("Please select an Excel file");
      return;
    }

    try {
      setIsPreviewing(true);
      const { data } = await api.post<ImportResult>(importEndpoints[importType], formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180000,
      });

      setPreviewResult(data);
      setResult(null);
      toast.success("Preview completed");
    } catch (error: any) {
      const data = error.response?.data;
      setPreviewResult(data || null);
      toast.error(data?.message || "Preview failed");
    } finally {
      setIsPreviewing(false);
    }
  };

  const runImport = async () => {
    const formData = buildFormData("import");

    if (!formData) {
      toast.error("Please select an Excel file");
      return;
    }

    if (assignSubscriptions && (!adminToken.trim() || !planId)) {
      toast.error("Admin token and subscription plan are required");
      return;
    }

    try {
      setIsImporting(true);
      const { data } = await api.post<ImportResult>(importEndpoints[importType], formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 240000,
      });

      if (data.dryRun) {
        setPreviewResult(data);
        setResult(null);
        toast.success("Dry run completed. No users or subscriptions were created.");
      } else {
        setResult(data);
        toast.success("Import completed");
      }
    } catch (error: any) {
      const data = error.response?.data;
      setResult(data || null);
      toast.error(data?.message || "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const fetchPlans = async () => {
    if (!adminToken.trim()) {
      toast.error("Enter admin token first");
      return;
    }

    try {
      setIsFetchingPlans(true);
      const { data } = await api.post<{
        success: boolean;
        subscriptions: SubscriptionPlan[];
        message?: string;
      }>("/school-students/subscriptions", {
        adminToken: adminToken.trim(),
      });

      setPlans(data.subscriptions || []);

      if (data.subscriptions?.length) {
        setPlanId(data.subscriptions[0]._id);
        toast.success("Subscription plans fetched");
      } else {
        toast.warning("No subscription plans found");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch plans");
    } finally {
      setIsFetchingPlans(false);
    }
  };

  const assignSubscriptionsLater = async () => {
    const userIds = importedUsers.map((user) => user.user_id).filter(Boolean);

    if (userIds.length === 0) {
      toast.error("No imported users available for subscription assignment");
      return;
    }

    if (!adminToken.trim() || !planId) {
      toast.error("Admin token and subscription plan are required");
      return;
    }

    try {
      setIsAssigningLater(true);
      const { data } = await api.post("/school-students/assign-subscription", {
        userIds,
        adminToken: adminToken.trim(),
        planId,
        importId: result?.importLog?.importId,
      });

      setResult((current) =>
        current
          ? {
              ...current,
              subscriptionAssignment: data.subscriptionAssignment,
              successfulUsers: current.successfulUsers?.map((user) => ({
                ...user,
                subscription_status: data.subscriptionAssignment?.assigned > 0 ? "Assigned" : "Pending",
              })),
              mapping: current.mapping?.map((user) => ({
                ...user,
                subscription_status: data.subscriptionAssignment?.assigned > 0 ? "Assigned" : "Pending",
              })),
            }
          : current
      );
      toast[data.success ? "success" : "warning"](
        data.success ? "Subscriptions assigned" : "Subscription assignment completed with failures"
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to assign subscriptions");
    } finally {
      setIsAssigningLater(false);
    }
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      adminToken: adminToken.trim(),
      studentId: "",
      password: "",
      confirmPassword: "",
    });
  };

  const openPasswordDialog = () => {
    resetPasswordForm();
    setPasswordDialogOpen(true);
  };

  const validatePasswordForm = () => {
    const studentId = passwordForm.studentId.trim();
    const token = passwordForm.adminToken.trim();

    if (!token) return "Admin auth token is required";
    if (!studentId) return "Student ID is required";
    if (/\s/.test(studentId)) return "Student ID cannot contain spaces";
    if (!passwordForm.password) return "Password is required";
    if (passwordForm.password.length < 6) return "Password must be at least 6 characters";
    if (/\s/.test(passwordForm.password)) return "Password cannot contain spaces";
    if (!passwordForm.confirmPassword) return "Confirm password is required";
    if (passwordForm.password !== passwordForm.confirmPassword) {
      return "Password and confirm password must match";
    }

    return "";
  };

  const changeStudentPassword = async () => {
    const validationMessage = validatePasswordForm();

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      setIsChangingPassword(true);
      const { data } = await api.post("/school-students/change-password", {
        adminToken: passwordForm.adminToken.trim(),
        username: passwordForm.studentId.trim(),
        password: passwordForm.password,
        password_confirmation: passwordForm.confirmPassword,
      });

      toast.success(data.message || "Password changed successfully");
      setPasswordDialogOpen(false);
      resetPasswordForm();
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        "Failed to change password";
      toast.error(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isBusy = isPreviewing || isImporting || isAssigningLater;
  const passwordValidationMessage = validatePasswordForm();

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">
        <div className="space-y-6">
          <div>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                  School & Students Management
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Import B2B school students, B2B SR receipt users, and B2C offline receipt users, validate
                  files before insertion, manage subscriptions, and export import results.
                </p>
              </div>
              <Button type="button" onClick={openPasswordDialog} className="gap-2 md:mt-1">
                <KeyRound className="h-4 w-4" />
                Change Student Password
              </Button>
            </div>
          </div>

          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogContent className="!fixed !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Change Student Password</DialogTitle>
                <DialogDescription>
                  Enter the admin auth token and student ID to update the student password.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password-admin-token">Admin Auth Token</Label>
                  <Input
                    id="password-admin-token"
                    type="password"
                    value={passwordForm.adminToken}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        adminToken: event.target.value,
                      }))
                    }
                    placeholder="Paste admin auth token"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student-id">Student ID</Label>
                  <Input
                    id="student-id"
                    value={passwordForm.studentId}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        studentId: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="KAISM_2425181"
                    className="font-mono uppercase"
                    autoComplete="off"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordForm.password}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Temp@1234"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                      placeholder="Temp@1234"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {passwordValidationMessage && (
                  <p className="text-sm text-muted-foreground">{passwordValidationMessage}</p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordDialogOpen(false)}
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={changeStudentPassword}
                  disabled={isChangingPassword || Boolean(passwordValidationMessage)}
                  className="gap-2"
                >
                  {isChangingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Import Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ImportTypeSelector
                value={importType}
                onChange={(value) => {
                  setImportType(value);
                  setPreviewResult(null);
                  setResult(null);
                }}
              />

              <UploadSection
                file={file}
                isPreviewing={isPreviewing}
                onFileChange={resetForNewFile}
                onPreview={runPreview}
              />

              <ImportOptions
                dryRun={dryRun}
                assignSubscriptions={assignSubscriptions}
                onDryRunChange={setDryRun}
                onAssignSubscriptionsChange={setAssignSubscriptions}
              />

              {isBusy && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {isPreviewing
                        ? "Validating file"
                        : isAssigningLater
                          ? "Assigning subscriptions"
                          : "Running import"}
                    </span>
                    <span>Please wait</span>
                  </div>
                  <Progress value={progressValue} />
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {dryRun
                    ? "Dry run is enabled: this will validate only, without creating users or subscriptions."
                    : `Selected flow: ${importTypeLabels[importType]}`}
                </div>
                <Button
                  type="button"
                  onClick={runImport}
                  disabled={isBusy || !file}
                  className="gap-2"
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {dryRun ? "Run Dry Run" : "Run Import"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {(!dryRun && (assignSubscriptions || importedUsers.length > 0)) && (
            <SubscriptionPanel
              adminToken={adminToken}
              planId={planId}
              plans={plans}
              isFetchingPlans={isFetchingPlans}
              importedCount={importedUsers.length}
              assignedCount={assignedCount}
              pendingCount={pendingCount}
              canAssignLater={Boolean(result && !assignSubscriptions && importedUsers.length > 0)}
              isAssigningLater={isAssigningLater}
              onAdminTokenChange={(value) => {
                setAdminToken(value);
                setPlans([]);
                setPlanId("");
              }}
              onPlanIdChange={setPlanId}
              onFetchPlans={fetchPlans}
              onAssignLater={assignSubscriptionsLater}
            />
          )}

          {previewResult && !result && (
            <PreviewTable
              users={previewUsers}
              failedRows={previewResult.failedRows || []}
              importType={importType}
            />
          )}

          {result && (
            <>
              <ImportSummary result={result} />
              <UserManagementTable
                users={users}
                failedRows={failedRows}
                importType={importType}
              />
              <ExportSection users={users} failedRows={failedRows} importType={importType} />

              {result.importLog && (
                <Card className="glass-card">
                  <CardContent className="p-4 text-sm">
                    <span className="text-muted-foreground">Import log: </span>
                    <span className="font-mono">{result.importLog.fileName}</span>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SchoolStudentsManagement;
