import { useQuery } from "@tanstack/react-query";
import { TransactionsResponse, DateRange } from "@/types";
import { BASE_URL } from "@/config/api";

// interface UseTransactionsParams {
//   page: number;
//   limit: number;
//   dateRange?: DateRange;
//   coupon?: string;
//   sortOrder: "desc" | "asc"
// }

interface UseTransactionsParams {
  page?: number;
  limit?: number;
  dateRange: DateRange;
  coupon?: string;
  sortOrder?: "asc" | "desc";
  status?: "all" | "success" | "failed"; // ← NEW: status filter
  search?: string;
  exportAll?: boolean; // ← NEW
}

export const fetchTransactions = async ({
  page,
  limit,
  dateRange,
  coupon,
  sortOrder,
  exportAll = false,
}: UseTransactionsParams): Promise<TransactionsResponse> => {

  const finalLimit = exportAll ? 10000 : limit;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(finalLimit),
    sort: sortOrder,        // 👈 send sorting to backend
    _t: Date.now().toString(),
  });

  if (dateRange?.start) params.append("start", dateRange.start);
  if (dateRange?.end) params.append("end", dateRange.end);
  if (coupon) params.append("coupon", coupon);

  //STATUS PARAM (only if not "all")
  if (status && status !== "all") {
    params.append("status", status); // backend expects "success" or "failed"
  }

  const response = await fetch(`${BASE_URL}/transactions?${params}`, {
    cache: "no-cache"
  });

  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }

  return response.json();
};

export const useTransactions = (params: UseTransactionsParams) => {
  return useQuery({
    queryKey: [
      "transactions",
      params.page,
      params.limit,
      params.dateRange?.start,
      params.dateRange?.end,
      params.coupon,
      params.sortOrder,      // 👈 IMPORTANT: refetch on sort order change!
      params.status,
    ],
    queryFn: () => fetchTransactions(params),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    retry: 2,
  });
};
