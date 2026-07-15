import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type ImportOptionsProps = {
  dryRun: boolean;
  assignSubscriptions: boolean;
  onDryRunChange: (value: boolean) => void;
  onAssignSubscriptionsChange: (value: boolean) => void;
};

const ImportOptions = ({
  dryRun,
  assignSubscriptions,
  onDryRunChange,
  onAssignSubscriptionsChange,
}: ImportOptionsProps) => (
  <div className="grid gap-3 md:grid-cols-2">
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background/70 p-4">
      <Checkbox
        checked={dryRun}
        onCheckedChange={(checked) => onDryRunChange(Boolean(checked))}
        className="mt-1"
      />
      <span>
        <Label className="cursor-pointer">Dry Run</Label>
        <span className="mt-1 block text-sm text-muted-foreground">
          Validate data only. No users will be inserted.
        </span>
      </span>
    </label>

    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background/70 p-4">
      <Checkbox
        checked={assignSubscriptions}
        onCheckedChange={(checked) => onAssignSubscriptionsChange(Boolean(checked))}
        className="mt-1"
      />
      <span>
        <Label className="cursor-pointer">Assign Subscription</Label>
        <span className="mt-1 block text-sm text-muted-foreground">
          Assign a selected plan after successful user creation.
        </span>
      </span>
    </label>
  </div>
);

export default ImportOptions;
