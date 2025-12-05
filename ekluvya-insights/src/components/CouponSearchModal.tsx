// src/components/CouponSearchModal.tsx
import { useState } from "react";
import { Search, User, Phone, Mail, MapPin, Percent, Package, Hash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCouponSearch } from "@/hooks/useCouponSearch";
import { toast } from "sonner";

interface CouponSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewUsers: (code: string) => void;
}

const CouponSearchModal = ({ open, onOpenChange, onViewUsers }: CouponSearchModalProps) => {
  const [searchCode, setSearchCode] = useState("");
  const [searchTrigger, setSearchTrigger] = useState("");

  const { data: coupon, isLoading, error, isFetched } = useCouponSearch(
    searchTrigger,
    searchTrigger.length > 0
  );

  const handleSearch = () => {
    if (!searchCode.trim()) {
      toast.error("Please enter a coupon code");
      return;
    }
    setSearchTrigger(searchCode.trim().toUpperCase());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] glass-card-elevated border-border/50">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Search Coupon Code
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2">
            <Input
              placeholder="Enter coupon code (e.g., ARAM8893)"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              className="font-mono text-lg h-12"
            />
            <Button onClick={handleSearch} disabled={isLoading} className="h-12 px-6" variant="glow">
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>
          </div>

          {error && isFetched && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-center">
              Coupon not found or inactive
            </div>
          )}

          {coupon && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    {coupon.coupon.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-mono text-xl font-bold">{coupon.coupon}</h3>
                    <Badge variant={coupon.active ? "default" : "destructive"} className={coupon.active ? "bg-success" : ""}>
                      {coupon.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="stat-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Percent className="h-4 w-4" />
                    <span className="text-xs">Discount</span>
                  </div>
                  <p className="font-semibold text-lg">{coupon.discount}%</p>
                </div>
                <div className="stat-card">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Hash className="h-4 w-4" />
                    <span className="text-xs">Usage Limit</span>
                  </div>
                  <p className="font-semibold text-lg">{coupon.usageLimit}</p>
                </div>
                <div className="stat-card col-span-2">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Package className="h-4 w-4" />
                    <span className="text-xs">Plan</span>
                  </div>
                  <p className="font-semibold">{coupon.plan}</p>
                </div>
              </div>

              {coupon.agent && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Agent Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <span className="text-sm">{coupon.agent.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-sm">{coupon.agent.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="text-sm truncate">{coupon.agent.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm">{coupon.agent.location}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={() => onViewUsers(coupon.coupon)} className="w-full" variant="glow">
                View All Users Who Used This Coupon
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CouponSearchModal;