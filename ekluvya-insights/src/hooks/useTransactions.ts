import { useQuery } from "@tanstack/react-query";
import { TransactionsResponse, DateRange } from "@/types";
import { BASE_URL } from "@/config/api";

interface UseTransactionsParams {
  page: number;
  limit: number;
  dateRange?: DateRange;
  coupon?: string;
}

export const fetchTransactions = async ({
  page,
  limit,
  dateRange,
  coupon,
}: UseTransactionsParams): Promise<TransactionsResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    _t: Date.now().toString(),
  });

  if (dateRange?.start) params.append("start", dateRange.start);
  if (dateRange?.end) params.append("end", dateRange.end);
  if (coupon) params.append("coupon", coupon);

  const response = await fetch(`${BASE_URL}/transactions?${params}`, {
    cache: "no-cache", // ← THIS ALSO HELPS
  });

  if (!response.ok) {
    throw new Error("Failed to fetch transactions");
  }

  return response.json();
};

export const useTransactions = (params: UseTransactionsParams) => {
  return useQuery({
    queryKey: ["transactions", params.page, params.dateRange?.start, params.dateRange?.end],
    queryFn: () => fetchTransactions(params),
    staleTime: 0,           // Data becomes stale immediately
    gcTime: 0,              // ← NEW NAME (was cacheTime)
    refetchOnWindowFocus: true,
    retry: 2,
  });
};
