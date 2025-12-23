import { useEffect, useState, useCallback } from "react";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Users,
    Calendar,
    Phone,
    Mail,
    Download,
    CheckCircle,
    XCircle,
    Search
} from "lucide-react";
import api from "@/lib/api";
import AgentNavbar from "@/components/AgentNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Agent {
    name: string;
    mobile: string;
    location: string;
    couponCode: string;
    email?: string;
}

interface Subscription {
    serialNo: number;
    _id: string;
    transactionId: string;
    userName: string;
    mobile: string;
    email: string;
    couponCode: string;
    amount: number;
    paymentStatus: number;
    paymentStatusText: string;
    createdAt: string;
    formattedDate: string;
    formattedTime: string;
    subscriptionType: string;
}

interface PaginationData {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    pageSize: number;
}

interface Stats {
    totalRevenue: number;
    successCount: number;
    failedCount: number;
    pendingCount: number;
    totalUsers?: number;
}

const AgentDashboard = () => {
    const [agent, setAgent] = useState<Agent | null>(null);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState({
        profile: true,
        subscriptions: true
    });
    const [pagination, setPagination] = useState<PaginationData>({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false,
        pageSize: 15
    });
    const [pageInput, setPageInput] = useState("1");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [stats, setStats] = useState<Stats>({
        totalRevenue: 0,
        successCount: 0,
        failedCount: 0,
        pendingCount: 0,
        totalUsers: 0
    });

    // Fetch agent profile
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get("/agent/profile");
                setAgent(response.data);
                setLoading(prev => ({ ...prev, profile: false }));
            } catch (error) {
                console.error("Error fetching agent profile:", error);
                setLoading(prev => ({ ...prev, profile: false }));
            }
        };
        fetchProfile();
    }, []);

    // Fetch subscriptions with filter - useCallback to prevent infinite loops
    const fetchSubscriptions = useCallback(async (page: number = 1, statusFilter: string = filterStatus) => {
        setLoading(prev => ({ ...prev, subscriptions: true }));
        try {
            const response = await api.get(
                `/agent/subscriptions?page=${page}&limit=15${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`
            );

            if (response.data.success) {
                setSubscriptions(response.data.data);
                setPagination(response.data.pagination);
                setStats(response.data.stats);
                setPageInput(response.data.pagination.currentPage.toString());
            } else {
                console.error("Failed to fetch subscriptions:", response.data.message);
            }
        } catch (error) {
            console.error("Error fetching subscriptions:", error);
        } finally {
            setLoading(prev => ({ ...prev, subscriptions: false }));
        }
    }, [filterStatus]);

    // Initial fetch
    useEffect(() => {
        fetchSubscriptions(1);
    }, [fetchSubscriptions]);

    // Handle filter change
    const handleFilterChange = (status: string) => {
        setFilterStatus(status);
        fetchSubscriptions(1, status);
    };

    // Handle search with debounce
    useEffect(() => {
        if (searchTerm === "") return;

        const timer = setTimeout(() => {
            // Search is done locally, no API call needed
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Pagination handlers
    const handleFirstPage = () => fetchSubscriptions(1, filterStatus);
    const handleLastPage = () => fetchSubscriptions(pagination.totalPages, filterStatus);
    const handlePrevPage = () => {
        if (pagination.hasPrevPage) {
            fetchSubscriptions(pagination.currentPage - 1, filterStatus);
        }
    };
    const handleNextPage = () => {
        if (pagination.hasNextPage) {
            fetchSubscriptions(pagination.currentPage + 1, filterStatus);
        }
    };
    const handlePageInput = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const pageNum = parseInt(pageInput);
            if (pageNum >= 1 && pageNum <= pagination.totalPages) {
                fetchSubscriptions(pageNum, filterStatus);
            } else {
                setPageInput(pagination.currentPage.toString());
            }
        }
    };

    // Filter subscriptions locally for search
    const filteredSubscriptions = subscriptions.filter(sub => {
        const matchesSearch =
            sub.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.mobile.includes(searchTerm) ||
            sub.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    // Download data as CSV
    const handleDownloadCSV = () => {
        const dataToExport = searchTerm ? filteredSubscriptions : subscriptions;

        const headers = ['S.No', 'User Name', 'Mobile', 'Email', 'Amount', 'Date', 'Time', 'Status', 'Coupon Code'];
        const csvContent = [
            headers.join(','),
            ...dataToExport.map(sub => [
                sub.serialNo,
                `"${sub.userName.replace(/"/g, '""')}"`,
                sub.mobile,
                `"${sub.email.replace(/"/g, '""')}"`,
                sub.amount,
                sub.formattedDate,
                sub.formattedTime,
                sub.paymentStatusText,
                sub.couponCode
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agent-subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Clear all filters
    const handleClearFilters = () => {
        setSearchTerm("");
        setFilterStatus("all");
        fetchSubscriptions(1, "all");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            <AgentNavbar agentName={agent?.name} />

            <main className="container mx-auto px-4 py-8">
                {/* WELCOME CARD */}
                <Card className="mb-8">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Welcome back, {agent?.name || "Agent"}!
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">
                                    Manage your subscriptions and track performance
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 text-primary px-4 py-3 rounded-xl">
                                    <div className="text-sm font-medium">Coupon Code</div>
                                    <div className="text-xl font-bold tracking-wider font-mono">
                                        {agent?.couponCode || "N/A"}
                                    </div>
                                </div>

                                <div className="bg-green-500/10 text-green-600 px-4 py-3 rounded-xl">
                                    <div className="text-sm font-medium">Total Users</div>
                                    <div className="text-xl font-bold">
                                        {pagination.totalCount}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                                        {stats.successCount}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                                        {stats.failedCount}
                                    </p>
                                </div>
                                <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* USER TABLE SECTION */}
                <Card>
                    <CardContent className="p-0">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Subscription History
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Users who subscribed using your coupon code
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    <div className="relative">
                                        <Input
                                            placeholder="Search users..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 w-full sm:w-64"
                                        />
                                    </div>

                                    <select
                                        value={filterStatus}
                                        onChange={(e) => handleFilterChange(e.target.value)}
                                        className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="success">Success Only</option>
                                        <option value="failed">Failed Only</option>
                                    </select>

                                    <Button
                                        variant="outline"
                                        onClick={handleDownloadCSV}
                                        className="flex items-center gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Export CSV
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* LOADING STATE */}
                        {loading.subscriptions ? (
                            <div className="p-12 text-center">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading subscription data...</p>
                            </div>
                        ) : (
                            <>
                                {/* TABLE */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                    S.No
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                    User Details
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                    Contact Info
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                    Subscription
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredSubscriptions.map((sub) => (
                                                <tr
                                                    key={`${sub._id}-${sub.paymentStatusText}`}
                                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                                                >
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {sub.serialNo}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            <div className="h-10 w-10 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                                                                <span className="font-medium text-primary">
                                                                    {sub.userName?.charAt(0)?.toUpperCase() || "U"}
                                                                </span>
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {sub.userName}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                    Transaction: {sub.transactionId?.slice(-8) || sub._id?.slice(-8)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Phone className="h-3 w-3 text-gray-400" />
                                                                <span className="text-sm text-gray-900 dark:text-white">
                                                                    {sub.mobile}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="h-3 w-3 text-gray-400" />
                                                                <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                                                    {sub.email}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {formatCurrency(sub.amount)}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                                <Calendar className="h-3 w-3" />
                                                                {sub.formattedDate}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {sub.formattedTime}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                Coupon: <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">
                                                                    {sub.couponCode}
                                                                </code>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge
                                                            variant={
                                                                sub.paymentStatusText === "Success" ? "default" :
                                                                    sub.paymentStatusText === "Failed" ? "destructive" : "secondary"
                                                            }
                                                            className="capitalize"
                                                        >
                                                            {sub.paymentStatusText === "Success" ? (
                                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                            ) : (
                                                                <XCircle className="mr-1 h-3 w-3" />
                                                            )}
                                                            {sub.paymentStatusText}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* EMPTY STATE */}
                                {filteredSubscriptions.length === 0 && !loading.subscriptions && (
                                    <div className="p-12 text-center">
                                        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                                            No subscriptions found
                                        </h3>
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                            {searchTerm || filterStatus !== "all"
                                                ? "Try adjusting your search or filter criteria."
                                                : "Users who subscribe using your coupon code will appear here."}
                                        </p>
                                        {(searchTerm || filterStatus !== "all") && (
                                            <Button
                                                variant="outline"
                                                className="mt-4"
                                                onClick={handleClearFilters}
                                            >
                                                Clear All Filters
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* PAGINATION */}
                                {filteredSubscriptions.length > 0 && (
                                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Showing <span className="font-medium">{((pagination.currentPage - 1) * pagination.pageSize) + 1}</span> to{' '}
                                                <span className="font-medium">
                                                    {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)}
                                                </span> of{' '}
                                                <span className="font-medium">{pagination.totalCount}</span> results
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleFirstPage}
                                                    disabled={!pagination.hasPrevPage || pagination.currentPage === 1}
                                                >
                                                    <ChevronsLeft className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handlePrevPage}
                                                    disabled={!pagination.hasPrevPage}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>

                                                <div className="flex items-center gap-2 mx-2">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Page</span>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        max={pagination.totalPages}
                                                        value={pageInput}
                                                        onChange={(e) => setPageInput(e.target.value)}
                                                        onKeyDown={handlePageInput}
                                                        className="w-16 text-center"
                                                    />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        of {pagination.totalPages}
                                                    </span>
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleNextPage}
                                                    disabled={!pagination.hasNextPage}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleLastPage}
                                                    disabled={!pagination.hasNextPage || pagination.currentPage === pagination.totalPages}
                                                >
                                                    <ChevronsRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
};

export default AgentDashboard;