export type ImportType = "school-students" | "offline-receipts";

export type ResultFilter = "all" | "success" | "failed" | "skipped";

export type ImportedUser = {
  action?: string;
  receipt_no?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  user_id?: string | null;
  password?: string | null;
  school_code?: string | null;
  school_name?: string | null;
  school_type?: string | null;
  school_address?: string | null;
  branch?: string | null;
  admission_number?: string | null;
  executive_name?: string | null;
  executive_phone?: string | null;
  dob?: string | Date | null;
  gender?: string | null;
  class?: string | null;
  section?: string | null;
  preparing_for?: string | null;
  subscription_status?: string | null;
  payment_status?: string | null;
  receipt_status?: string | null;
  import_status?: string | null;
  rowNumber?: number;
  error?: string;
};

export type FailedRow = {
  rowNumber?: number;
  username?: string;
  receipt_no?: string;
  error: string;
};

export type ImportResult = {
  success: boolean;
  dryRun?: boolean;
  totalRows: number;
  validRows: number;
  readyToInsert?: number;
  readyToProcess?: number;
  inserted: number;
  updated?: number;
  failed: number;
  successfulUsers?: ImportedUser[];
  mapping?: ImportedUser[];
  preview?: ImportedUser[];
  failedRows: FailedRow[];
  summary?: {
    totalRecords?: number;
    successfullyInserted?: number;
    successfullyProcessed?: number;
    inserted?: number;
    updated?: number;
    failedRecords?: number;
    subscriptionAssignmentStatus?: string;
  };
  subscriptionAssignment?: {
    status: string;
    assigned: number;
    failed: number;
    message?: string;
  };
  importLog?: {
    importId: string;
    fileName: string;
  };
  message?: string;
};

export type SubscriptionPlan = {
  _id: string;
  name: string;
  days?: number;
  total_amount?: number;
  prices?: {
    currency_sign?: string;
    discounted_price?: number;
    amount?: number;
  };
};
