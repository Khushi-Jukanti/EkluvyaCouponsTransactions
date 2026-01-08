import { useEffect, useState, useCallback, useRef } from "react";
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
    Search,
    Gift,
    Target,
    Award,
    Trophy,
    Shirt,
    Briefcase,
    Plane,
    AlertCircle,
    RefreshCw,
    Copy, QrCode, Check, Link
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import api from "@/lib/api";
import AgentNavbar from "@/components/AgentNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Agent {
    name: string;
    mobile: string;
    location: string;
    couponCode: string;
    email?: string;
    Coupon_code_url?: string;
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

interface GiftTier {
    name: string;
    icon: any;
    threshold: number;
    gift: string;
    color: string;
    achieved: boolean;
}

// Mock data for fallback
const MOCK_SUBSCRIPTIONS: Subscription[] = [
    {
        serialNo: 1,
        _id: "mock_1",
        transactionId: "TXN001",
        userName: "John Doe",
        mobile: "9876543210",
        email: "john@example.com",
        couponCode: "TEST123",
        amount: 2999,
        paymentStatus: 2,
        paymentStatusText: "Success",
        createdAt: new Date().toISOString(),
        formattedDate: "10 Jan 2025",
        formattedTime: "14:30 PM",
        subscriptionType: "Premium"
    },
    {
        serialNo: 2,
        _id: "mock_2",
        transactionId: "TXN002",
        userName: "Jane Smith",
        mobile: "9876543211",
        email: "jane@example.com",
        couponCode: "TEST123",
        amount: 2999,
        paymentStatus: 3,
        paymentStatusText: "Failed",
        createdAt: new Date().toISOString(),
        formattedDate: "09 Jan 2025",
        formattedTime: "11:45 AM",
        subscriptionType: "Premium"
    },
    {
        serialNo: 3,
        _id: "mock_3",
        transactionId: "TXN003",
        userName: "Bob Johnson",
        mobile: "9876543212",
        email: "bob@example.com",
        couponCode: "TEST123",
        amount: 2999,
        paymentStatus: 2,
        paymentStatusText: "Success",
        createdAt: new Date().toISOString(),
        formattedDate: "08 Jan 2025",
        formattedTime: "16:20 PM",
        subscriptionType: "Premium"
    }
];

const MOCK_STATS = {
    totalRevenue: 8997,
    successCount: 2,
    failedCount: 1,
    pendingCount: 0,
    totalUsers: 3
};

