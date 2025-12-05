// export interface Transaction {
//   id: string;
//   user_name: string;
//   phone: string;
//   email: string;
//   coupon_code: string;
//   amount: number;
//   date: string;
//   agent_name: string;
//   agent_phone: string;
//   agent_location: string;
// }

// export interface TransactionsResponse {
//   transactions: Transaction[];
//   total: number;
//   page: number;
//   limit: number;
//   totalPages: number;
//   todayRevenue?: number;
// }

// export interface CouponDetails {
//   code: string;
//   is_active: boolean;
//   discount_percent: number;
//   usage_limit: number;
//   plan: string;
//   agent_name: string;
//   agent_phone: string;
//   agent_email: string;
//   agent_location: string;
// }

// export interface CouponTransactionsResponse {
//   transactions: Transaction[];
//   total: number;
//   coupon_code: string;
// }

// export interface DateRange {
//   start: string;
//   end: string;
// }



// types.ts
export interface Transaction {
  transactionId?: string;
  userName: string;
  phone: string;
  email: string;
  couponText?: string;
  amount: number;
  paymentStatus?: number;
  date_ist: string;
  agentName: string;
  agentPhone: string;
  agentLocation: string;
}

export interface TransactionsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Transaction[];   // ← THIS IS WHAT YOUR BACKEND RETURNS!
  // todayRevenue?: number;  ← Not returned yet, remove or keep optional
}

export interface CouponDetails {
  success: boolean;
  coupon: string;
  active: boolean;
  inDatabase: boolean;
  agent: {
    name: string;
    phone: string;
    email: string;
    location: string;
    type: string;
  } | null;
  discount: number;
  usageLimit: number;
  plan: string;
}

export interface CouponTransactionsResponse {
  success: boolean;
  coupon: string;
  active: boolean;
  agentName: string;
  totalUsed: number;
  data: Transaction[];
  pagination: {
    page: number;
    total: number;
    pages: number;
  };
}

export interface DateRange {
  start: string;
  end: string;
}
