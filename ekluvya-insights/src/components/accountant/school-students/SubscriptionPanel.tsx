import { Loader2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubscriptionPlan } from "./types";

type SubscriptionPanelProps = {
  adminToken: string;
  planId: string;
  plans: SubscriptionPlan[];
  isFetchingPlans: boolean;
  importedCount: number;
  assignedCount: number;
  pendingCount: number;
  canAssignLater: boolean;
  isAssigningLater: boolean;
  onAdminTokenChange: (value: string) => void;
  onPlanIdChange: (value: string) => void;
  onFetchPlans: () => void;
  onAssignLater: () => void;
};

const getPlanPrice = (plan: SubscriptionPlan) =>
  plan.total_amount ?? plan.prices?.discounted_price ?? plan.prices?.amount;

const SubscriptionPanel = ({
  adminToken,
  planId,
  plans,
  isFetchingPlans,
  importedCount,
  assignedCount,
  pendingCount,
  canAssignLater,
  isAssigningLater,
  onAdminTokenChange,
  onPlanIdChange,
  onFetchPlans,
  onAssignLater,
}: SubscriptionPanelProps) => (
  <Card className="glass-card">
    <CardHeader>
      <CardTitle className="text-lg">Subscription Management</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div className="space-y-2">
          <Label htmlFor="admin-token">Admin Token</Label>
          <Input
            id="admin-token"
            type="password"
            value={adminToken}
            onChange={(event) => onAdminTokenChange(event.target.value)}
            placeholder="Paste admin token"
          />
        </div>

        <div className="space-y-2">
          <Label>Subscription Plan</Label>
          <Select value={planId} onValueChange={onPlanIdChange}>
            <SelectTrigger>
              <SelectValue placeholder={plans.length ? "Select plan" : "Fetch plans first"} />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => {
                const price = getPlanPrice(plan);

                return (
                  <SelectItem key={plan._id} value={plan._id}>
                    {plan.name}
                    {plan.days ? ` - ${plan.days} days` : ""}
                    {price ? ` - ${plan.prices?.currency_sign || "INR "}${price}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onFetchPlans}
          disabled={isFetchingPlans || !adminToken.trim()}
          className="gap-2"
        >
          {isFetchingPlans ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Fetch Plans
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-background/70 p-3">
          <p className="text-xs text-muted-foreground">Imported Users</p>
          <p className="mt-1 text-2xl font-bold">{importedCount}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
          <p className="text-xs">Subscription Assigned</p>
          <p className="mt-1 text-2xl font-bold">{assignedCount}</p>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-orange-800">
          <p className="text-xs">Subscription Pending</p>
          <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
        </div>
      </div>

      {canAssignLater && (
        <Button
          type="button"
          onClick={onAssignLater}
          disabled={isAssigningLater || !adminToken.trim() || !planId || importedCount === 0}
          className="gap-2"
        >
          {isAssigningLater ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Assign Subscription to Current Import
        </Button>
      )}
    </CardContent>
  </Card>
);

export default SubscriptionPanel;