const AgentDashboard = () => {
    const [agent, setAgent] = useState<Agent | null>(null);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState({
        profile: true,
        subscriptions: false
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

    // Gift tiers configuration
    const giftTiers: GiftTier[] = [
        {
            name: "Topper Level 1",
            icon: Shirt,
            threshold: 10,
            gift: "T-Shirt",
            color: "bg-blue-500",
            achieved: false
        },
        {
            name: "Topper Level 2",
            icon: Briefcase,
            threshold: 25,
            gift: "Premium Bag",
            color: "bg-purple-500",
            achieved: false
        },
        {
            name: "Topper Level 3",
            icon: Plane,
            threshold: 50,
            gift: "Foreign Trip",
            color: "bg-red-500",
            achieved: false
        }
    ];

    // Calculate gift eligibility and progress
    const [eligibleTier, setEligibleTier] = useState<GiftTier | null>(null);
    const [nextTier, setNextTier] = useState<GiftTier | null>(null);
    const [subscriptionsRemaining, setSubscriptionsRemaining] = useState(0);
    const [currentTierProgress, setCurrentTierProgress] = useState(0);
    const [nextTierProgress, setNextTierProgress] = useState(0);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isFetching, setIsFetching] = useState(false);
    const [useMockData, setUseMockData] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);

    // Refs for request cancellation and debouncing
    const abortControllerRef = useRef<AbortController | null>(null);
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasFetchedRef = useRef(false);

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
                // Set default agent if profile fails
                setAgent({
                    name: "Agent",
                    mobile: "N/A",
                    location: "N/A",
                    couponCode: "N/A",
                    email: "N/A"
                });
            }
        };
        fetchProfile();
    }, []);

    // Calculate gift eligibility
    const calculateGiftEligibility = useCallback((successCount: number) => {
        // Sort tiers by threshold
        const sortedTiers = [...giftTiers].sort((a, b) => a.threshold - b.threshold);

        // Find current eligible tier
        let currentTier: GiftTier | null = null;
        let nextTier: GiftTier | null = null;

        for (let i = sortedTiers.length - 1; i >= 0; i--) {
            if (successCount >= sortedTiers[i].threshold) {
                currentTier = sortedTiers[i];
                // Find next tier if exists
                if (i < sortedTiers.length - 1) {
                    nextTier = sortedTiers[i + 1];
                }
                break;
            }
        }

        // If no tier achieved yet, next tier is the first one
        if (!currentTier) {
            nextTier = sortedTiers[0];
        }

        // Calculate progress
        let currentProgress = 0;
        let nextProgress = 0;
        let remaining = 0;

        if (currentTier) {
            currentProgress = Math.min(100, (successCount / currentTier.threshold) * 100);

            if (nextTier) {
                remaining = nextTier.threshold - successCount;
                nextProgress = Math.min(100, (successCount / nextTier.threshold) * 100);
            }
        } else if (nextTier) {
            currentProgress = Math.min(100, (successCount / nextTier.threshold) * 100);
            remaining = nextTier.threshold - successCount;
        }

        // Update states
        setEligibleTier(currentTier);
        setNextTier(nextTier);
        setSubscriptionsRemaining(remaining);
        setCurrentTierProgress(currentProgress);
        setNextTierProgress(nextProgress);

        // Update achieved status for display
        sortedTiers.forEach(tier => {
            tier.achieved = successCount >= tier.threshold;
        });

        return { currentTier, nextTier, remaining, currentProgress };
    }, []);

    // Fetch subscriptions with retry logic and cancellation
    const fetchSubscriptions = useCallback(async (page: number = 1, statusFilter: string = filterStatus, forceMock: boolean = false) => {
        // Cancel any ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Clear any pending timeout
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = null;
        }

        // Set fetching flag
        setIsFetching(true);
        setLoading(prev => ({ ...prev, subscriptions: true }));
        setFetchError(null);

        // Create new AbortController for this request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // If force mock or we've already tried too many times
        if (forceMock || retryCount >= 3) {
            setUseMockData(true);
            setTimeout(() => {
                if (!controller.signal.aborted) {
                    console.log("Using mock data");
                    setSubscriptions(MOCK_SUBSCRIPTIONS);
                    setPagination({
                        currentPage: 1,
                        totalPages: 1,
                        totalCount: MOCK_SUBSCRIPTIONS.length,
                        hasNextPage: false,
                        hasPrevPage: false,
                        pageSize: 15
                    });
                    setStats(MOCK_STATS);
                    setPageInput("1");
                    calculateGiftEligibility(MOCK_STATS.successCount);
                    setIsFetching(false);
                    setLoading(prev => ({ ...prev, subscriptions: false }));
                }
            }, 500);
            return;
        }

        try {
            // Add a small delay to prevent rapid successive calls
            await new Promise(resolve => setTimeout(resolve, 100));

            const response = await api.get(
                `/agent/subscriptions?page=${page}&limit=15${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`,
                {
                    timeout: 20000, // 20 second timeout
                    headers: {
                        'Cache-Control': 'no-cache',
                        'X-Request-ID': Date.now().toString()
                    },
                    signal: controller.signal
                }
            );

            if (!controller.signal.aborted && response.data.success) {
                console.log("Successfully fetched subscriptions");
                setSubscriptions(response.data.data);
                setPagination(response.data.pagination);
                setStats(response.data.stats);
                setPageInput(response.data.pagination.currentPage.toString());
                setRetryCount(0);
                setUseMockData(false);

                calculateGiftEligibility(response.data.stats.successCount);
            } else if (!controller.signal.aborted) {
                console.error("API returned error:", response.data.message);
                setFetchError(response.data.message || "Failed to load subscriptions");
            }
        } catch (error: any) {
            // Don't set error if request was aborted
            if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
                console.log("Request was cancelled");
                return;
            }

            console.error("Error fetching subscriptions:", error);

            if (error.code === 'ERR_NETWORK' || error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
                setFetchError("Server is busy. Please try again in a moment.");

                // Auto-retry with exponential backoff (max 2 retries)
                if (retryCount < 2) {
                    const delay = 1000 * Math.pow(2, retryCount); // 1s, 2s
                    console.log(`Retrying in ${delay}ms (attempt ${retryCount + 1}/2)`);

                    fetchTimeoutRef.current = setTimeout(() => {
                        if (!controller.signal.aborted) {
                            setRetryCount(prev => prev + 1);
                            fetchSubscriptions(page, statusFilter, false);
                        }
                    }, delay);
                } else {
                    // Switch to mock data after retries exhausted
                    fetchSubscriptions(page, statusFilter, true);
                }
            } else if (error.response?.status === 429) {
                setFetchError("Too many requests. Please wait a moment.");
            } else {
                setFetchError(error.message || "Network error. Please check your connection.");
                // Switch to mock data on other errors
                fetchSubscriptions(page, statusFilter, true);
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsFetching(false);
                setLoading(prev => ({ ...prev, subscriptions: false }));
            }
        }
    }, [filterStatus, calculateGiftEligibility, retryCount]);

    // Initial fetch - only once
    useEffect(() => {
        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true;
            console.log("Initial fetch on component mount");
            fetchSubscriptions(1);
        }

        // Cleanup function
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
            }
        };
    }, []);

    // Handle filter change with debouncing
    const handleFilterChange = useCallback((status: string) => {
        setFilterStatus(status);

        // Cancel any pending fetch
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        // Debounce the filter change
        fetchTimeoutRef.current = setTimeout(() => {
            setRetryCount(0);
            fetchSubscriptions(1, status);
        }, 300);
    }, [fetchSubscriptions]);

    // Pagination handlers
    const handleFirstPage = useCallback(() => {
        if (!isFetching) {
            setRetryCount(0);
            fetchSubscriptions(1, filterStatus);
        }
    }, [isFetching, fetchSubscriptions, filterStatus]);

    const handlePrevPage = useCallback(() => {
        if (pagination.hasPrevPage && !isFetching) {
            setRetryCount(0);
            fetchSubscriptions(pagination.currentPage - 1, filterStatus);
        }
    }, [pagination.hasPrevPage, pagination.currentPage, isFetching, fetchSubscriptions, filterStatus]);

    const handleNextPage = useCallback(() => {
        if (pagination.hasNextPage && !isFetching) {
            setRetryCount(0);
            fetchSubscriptions(pagination.currentPage + 1, filterStatus);
        }
    }, [pagination.hasNextPage, pagination.currentPage, isFetching, fetchSubscriptions, filterStatus]);

    const handleLastPage = useCallback(() => {
        if (!isFetching) {
            setRetryCount(0);
            fetchSubscriptions(pagination.totalPages, filterStatus);
        }
    }, [isFetching, pagination.totalPages, fetchSubscriptions, filterStatus]);

    const handlePageInput = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isFetching) {
            const pageNum = parseInt(pageInput);
            if (pageNum >= 1 && pageNum <= pagination.totalPages) {
                setRetryCount(0);
                fetchSubscriptions(pageNum, filterStatus);
            } else {
                setPageInput(pagination.currentPage.toString());
            }
        }
    }, [pageInput, pagination.currentPage, pagination.totalPages, isFetching, fetchSubscriptions, filterStatus]);

    // Filter subscriptions locally for search
    const filteredSubscriptions = subscriptions.filter(sub => {
        if (!searchTerm.trim()) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
            sub.userName.toLowerCase().includes(searchLower) ||
            sub.mobile.includes(searchTerm) ||
            sub.email.toLowerCase().includes(searchLower)
        );
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
    const handleClearFilters = useCallback(() => {
        setSearchTerm("");
        setFilterStatus("all");

        // Cancel any pending fetch
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }

        // Debounce the clear action
        fetchTimeoutRef.current = setTimeout(() => {
            setRetryCount(0);
            fetchSubscriptions(1, "all");
        }, 300);
    }, [fetchSubscriptions]);

    // Manual refresh
    const handleManualRefresh = useCallback(() => {
        if (!isFetching) {
            console.log("Manual refresh triggered");
            setRetryCount(0);
            fetchSubscriptions(pagination.currentPage, filterStatus);
        }
    }, [isFetching, pagination.currentPage, filterStatus, fetchSubscriptions]);

    // Retry backend connection
    const retryBackendConnection = useCallback(() => {
        setRetryCount(0);
        setUseMockData(false);
        fetchSubscriptions(pagination.currentPage, filterStatus);
    }, [fetchSubscriptions, pagination.currentPage, filterStatus]);

    // Get achievement message
    const getAchievementMessage = () => {
        if (!eligibleTier) {
            return `You need ${subscriptionsRemaining} more subscription(s) to earn your first gift!`;
        }

        if (nextTier) {
            return `You've earned ${eligibleTier.gift}! Just ${subscriptionsRemaining} more to get ${nextTier.gift}!`;
        }

        return `Congratulations! You've reached the highest level and earned ${eligibleTier.gift}!`;
    };

    // Get encouragement message
    const getEncouragementMessage = () => {
        if (!nextTier) return null;

        return `Hurry up! Get ${subscriptionsRemaining} more subscription(s) to achieve ${nextTier.gift}!`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            <AgentNavbar agentName={agent?.name} />

            <main className="container mx-auto px-4 py-8">
                <Card className="mb-8">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Welcome back, {agent?.name || "Agent"}!
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">
                                    Manage your subscriptions and track your progress towards amazing gifts!
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
                                    {useMockData && (
                                        <div className="text-xs text-yellow-600 mt-1">Demo</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                {agent?.Coupon_code_url && (
                    <Card className="mb-8 border-2 border-primary/20 from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                        <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Link className="h-6 w-6 text-primary" />
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                            Your Personalized Subscription Link and QR Code
                                        </h2>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                                        SHARE THIS LINK or SCAN QR CODE to subscribe <span style={{ color: "darkgreen", font: "bold" }}>without entering coupon code!</span>
                                    </p>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                        <code className="bg-white dark:bg-gray-800 px-4 py-3 rounded-lg font-mono text-sm break-all border border-gray-300 dark:border-gray-600 flex-1 w-full">
                                            {agent.Coupon_code_url}
                                        </code>
                                        <Button
                                            variant="default"
                                            size="lg"
                                            onClick={() => {
                                                navigator.clipboard.writeText(agent.Coupon_code_url!);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className="flex items-center gap-2 min-w-[120px]"
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="h-4 w-4" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-4 w-4" />
                                                    Copy Link
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    {/* <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        <li className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                            No need to manually enter coupon code
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                            Direct payment with your discount applied
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                            You get credit automatically
                                        </li>
                                    </ul> */}
                                </div>

                                <div className="flex flex-col items-center gap-4">
                                    {/* <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => setShowQR(!showQR)}
                                        className="flex items-center gap-3 px-6"
                                    >
                                        <QrCode className="h-5 w-5" />
                                        {showQR ? "Hide QR Code" : "Generate QR Code"}
                                    </Button> */}

                                    {/* {showQR && ( */}
                                    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                                        <QRCodeCanvas
                                            value={agent.Coupon_code_url}
                                            size={200}
                                            level="H"
                                            fgColor="#000000"
                                            bgColor="#ffffff"
                                        />
                                        <p className="text-center text-xs text-gray-600 dark:text-gray-400 mt-3">
                                            Your Personalized QR code <br /> Coupon Code Applied : {agent?.couponCode || "N/A"}
                                        </p>
                                    </div>
                                    {/* )} */}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {/* REFRESH BUTTON */}
                {/* <div className="flex justify-end mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualRefresh}
                        disabled={isFetching}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        {isFetching ? 'Fetching...' : 'Refresh Data'}
                    </Button>
                </div> */}

                {/* ERROR ALERT */}
                {fetchError && (
                    <Alert className="mb-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <AlertDescription className="text-yellow-800 dark:text-yellow-300">
                            <div className="flex justify-between items-center">
                                <span>{fetchError}</span>
                                {useMockData && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={retryBackendConnection}
                                        className="ml-4 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                                    >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Retry Connection
                                    </Button>
                                )}
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* FETCHING INDICATOR */}
                {isFetching && !fetchError && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                            <div className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm">Fetching latest data... {retryCount > 0 && `(Retry ${retryCount}/2)`}</span>
                        </div>
                    </div>
                )}

                {/* ACHIEVEMENT BANNER */}
                <Card className="mb-8 border-2 border-primary/20">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Trophy className="h-6 w-6 text-yellow-500" />
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Achievement Status
                                    </h2>
                                    {useMockData && (
                                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                            Demo Data
                                        </Badge>
                                    )}
                                </div>

                                {eligibleTier ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${eligibleTier.color} text-white`}>
                                                <eligibleTier.icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-semibold">
                                                    🎉 Congratulations! You're eligible for <span className="text-primary">{eligibleTier.gift}</span>
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                    {getAchievementMessage()}
                                                </p>
                                            </div>
                                        </div>

                                        {nextTier && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        Progress to {nextTier.gift}
                                                    </span>
                                                    <span className="font-semibold">
                                                        {stats.successCount}/{nextTier.threshold}
                                                    </span>
                                                </div>
                                                <Progress value={nextTierProgress} className="h-2" />
                                                <p className="text-sm font-medium text-primary">
                                                    {getEncouragementMessage()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-lg font-semibold">
                                            🎯 Working towards your first gift!
                                        </p>
                                        {nextTier && (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        Progress to {nextTier.gift}
                                                    </span>
                                                    <span className="font-semibold">
                                                        {stats.successCount}/{nextTier.threshold}
                                                    </span>
                                                </div>
                                                <Progress value={currentTierProgress} className="h-2" />
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {getAchievementMessage()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* <div className="bg-gradient-to-r from-primary/10 to-blue-100 dark:from-primary/20 dark:to-gray-800 p-4 rounded-xl">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-primary">
                                        {stats.successCount}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Successful Subscriptions
                                    </div>
                                    {useMockData && (
                                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                            (Demo)
                                        </div>
                                    )}
                                </div>
                            </div> */}
                        </div>
                    </CardContent>
                </Card>

                {/* WELCOME CARD */}


                {/* GIFT TIERS DISPLAY */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary" />
                        Gift Tiers & Progress
                        {useMockData && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
                                Demo Data
                            </Badge>
                        )}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {giftTiers.map((tier, index) => (
                            <Card
                                key={tier.name}
                                className={tier.achieved ? "border-2 border-primary" : ""}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-3 rounded-lg ${tier.color} text-white`}>
                                            <tier.icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                                    {tier.name}
                                                </h4>
                                                {tier.achieved && (
                                                    <Badge variant="default" className="bg-green-500">
                                                        <Award className="h-3 w-3 mr-1" />
                                                        Achieved
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {tier.threshold}+ subscriptions = {tier.gift}
                                            </p>
                                            <div className="mt-3 flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${tier.color.replace('bg-', 'bg-')}`}
                                                        style={{
                                                            width: tier.achieved ? '100%' : `${(stats.successCount / tier.threshold) * 100}%`
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium">
                                                    {tier.achieved ? tier.threshold : `${stats.successCount}/${tier.threshold}`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* STATS CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Card className={useMockData ? "border-yellow-300" : ""}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
                                        {useMockData && (
                                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                                                Demo
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                                        {stats.successCount}
                                    </p>
                                    {/* {eligibleTier && !useMockData && (
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                            Eligible for {eligibleTier.gift} 🎁
                                        </p>
                                    )} */}
                                </div>
                                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={useMockData ? "border-yellow-300" : ""}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                                        {useMockData && (
                                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                                                Demo
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                                        {stats.failedCount}
                                    </p>
                                    {/* {nextTier && !useMockData && subscriptionsRemaining > 0 && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            Need {subscriptionsRemaining} more for {nextTier.gift}
                                        </p>
                                    )} */}
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
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                            Subscription History
                                        </h2>
                                        {useMockData && (
                                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                                Showing Demo Data
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {useMockData
                                            ? "Backend connection issue. Showing sample data."
                                            : "Users who subscribed using your coupon code"}
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    <div className="relative">
                                        <Input
                                            placeholder="Search users..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 w-full sm:w-64"
                                            disabled={isFetching}
                                        />
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    </div>

                                    <select
                                        value={filterStatus}
                                        onChange={(e) => handleFilterChange(e.target.value)}
                                        className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white disabled:opacity-50"
                                        disabled={isFetching}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="success">Success Only</option>
                                        <option value="failed">Failed Only</option>
                                    </select>

                                    <Button
                                        variant="outline"
                                        onClick={handleDownloadCSV}
                                        className="flex items-center gap-2"
                                        disabled={isFetching || subscriptions.length === 0}
                                    >
                                        <Download className="h-4 w-4" />
                                        Export CSV
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* LOADING STATE */}
                        {loading.subscriptions && !useMockData ? (
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
                                                <th className="px-6 py-3 text-left text-xs font-medium text-white dark:text-white uppercase tracking-wider">
                                                    S.No
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-white dark:text-white uppercase tracking-wider">
                                                    User Details
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-white dark:text-white uppercase tracking-wider">
                                                    Contact Info
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-white dark:text-white uppercase tracking-wider">
                                                    Subscription
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-white dark:text-white uppercase tracking-wider">
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
                                        <p className="mt-2 text-sm text-grey-600 dark:text-grey-400 text-center align-middle justify-center">
                                            {searchTerm || filterStatus !== "all"
                                                ? "Try adjusting your search or filter criteria."
                                                : useMockData
                                                    ? "Sample data not available."
                                                    : "Start promoting your coupon code to get your first gift! Users who subscribe using your coupon will appear here."}
                                        </p>
                                        {(searchTerm || filterStatus !== "all") && (
                                            <Button
                                                variant="outline"
                                                className="mt-4"
                                                onClick={handleClearFilters}
                                                disabled={isFetching}
                                            >
                                                Clear All Filters
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* PAGINATION */}
                                {filteredSubscriptions.length > 0 && pagination.totalPages > 1 && (
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
                                                    disabled={!pagination.hasPrevPage || pagination.currentPage === 1 || isFetching}
                                                >
                                                    <ChevronsLeft className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handlePrevPage}
                                                    disabled={!pagination.hasPrevPage || isFetching}
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
                                                        disabled={isFetching}
                                                    />
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        of {pagination.totalPages}
                                                    </span>
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleNextPage}
                                                    disabled={!pagination.hasNextPage || isFetching}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleLastPage}
                                                    disabled={!pagination.hasNextPage || pagination.currentPage === pagination.totalPages || isFetching}
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