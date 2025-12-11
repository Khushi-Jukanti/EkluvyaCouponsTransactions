// // src/components/CouponUsersModal.tsx
// import { useState } from "react";
// import { Users, Calendar, Phone, CreditCard, X } from "lucide-react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { useCouponTransactions } from "@/hooks/useCouponSearch";
// import { format, parseISO } from "date-fns";

// interface CouponUsersModalProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   couponCode: string;
// }

// const CouponUsersModal = ({
//   open,
//   onOpenChange,
//   couponCode,
// }: CouponUsersModalProps) => {
//   const [page, setPage] = useState(1);

//   const { data, isLoading } = useCouponTransactions(
//     couponCode,
//     page,
//     open && couponCode.length > 0
//   );

//   const formatDate = (dateString: string) => {
//     try {
//       return format(parseISO(dateString), "MMM d, yyyy h:mm a");
//     } catch {
//       return dateString;
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent
//         className="
//         fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
//         z-[9999] w-[calc(100%-48px)] sm:max-w-[900px] max-h-[85vh]
//         overflow-hidden
//         glass-card-elevated border-border/50"
//       >
//         <DialogHeader>
//           <div className="flex items-center justify-between">
//             <DialogTitle className="text-xl font-semibold flex items-center gap-3">
//               <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
//                 <Users className="h-5 w-5 text-primary-foreground" />
//               </div>
//               <div>
//                 <span>Users for Coupon</span>
//                 <Badge variant="outline" className="ml-2 font-mono">
//                   {couponCode}
//                 </Badge>
//               </div>
//             </DialogTitle>
//           </div>
//         </DialogHeader>

//         <div className="space-y-4">
//           {data && (
//             <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
//               <Users className="h-5 w-5 text-primary" />
//               <span className="font-semibold text-primary">
//                 Total Users: {data.totalUsed}
//               </span>
//             </div>
//           )}

//           <div className="rounded-lg overflow-hidden border border-border/50 max-h-[400px] overflow-y-auto">
//             <Table>
//               <TableHeader className="sticky top-0 bg-card">
//                 <TableRow>
//                   <TableHead>
//                     <Calendar className="h-4 w-4 inline mr-1" />
//                     Date & Time
//                   </TableHead>
//                   <TableHead>User Name</TableHead>
//                   <TableHead>
//                     <Phone className="h-4 w-4 inline mr-1" />
//                     Phone
//                   </TableHead>
//                   <TableHead className="text-right">
//                     <CreditCard className="h-4 w-4 inline mr-1" />
//                     Amount
//                   </TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {isLoading ? (
//                   Array.from({ length: 5 }).map((_, i) => (
//                     <TableRow key={i}>
//                       {Array.from({ length: 4 }).map((_, j) => (
//                         <TableCell key={j}>
//                           <div className="h-4 shimmer rounded w-full" />
//                         </TableCell>
//                       ))}
//                     </TableRow>
//                   ))
//                 ) : !data?.data || data.data.length === 0 ? (
//                   <TableRow>
//                     <TableCell
//                       colSpan={4}
//                       className="h-32 text-center text-muted-foreground"
//                     >
//                       No users found
//                     </TableCell>
//                   </TableRow>
//                 ) : (
//                   data.data.map((t: any, i: number) => (
//                     <TableRow key={i}>
//                       <TableCell className="text-sm">
//                         {formatDate(t.date_ist)}
//                       </TableCell>
//                       <TableCell className="font-medium">
//                         {t.userName}
//                       </TableCell>
//                       <TableCell>{t.phone}</TableCell>
//                       <TableCell className="text-right font-semibold text-success">
//                         ₹{t.amount.toLocaleString()}
//                       </TableCell>
//                     </TableRow>
//                   ))
//                 )}
//               </TableBody>
//             </Table>
//           </div>

//           <Button
//             variant="outline"
//             onClick={() => onOpenChange(false)}
//             className="w-full"
//           >
//             <X className="h-4 w-4 mr-2" /> Close
//           </Button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default CouponUsersModal;



// // src/components/CouponUsersModal.tsx
// import React, { useState, useEffect } from "react";
// import { Users, Calendar, Phone, CreditCard, X } from "lucide-react";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { useCouponTransactions } from "@/hooks/useCouponSearch";
// import { format, parseISO } from "date-fns";

// interface CouponUsersModalProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   couponCode: string;
// }

// const formatDateSafe = (dateString?: string) => {
//   if (!dateString) return "—";
//   try {
//     if (dateString.includes("T")) return format(parseISO(dateString), "dd-MM-yyyy HH:mm:ss");
//     return dateString;
//   } catch {
//     return dateString;
//   }
// };

// const CouponUsersModal: React.FC<CouponUsersModalProps> = ({
//   open,
//   onOpenChange,
//   couponCode,
// }) => {
//   const [page] = useState(1);
//   const { data, isLoading } = useCouponTransactions(couponCode, page, open && couponCode.length > 0);

