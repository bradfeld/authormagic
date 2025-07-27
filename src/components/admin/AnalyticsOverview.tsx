'use client';

import {
  Users,
  UserCheck,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// import { AnalyticsCharts } from './AnalyticsCharts'; // Temporarily disabled for Phase 1

interface AnalyticsData {
  summary: {
    totalUsers: number;
    newUsers: number;
    userGrowthRate: number;
    verifiedUsers: number;
    verificationRate: number;
    adminUsers: number;
    activeUsers: number;
  };
  comparison?: {
    prevNewUsers: number;
    prevVerificationRate: number;
  };
  metadata: {
    period: number;
    startDate: string;
    endDate: string;
    generatedAt: string;
  };
}

interface MetricCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    comparison?: string;
  };
  format?: 'number' | 'percentage';
}

function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  format = 'number',
}: MetricCardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    if (format === 'percentage') return `${val}%`;
    return val.toLocaleString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground h-4 w-4">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        <p className="text-muted-foreground text-xs">{description}</p>
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span
              className={`text-xs font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </span>
            {trend.comparison && (
              <span className="text-muted-foreground ml-1 text-xs">
                {trend.comparison}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AnalyticsOverviewProps {
  onDataUpdate?: (data: AnalyticsData) => void;
}

export function AnalyticsOverview({ onDataUpdate }: AnalyticsOverviewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [compareEnabled, setCompareEnabled] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        period,
        compare: compareEnabled.toString(),
      });

      const response = await fetch(`/api/admin/analytics/users?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const analyticsData = await response.json();
      setData(analyticsData);
      setLastRefresh(new Date());
      onDataUpdate?.(analyticsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load analytics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [period, compareEnabled, onDataUpdate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(
      () => {
        fetchAnalytics();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-800">
            <TrendingDown className="h-4 w-4" />
            <span>Failed to load analytics: {error}</span>
          </div>
          <Button
            onClick={fetchAnalytics}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Analytics Overview
          </h2>
          <p className="text-muted-foreground">
            {data && (
              <>
                {formatDate(data.metadata.startDate)} -{' '}
                {formatDate(data.metadata.endDate)}
                <span className="ml-2 text-xs">
                  Last updated {formatTimeAgo(lastRefresh)}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompareEnabled(!compareEnabled)}
            className={compareEnabled ? 'border-blue-200 bg-blue-50' : ''}
          >
            Compare Periods
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-200"></div>
                <div className="h-4 w-1/2 rounded bg-gray-200"></div>
              </CardHeader>
              <CardContent>
                <div className="mb-2 h-8 w-1/2 rounded bg-gray-200"></div>
                <div className="h-3 w-full rounded bg-gray-200"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analytics Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Users"
            value={data.summary.totalUsers}
            description="All registered users"
            icon={<Users className="h-4 w-4" />}
            trend={
              data.comparison
                ? {
                    value: calculateTrend(
                      data.summary.newUsers,
                      data.comparison.prevNewUsers,
                    ),
                    isPositive:
                      data.summary.newUsers >= data.comparison.prevNewUsers,
                    comparison: `vs previous ${period} days`,
                  }
                : undefined
            }
          />

          <MetricCard
            title="New Users"
            value={data.summary.newUsers}
            description={`Users joined in last ${period} days`}
            icon={<TrendingUp className="h-4 w-4" />}
            trend={
              data.comparison
                ? {
                    value: calculateTrend(
                      data.summary.newUsers,
                      data.comparison.prevNewUsers,
                    ),
                    isPositive:
                      data.summary.newUsers >= data.comparison.prevNewUsers,
                    comparison: `${data.comparison.prevNewUsers} previously`,
                  }
                : undefined
            }
          />

          <MetricCard
            title="Email Verified"
            value={Math.round(data.summary.verificationRate)}
            description={`${data.summary.verifiedUsers} of ${data.summary.totalUsers} users verified`}
            icon={<UserCheck className="h-4 w-4" />}
            format="percentage"
            trend={
              data.comparison
                ? {
                    value: Math.round(
                      data.summary.verificationRate -
                        data.comparison.prevVerificationRate,
                    ),
                    isPositive:
                      data.summary.verificationRate >=
                      data.comparison.prevVerificationRate,
                    comparison: `${Math.round(data.comparison.prevVerificationRate)}% previously`,
                  }
                : undefined
            }
          />

          <MetricCard
            title="Active Users"
            value={data.summary.activeUsers}
            description="Users active in last 7 days"
            icon={<Activity className="h-4 w-4" />}
          />

          <MetricCard
            title="Admin Users"
            value={data.summary.adminUsers}
            description="Users with admin privileges"
            icon={<Shield className="h-4 w-4" />}
          />

          <MetricCard
            title="Growth Rate"
            value={Math.round(data.summary.userGrowthRate * 100) / 100}
            description={`Growth in last ${period} days`}
            icon={<TrendingUp className="h-4 w-4" />}
            format="percentage"
            trend={{
              value: Math.abs(data.summary.userGrowthRate),
              isPositive: data.summary.userGrowthRate >= 0,
              comparison:
                data.summary.userGrowthRate >= 0 ? 'growing' : 'declining',
            }}
          />

          <MetricCard
            title="Data Updated"
            value={formatTimeAgo(lastRefresh)}
            description="Real-time analytics"
            icon={<Calendar className="h-4 w-4" />}
          />

          <MetricCard
            title="Reporting Period"
            value={`${period} days`}
            description={`${formatDate(data.metadata.startDate)} - ${formatDate(data.metadata.endDate)}`}
            icon={<Calendar className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Interactive Charts */}
      {/* Analytics Charts temporarily disabled for Phase 1 */}
      {/* <div className="mt-8">
        <AnalyticsCharts data={data} />
      </div> */}
    </div>
  );
}
