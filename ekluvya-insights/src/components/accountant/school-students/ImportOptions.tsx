import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ImportType } from "./types";

type ImportOptionsProps = {
  importType: ImportType;
  dryRun: boolean;
  assignSubscriptions: boolean;
  onDryRunChange: (value: boolean) => void;
  onAssignSubscriptionsChange: (value: boolean) => void;
};

const ImportOptions = ({
  importType,
  dryRun,
  assignSubscriptions,
  onDryRunChange,
  onAssignSubscriptionsChange,
}: ImportOptionsProps) => (
  <div className="grid gap-3 md:grid-cols-2">
    {/* <div className="space-y-2 text-sm text-muted-foreground md:col-span-2">
      <p>
        Alternative headers accepted: RECEIPT NO (OR) ADMISSION NO ({importType === "school-students" ? "admission_number" : "receipt_no"}),
        NAME (first_name), SURNAME (last_name), and SCHOOL LOCATION (school_address).
        Existing headers are still supported.
      </p>
      {importType === "school-students" && (
        <>
          <p>
            Sheet columns: RECEIPT NO (OR) ADMISSION NO, NAME, SURNAME, DOB, PHONE,
            EMAIL, CLASS, SCHOOL NAME, SCHOOL LOCATION, EXECUTIVE NAME, EXECUTIVE PHONE.
          </p>
          <p>
            SCHOOL CODE is optional. Usernames contain the first three letters of the name
            followed by five random digits, for example ASH12345, with no spaces or special characters.
            Names with fewer than three letters are padded with X.
            EXECUTIVE NAME and EXECUTIVE PHONE are optional; include either when available.
          </p>
        </>
      )}
    </div> */}
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