//   // Sort transactions: latest first
//   const sortedTransactions = React.useMemo(() => {
//     if (!data?.data) return [];
//     return [...data.data].sort((a: any, b: any) => {
//       const dateA = new Date(a.date_ist || a.createdDate || a.createdAt || 0).getTime();
//       const dateB = new Date(b.date_ist || b.createdDate || b.createdAt || 0).getTime();
//       return dateB - dateA; // Descending: newest first
//     });
//   }, [data?.data]);

//   if (!open) return null;

//   return (
//     <div
//       className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
//       aria-modal="true"
//       role="dialog"
//       onClick={() => onOpenChange(false)}
//     >
//       <div className="absolute inset-0 bg-black/60" />
//       <div
//         className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl glass-card-elevated border border-border/50 overflow-hidden shadow-2xl"
//         onClick={(e) => e.stopPropagation()}
//       >
//         {/* Header */}
//         <div className="p-6 border-b border-border/30 flex items-center justify-between">
//           <div className="flex items-center gap-4">
//             <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
//               <Users className="h-6 w-6 text-primary-foreground" />
//             </div>
//             <div>
//               <h2 className="text-2xl font-bold">Users Who Used Coupon</h2>
//               <Badge variant="outline" className="mt-2 text-lg font-mono py-1 px-3">
//                 {couponCode}
//               </Badge>
//             </div>
//           </div>
//           <div className="flex items-center gap-4">
//             {data && (
//               <div className="px-5 py-3 rounded-xl bg-primary/10 text-primary font-bold text-lg">
//                 <Users className="h-5 w-5" />
//                 Total Users: {data.totalUsed ?? 0}
//               </div>
//             )}
//             <Button
//               variant="ghost"
//               size="icon"
//               onClick={() => onOpenChange(false)}
//               className="h-10 w-10"
//             >
//               <X className="h-5 w-5" />
//             </Button>
//           </div>
//         </div>

//         {/* Body */}
//         <div className="p-6">
//           <div className="rounded-xl overflow-hidden border border-border/50">
//             <div className="max-h-[65vh] overflow-y-auto">
//               <Table>
//                 <TableHeader className="bg-muted/50 sticky top-0 z-10">
//                   <TableRow>
//                     <TableHead className="w-[200px]">
//                       <div className="flex items-center gap-2 font-semibold">
//                         <Calendar className="h-4 w-4" /> Date & Time
//                       </div>
//                     </TableHead>
//                     <TableHead className="w-[220px] font-semibold">User Name</TableHead>
//                     <TableHead className="w-[180px] font-semibold">Phone</TableHead>
//                     <TableHead className="text-right w-[140px] font-semibold">
//                       <div className="flex items-center justify-end gap-2">
//                         <CreditCard className="h-4 w-4" /> Amount
//                       </div>
//                     </TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {isLoading ? (
//                     Array.from({ length: 8 }).map((_, i) => (
//                       <TableRow key={i}>
//                         {Array.from({ length: 4 }).map((_, j) => (
//                           <TableCell key={j}>
//                             <div className="h-5 bg-muted/40 rounded shimmer w-full" />
//                           </TableCell>
//                         ))}
//                       </TableRow>
//                     ))
//                   ) : sortedTransactions.length === 0 ? (
//                     <TableRow>
//                       <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
//                         No users have used this coupon yet.
//                       </TableCell>
//                     </TableRow>
//                   ) : (
//                     sortedTransactions.map((t: any, i: number) => (
//                       <TableRow key={t.transactionId ?? i} className="hover:bg-muted/30 transition-colors">
//                         <TableCell className="text-sm font-medium">
//                           {t.date_ist ?? formatDateSafe(t.createdDate ?? t.createdAt)}
//                         </TableCell>
//                         <TableCell className="font-semibold">{t.userName || "—"}</TableCell>
//                         <TableCell className="font-mono">{String(t.phone ?? t.userPhone ?? "—")}</TableCell>
//                         <TableCell className="text-right font-bold text-success text-lg">
//                           ₹{Number(t.amount ?? 0).toLocaleString("en-IN")}
//                         </TableCell>
//                       </TableRow>
//                     ))
//                   )}
//                 </TableBody>
//               </Table>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CouponUsersModal;




// // src/components/CouponUsersModal.tsx
// import React from "react";
// import { Users, Calendar, Phone, CreditCard, X } from "lucide-react";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { useCouponTransactions } from "@/hooks/useCouponSearch";
// import { format, parseISO } from "date-fns";

// // Parses "30-11-2025 15:19:54" correctly
// const parseIndianDate = (dateStr: string): Date => {
//   if (!dateStr) return new Date(0);
//   const [datePart, time] = dateStr.split(" ");
//   const [dd, mm, yyyy] = datePart.split(/[-/]/);
//   const [hh = "00", mi = "00", ss = "00"] = time ? time.split(":") : [];
//   return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`);
// };

// interface Props {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   couponCode: string;
// }

// const formatDate = (date?: string) => {
//   if (!date) return "—";
//   try {
//     return date.includes("T")
//       ? format(parseISO(date), "dd-MM-yyyy HH:mm:ss")
//       : date;
//   } catch {
//     return date;
//   }
// };

