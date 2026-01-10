import { useQuery } from "@tanstack/react-query";
import { BASE_URL } from "@/config/api";

interface PaymentDataResponse {
  success: boolean;
  data: Record<string, {
    agent_payment_mode?: string;
    agent_payment_date?: string;
    agent_payment_status?: string;
    agent_payment_amount?: number;
    agent_payment_notes?: string;
    agent_payment_updated_at?: string;
  }>;
}

export const fetchPaymentData = async (transactionIds: string[]): Promise<PaymentDataResponse> => {
  if (transactionIds.length === 0) {
    return { success: true, data: {} };
  }

  const response = await fetch(`${BASE_URL}/agents-db-payments/batch-payment-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transactionIds }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch payment data");
  }

  return response.json();
};

export const usePaymentData = (transactionIds: string[]) => {
  return useQuery({
    queryKey: ["paymentData", transactionIds],
    queryFn: () => fetchPaymentData(transactionIds),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    enabled: transactionIds.length > 0,
  });
};