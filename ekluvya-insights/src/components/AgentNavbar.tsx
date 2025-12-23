// components/AgentNavbar.tsx
import { LogOut, User, RefreshCw, BanknoteIcon, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useState, useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

interface AgentNavbarProps {
    agentName?: string;
    onLogoClick?: () => void;
}

interface AgentProfile {
    name: string;
    mobile: string;
    email?: string;
    account_number?: string;
    ifsc_code?: string;
    bank_name?: string;
}

// Form validation schema for account details
const accountDetailsSchema = z.object({
    account_number: z.string()
        .min(9, "Account number must be at least 9 digits")
        .max(18, "Account number cannot exceed 18 digits")
        .regex(/^\d+$/, "Account number must contain only digits"),
    ifsc_code: z.string()
        .length(11, "IFSC code must be 11 characters")
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format (e.g., SBIN0001234)"),
    bank_name: z.string().min(2, "Bank name is required").max(100, "Bank name is too long"),
});

type AccountDetailsFormData = z.infer<typeof accountDetailsSchema>;

const AgentNavbar = ({ agentName, onLogoClick }: AgentNavbarProps) => {
    const navigate = useNavigate();
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [agentProfile, setAgentProfile] = useState<AgentProfile>({
        name: "",
        mobile: "",
    });
    const [showProfile, setShowProfile] = useState(false);
    const [accountDialogOpen, setAccountDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasAccountDetails, setHasAccountDetails] = useState(false);

    // Initialize form
    const form = useForm<AccountDetailsFormData>({
        resolver: zodResolver(accountDetailsSchema),
        defaultValues: {
            account_number: "",
            ifsc_code: "",
            bank_name: "",
        },
    });

    useEffect(() => {
        // Fetch agent profile data
        const fetchAgentProfile = async () => {
            try {
                const response = await api.get("/agent/profile");
                if (response.data) {
                    const profileData = {
                        name: response.data.name || "Agent",
                        mobile: response.data.mobile || "N/A",
                        email: response.data.email,
                        account_number: response.data.account_number,
                        ifsc_code: response.data.ifsc_code,
                        bank_name: response.data.bank_name,
                    };
                    setAgentProfile(profileData);

                    // Check if account details exist
                    const hasDetails = !!(response.data.account_number && response.data.ifsc_code);
                    setHasAccountDetails(hasDetails);

                    // Store in localStorage for persistence
                    localStorage.setItem("agentName", response.data.name || "");
                    localStorage.setItem("agentMobile", response.data.mobile || "");
                    localStorage.setItem("hasAccountDetails", hasDetails.toString());

                    // Set form values if account details exist
                    if (hasDetails) {
                        form.reset({
                            account_number: response.data.account_number,
                            ifsc_code: response.data.ifsc_code,
                            bank_name: response.data.bank_name || "",
                        });
                    }
                }
            } catch (error) {
                console.error("Error fetching agent profile:", error);
                // Fallback to localStorage if API fails
                const storedName = localStorage.getItem("agentName") || agentName || "Agent";
                const storedMobile = localStorage.getItem("agentMobile") || "";
                const storedHasDetails = localStorage.getItem("hasAccountDetails") === "true";

                setAgentProfile({
                    name: storedName,
                    mobile: storedMobile,
                });
                setHasAccountDetails(storedHasDetails);
            }
        };

        fetchAgentProfile();
    }, [agentName, form]);

    const handleLogout = async () => {
        try {
            setLogoutLoading(true);
            await api.post("/auth/logout");

            // Clear local storage
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("userName");
            localStorage.removeItem("agentName");
            localStorage.removeItem("agentMobile");
            localStorage.removeItem("hasAccountDetails");

            navigate("/login");
        } catch (error) {
            console.error("Logout error:", error);
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("userName");
            localStorage.removeItem("agentName");
            localStorage.removeItem("agentMobile");
            localStorage.removeItem("hasAccountDetails");
            navigate("/login");
        } finally {
            setLogoutLoading(false);
        }
    };

    const handleLogoClick = () => {
        if (onLogoClick) {
            onLogoClick();
        } else {
            window.location.reload();
        }
    };

    const handleProfileClick = () => {
        setShowProfile(!showProfile);
    };

    const handleAccountDetailsSubmit = async (data: AccountDetailsFormData) => {
        try {
            setIsSubmitting(true);

            // Format data for backend
            const payload = {
                account_number: data.account_number,
                ifsc_code: data.ifsc_code.toUpperCase(),
                bank_name: data.bank_name,
            };

            // Send to backend API
            const response = await api.post("/agent/update-account-details", payload);

            if (response.status === 200) {
                // Update local state
                setAgentProfile(prev => ({
                    ...prev,
                    ...payload,
                }));
                setHasAccountDetails(true);
                localStorage.setItem("hasAccountDetails", "true");

                // Show success message
                toast.success(
                    hasAccountDetails
                        ? "Account details updated successfully!"
                        : "Account details saved successfully!"
                );

                // Close dialog
                handleCloseDialog();
            }
        } catch (error: any) {
            console.error("Error saving account details:", error);
            toast.error(
                error.response?.data?.message ||
                "Failed to save account details. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatAccountNumber = (accountNumber?: string) => {
        if (!accountNumber) return "Not added";
        // Show only last 4 digits for security
        return `****${accountNumber.slice(-4)}`;
    };

    // Function to close dialog and reset form
    const handleCloseDialog = () => {
        setAccountDialogOpen(false);
        // Reset form to current agent data after a short delay
        setTimeout(() => {
            form.reset({
                account_number: agentProfile.account_number || "",
                ifsc_code: agentProfile.ifsc_code || "",
                bank_name: agentProfile.bank_name || "",
            });
        }, 300);
    };

    // Function to handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            handleCloseDialog();
        }
    };

    // Refresh form data from API
    const refreshFormData = async () => {
        try {
            const response = await api.get("/agent/profile");
            if (response.data) {
                form.reset({
                    account_number: response.data.account_number || "",
                    ifsc_code: response.data.ifsc_code || "",
                    bank_name: response.data.bank_name || "",
                });
            }
        } catch (error) {
            console.error("Error refreshing form data:", error);
        }
    };

    // Handle dialog open/close to refresh data
    useEffect(() => {
        if (accountDialogOpen) {
            // Refresh form data when dialog opens
            refreshFormData();
        }
    }, [accountDialogOpen]);

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">

                    {/* LOGO - Now clickable */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleLogoClick}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            title="Reload page"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                <img
                                    src="/favicon.png"
                                    alt="Ekluvya Agent Logo"
                                    className="h-12 w-12 object-contain"
                                />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold tracking-tight text-left">
                                    Ekluvya Agent Portal
                                </h1>
                            </div>
                        </button>
                    </div>

                    {/* USER PROFILE AND LOGOUT */}
                    <div className="flex items-center gap-4">
                        {/* Account Details Dialog */}
                        <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
                            {/* Custom Portal Implementation */}
                            {accountDialogOpen && (
                                <>
                                    {/* Backdrop with click handler */}
                                    <div
                                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                                        onClick={handleBackdropClick}
                                    />

                                    {/* Dialog positioned in center */}
                                    <div className="fixed w-[90vw] max-w-md z-50 top-1/2 left-1/2 -translate-x-1/2 translate-y-1/2">
                                        <div className="bg-background p-6 shadow-lg rounded-lg border relative">
                                            {/* Close button */}
                                            <button
                                                onClick={handleCloseDialog}
                                                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                                                type="button"
                                            >
                                                <X className="h-4 w-4" />
                                                <span className="sr-only">Close</span>
                                            </button>

                                            <DialogHeader className="pt-4">
                                                <DialogTitle className="text-center text-xl font-semibold">
                                                    {hasAccountDetails ? "Update Account Details" : "Add Bank Account Details"}
                                                </DialogTitle>
                                                <DialogDescription className="text-center">
                                                    {hasAccountDetails
                                                        ? "Update your bank account information for payments"
                                                        : "Add your bank account details to receive payments"}
                                                </DialogDescription>
                                            </DialogHeader>

                                            <Form {...form}>
                                                <form
                                                    onSubmit={form.handleSubmit(handleAccountDetailsSubmit)}
                                                    className="space-y-4 mt-4"
                                                >
                                                    <FormField
                                                        control={form.control}
                                                        name="bank_name"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Bank Name</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Enter bank name"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="account_number"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Account Number</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Enter account number"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="ifsc_code"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>IFSC Code</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Enter IFSC code"
                                                                        {...field}
                                                                        onChange={(e) => {
                                                                            field.onChange(e.target.value.toUpperCase());
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    Format: 4 letters + 0 + 6 alphanumeric (e.g., SBIN0001234)
                                                                </p>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <div className="flex justify-end gap-3 pt-4">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={handleCloseDialog}
                                                            disabled={isSubmitting}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            type="submit"
                                                            disabled={isSubmitting}
                                                            className="min-w-[120px]"
                                                        >
                                                            {isSubmitting ? (
                                                                <>
                                                                    <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                                    Saving...
                                                                </>
                                                            ) : hasAccountDetails ? (
                                                                "Update Details"
                                                            ) : (
                                                                "Save Details"
                                                            )}
                                                        </Button>
                                                    </div>
                                                </form>
                                            </Form>
                                        </div>
                                    </div>
                                </>
                            )}
                        </Dialog>

                        {/* Profile Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20"
                                    title="View profile"
                                >
                                    <User className="h-5 w-5 text-primary" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                {/* Profile Info */}
                                <div className="px-3 py-2">
                                    <div className="flex items-center gap-3 pb-2">
                                        <div className="h-10 w-10 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                                            <User className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <p className="text-sm font-semibold truncate">
                                                {agentProfile.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                Agent Account
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2 border-t">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted-foreground">Mobile</span>
                                            <span className="text-sm font-medium">
                                                {agentProfile.mobile || "Not available"}
                                            </span>
                                        </div>

                                        {agentProfile.email && (
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground">Email</span>
                                                <span className="text-sm font-medium truncate">
                                                    {agentProfile.email}
                                                </span>
                                            </div>
                                        )}

                                        {/* Account Details Section */}
                                        <div className="pt-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    Bank Account Details
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => setAccountDialogOpen(true)}
                                                    title={hasAccountDetails ? "Edit account details" : "Add account details"}
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            {hasAccountDetails ? (
                                                <div className="space-y-2 bg-muted/30 p-2 rounded-md">
                                                    {agentProfile.bank_name && (
                                                        <div className="flex justify-between">
                                                            <span className="text-xs text-muted-foreground">Bank:</span>
                                                            <span className="text-xs font-medium">{agentProfile.bank_name}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between">
                                                        <span className="text-xs text-muted-foreground">Account No:</span>
                                                        <span className="text-xs font-medium">
                                                            {formatAccountNumber(agentProfile.account_number)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-xs text-muted-foreground">IFSC:</span>
                                                        <span className="text-xs font-medium">{agentProfile.ifsc_code}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-2 border border-dashed border-muted-foreground/30 rounded-md">
                                                    <p className="text-xs text-muted-foreground">
                                                        No account details added
                                                    </p>
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        className="text-xs h-auto p-0 mt-1"
                                                        onClick={() => setAccountDialogOpen(true)}
                                                    >
                                                        Click to add
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />

                                {/* Logout Option */}
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="text-destructive focus:text-destructive"
                                    disabled={logoutLoading}
                                >
                                    {logoutLoading ? (
                                        <>
                                            <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Logging out...
                                        </>
                                    ) : (
                                        <>
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Logout
                                        </>
                                    )}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>
        </>
    );
};

export default AgentNavbar;