// const CouponUsersModal: React.FC<Props> = ({ open, onOpenChange, couponCode }) => {
//   const { data, isLoading } = useCouponTransactions(couponCode, 1, open);

//   const sorted = React.useMemo(() => {
//     if (!data?.data) return [];
//     return [...data.data].sort((a: any, b: any) => {
//       const da = new Date(a.date_ist || a.createdAt || 0).getTime();
//       const db = new Date(b.date_ist || b.createdAt || 0).getTime();
//       return db - da; // Latest first
//     });
//   }, [data?.data]);

//   if (!open) return null;

//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
//       <div className="absolute inset-0 bg-black/60" />
//       <div className="relative bg-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
//         <div className="flex items-center justify-between p-6 border-b">
//           <div className="flex items-center gap-4">
//             <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
//               <Users className="h-6 w-6 text-primary" />
//             </div>
//             <div>
//               <h2 className="text-2xl font-bold">Coupon Users</h2>
//               <Badge variant="outline" className="mt-1 text-lg px-3 py-1 font-mono">
//                 {couponCode}
//               </Badge>
//             </div>
//           </div>
//           <div className="flex items-center gap-4">
//             <div className="text-lg font-bold text-primary">
//               Total Used: {data?.totalUsed ?? 0}
//             </div>
//             <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
//               <X className="h-5 w-5" />
//             </Button>
//           </div>
//         </div>

//         <div className="p-6 max-h-[70vh] overflow-y-auto">
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead className="w-48">Date & Time</TableHead>
//                 <TableHead>User Name</TableHead>
//                 <TableHead>Phone</TableHead>
//                 <TableHead className="text-right">Amount</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {isLoading ? (
//                 <>/* skeleton rows */</>
//               ) : sorted.length === 0 ? (
//                 <TableRow>
//                   <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
//                     No one has used this coupon yet.
//                   </TableCell>
//                 </TableRow>
//               ) : (
//                 sorted.map((t: any) => (
//                   <TableRow key={t.transactionId ?? Math.random()}>
//                     <TableCell className="text-sm">{formatDate(t.date_ist || t.createdAt)}</TableCell>
//                     <TableCell className="font-medium">{t.userName || "—"}</TableCell>
//                     <TableCell className="font-mono">{t.phone || t.userPhone || "—"}</TableCell>
//                     <TableCell className="text-right font-bold text-success">
//                       ₹{Number(t.amount || 0).toLocaleString("en-IN")}
//                     </TableCell>
//                   </TableRow>
//                 ))
//               )}
//             </TableBody>
//           </Table>
//         </div>
//       </div>
//     </div>)
// };

// export default CouponUsersModal;



// src/components/CouponUsersModal.tsx
import React from "react";
import { Users, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCouponTransactions } from "@/hooks/useCouponSearch";

// Parses "30-11-2025 15:19:54" correctly
const parseIndianDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(0);
  const [datePart, time] = dateStr.split(" ");
  const [dd, mm, yyyy] = datePart.split(/[-/]/);
  const [hh = "00", mi = "00", ss = "00"] = time ? time.split(":") : [];
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`);
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  couponCode: string;
}

const CouponUsersModal: React.FC<Props> = ({ open, onOpenChange, couponCode }) => {
  const { data, isLoading } = useCouponTransactions(couponCode, 1, open);

  // Force correct sorting client-side because date string is not ISO
  const sortedTransactions = React.useMemo(() => {
    if (!data?.data || data.data.length === 0) return [];

    return [...data.data].sort((a: any, b: any) => {
      const dateA = parseIndianDate(a.date_ist || "");
      const dateB = parseIndianDate(b.date_ist || "");
      return dateB.getTime() - dateA.getTime(); // latest first
    });
  }, [data?.data]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
      <div className="absolute inset-0 bg-black/70" />
      
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Coupon Users</h2>
              <Badge variant="outline" className="mt-2 text-lg px-4 py-1 font-mono">
                {couponCode}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-xl font-bold text-primary">
              Total Used: <span className="text-3xl">{data?.totalUsed || 0}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 border-b">
              <TableRow>
                <TableHead className="w-[190px]">Date & Time</TableHead>
                <TableHead>User Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right w-[140px]">Amount</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="h-4 w-36 shimmer rounded bg-muted/40" /></TableCell>
                    <TableCell><div className="h-4 w-48 shimmer rounded bg-muted/40" /></TableCell>
                    <TableCell><div className="h-4 w-32 shimmer rounded bg-muted/40" /></TableCell>
                    <TableCell><div className="h-4 w-24 shimmer rounded bg-muted/40 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sortedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedTransactions.map((t: any) => (
                  <TableRow key={t._id || Math.random()} className ="hover:bg-muted/50">
                    <TableCell className="text-sm font-medium">
                      {t.date_ist || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {t.userName || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {t.phone || "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-success text-lg">
                      ₹{Number(t.amount || 0).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default CouponUsersModal;