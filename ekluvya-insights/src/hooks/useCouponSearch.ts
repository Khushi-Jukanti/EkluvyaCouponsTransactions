import { useQuery } from "@tanstack/react-query";
import { CouponDetails, CouponTransactionsResponse } from "@/types";
import { BASE_URL } from "@/config/api";

export const searchCoupon = async (code: string): Promise<CouponDetails> => {
  const response = await fetch(`${BASE_URL}/coupons/search?q=${encodeURIComponent(code)}`);
  
  if (!response.ok) {
    throw new Error("Coupon not found");
  }
  
  return response.json();
};

export const fetchCouponTransactions = async (
  code: string,
  page: number = 1
): Promise<CouponTransactionsResponse> => {
  const response = await fetch(
    `${BASE_URL}/coupons/${encodeURIComponent(code)}/transactions?page=${page}`
  );
  
  if (!response.ok) {
    throw new Error("Failed to fetch coupon transactions");
  }
  
  return response.json();
};

export const useCouponSearch = (code: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: ["coupon", code],
    queryFn: () => searchCoupon(code),
    enabled: enabled && code.length > 0,
    retry: 1,
    staleTime: 60000,
  });
};

export const useCouponTransactions = (code: string, page: number = 1, enabled: boolean = false) => {
  return useQuery({
    queryKey: ["couponTransactions", code, page],
    queryFn: () => fetchCouponTransactions(code, page),
    enabled: enabled && code.length > 0,
    retry: 1,
    staleTime: 30000,
  });
};
