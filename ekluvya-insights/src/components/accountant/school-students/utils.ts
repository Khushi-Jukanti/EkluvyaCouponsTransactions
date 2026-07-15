import type { FailedRow, ImportedUser, ImportResult, ImportType } from "./types";

export const importEndpoints: Record<ImportType, string> = {
  "school-students": "/school-students/import",
  "offline-receipts": "/school-students/import-offline-receipts",
};

export const importTypeLabels: Record<ImportType, string> = {
  "school-students": "School Students",
  "offline-receipts": "Offline Receipt Users",
};

export const csvValue = (value: string | number | null | undefined) => {
  const normalized = value === undefined || value === null ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

export const downloadCsv = (
  filename: string,
  rows: Record<string, string | number | null | undefined>[]
) => {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
  ].join("\n");
  const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const getSuccessfulUsers = (result: ImportResult | null) =>
  result?.successfulUsers || result?.mapping || result?.preview || [];

export const getUserDisplayName = (user: ImportedUser) =>
  [user.first_name, user.last_name].filter(Boolean).join(" ") || "-";

export const getSchoolValue = (user: ImportedUser) =>
  user.school_code || user.school_name || "-";

export const inferAdmissionNumber = (user: ImportedUser) => {
  if (user.admission_number) return user.admission_number;
  if (user.school_code && user.username?.startsWith(`${user.school_code}_`)) {
    return user.username.slice(user.school_code.length + 1);
  }

  return user.receipt_no || "-";
};

export const toSuccessExportRows = (users: ImportedUser[], importType: ImportType) =>
  users.map((user) => ({
    username: user.username || "",
    password: importType === "school-students" ? user.password || "" : "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    school_code: user.school_code || "",
    school_name: user.school_name || "",
    admission_number: inferAdmissionNumber(user),
    receipt_no: user.receipt_no || "",
    user_id: user.user_id || "",
    phone: user.phone || "",
    email: user.email || "",
    class: user.class || "",
    section: user.section || "",
    import_status: user.import_status || user.action || "",
    subscription_status: user.subscription_status || "",
  }));

export const toFailedExportRows = (rows: FailedRow[]) =>
  rows.map((row) => ({
    row: row.rowNumber || "",
    username: row.username || "",
    receipt_no: row.receipt_no || "",
    error: row.error,
  }));

export const toCompleteReportRows = (
  users: ImportedUser[],
  failedRows: FailedRow[],
  importType: ImportType
) => [
  ...toSuccessExportRows(users, importType).map((row) => ({
    ...row,
    result_type: "success",
    error: "",
  })),
  ...toFailedExportRows(failedRows).map((row) => ({
    result_type: "failed",
    username: row.username,
    password: "",
    first_name: "",
    last_name: "",
    school_code: "",
    school_name: "",
    admission_number: "",
    receipt_no: row.receipt_no,
    user_id: "",
    phone: "",
    email: "",
    class: "",
    section: "",
    import_status: "Failed",
    subscription_status: "",
    error: row.error,
  })),
];
