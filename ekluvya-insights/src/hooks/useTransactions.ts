import { useQuery } from "@tanstack/react-query";
import { TransactionsResponse, DateRange } from "@/types";
import { BASE_URL } from "@/config/api";

interface UseTransactionsParams {
  page?: number;
  limit?: number;
  dateRange: DateRange;
  coupon?: string;
  sortOrder?: "asc" | "desc";
  status?: "all" | "success" | "failed";
  search?: string;
  exportAll?: boolean;
  userType?: "b2b" | "b2c";
  schoolCode?: string;
}

export const fetchTransactions = async ({
  page,
  limit,
  dateRange,
  coupon,
  sortOrder,
  exportAll = false,
  status,
  userType = "b2c",
  schoolCode,
}: UseTransactionsParams): Promise<TransactionsResponse> => {
  const finalLimit = exportAll ? 10000 : limit;
  const hasSchoolCode = Boolean(schoolCode?.trim());
  const applyDateFilter = !(userType === "b2b" && hasSchoolCode);

  const params = new URLSearchParams({
    page: String(page),
    limit: String(finalLimit),
    sort: sortOrder,
    _t: Date.now().toString(),
  });

  if (applyDateFilter && dateRange?.start) params.append("start", dateRange.start);
  if (applyDateFilter && dateRange?.end) params.append("end", dateRange.end);
  if (coupon) params.append("coupon", coupon);
  params.append("user_type", userType);

  if (userType === "b2b" && schoolCode?.trim()) {
    params.append("school_code", schoolCode.trim());
  }

  if (status && status !== "all") {
    params.append("status", status);
  }

  const response = await fetch(`${BASE_URL}/transactions?${params}`, {
    cache: "no-cache",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }

  return response.json();
};

export const useTransactions = (params: UseTransactionsParams) => {
  const hasSchoolCode = Boolean(params.schoolCode?.trim());
  const applyDateFilter = !(params.userType === "b2b" && hasSchoolCode);

  return useQuery({
    queryKey: [
      "transactions",
      params.page,
      params.limit,
      applyDateFilter ? params.dateRange?.start : "",
      applyDateFilter ? params.dateRange?.end : "",
      params.coupon,
      params.sortOrder,
      params.status,
      params.userType,
      params.schoolCode,
    ],
    queryFn: () => fetchTransactions(params),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    retry: 2,
  });
};
