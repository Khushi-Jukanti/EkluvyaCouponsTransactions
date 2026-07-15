import { FileUp, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UploadSectionProps = {
  file: File | null;
  isPreviewing: boolean;
  onFileChange: (file: File | null) => void;
  onPreview: () => void;
};

const UploadSection = ({
  file,
  isPreviewing,
  onFileChange,
  onPreview,
}: UploadSectionProps) => (
  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
    <div className="space-y-2">
      <Label htmlFor="student-sheet">Excel Sheet</Label>
      <Input
        id="student-sheet"
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(event) => onFileChange(event.target.files?.[0] || null)}
      />
      <p className="text-xs text-muted-foreground">
        {file ? file.name : "Upload an Excel file, then preview before running import."}
      </p>
    </div>

    <Button
      type="button"
      variant="outline"
      onClick={onPreview}
      disabled={isPreviewing || !file}
      className="gap-2"
    >
      {isPreviewing ? (
        <SearchCheck className="h-4 w-4 animate-pulse" />
      ) : (
        <FileUp className="h-4 w-4" />
      )}
      Preview File
    </Button>
  </div>
);

export default UploadSection;
