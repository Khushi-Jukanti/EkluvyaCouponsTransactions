import { useMemo, useState } from "react";
import { FileSpreadsheet, Loader2, Play, ShieldCheck } from "lucide-react";
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

  const isBusy = isPreviewing || isImporting || isAssigningLater;

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              School & Students Management
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Import B2B school students and B2C offline receipt users, validate
              files before insertion, manage subscriptions, and export import results.
            </p>
          </div>

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
