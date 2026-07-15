import { FileSpreadsheet, ReceiptText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ImportType } from "./types";

type ImportTypeSelectorProps = {
  value: ImportType;
  onChange: (value: ImportType) => void;
};

const options = [
  {
    value: "school-students" as ImportType,
    title: "Import School Students",
    description: "B2B users with school code, admission number, username and password.",
    icon: FileSpreadsheet,
  },
  {
    value: "offline-receipts" as ImportType,
    title: "Import Offline Receipt Users",
    description: "B2C receipt users with phone/email OTP login and receipt details.",
    icon: ReceiptText,
  },
];

const ImportTypeSelector = ({ value, onChange }: ImportTypeSelectorProps) => (
  <div className="grid gap-3 md:grid-cols-2">
    {options.map((option) => {
      const Icon = option.icon;
      const selected = value === option.value;

      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className="text-left"
        >
          <Card
            className={`h-full border transition ${
              selected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-background/80 hover:border-primary/40"
            }`}
          >
            <CardContent className="flex gap-3 p-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{option.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </CardContent>
          </Card>
        </button>
      );
    })}
  </div>
);

export default ImportTypeSelector;
