'use client';

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Server,
  Database,
  Shield,
  Zap,
  Clock,
  RefreshCw,
  BarChart3,
  TrendingUp,
  HardDrive,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  responseTime: number;
  details?: string;
  lastChecked: string;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'error';
  uptime: number;
  checks: HealthCheck[];
  metrics: {
    memoryUsage: {
      used: number;
      total: number;
      percentage: number;
    };
    apiCalls: {
      total: number;
      successful: number;
      failed: number;
      averageResponseTime: number;
    };
    database: {
      connectionStatus: 'connected' | 'disconnected';
      activeConnections: number;
      queryPerformance: number;
    };
  };
  timestamp: string;
}

interface HealthCardProps {
  check: HealthCheck;
}

function HealthCard({ check }: HealthCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getServiceIcon = (service: string) => {
    if (service.includes('Database')) return <Database className="h-4 w-4" />;
    if (service.includes('Authentication'))
      return <Shield className="h-4 w-4" />;
    if (service.includes('API')) return <Server className="h-4 w-4" />;
    if (service.includes('Memory')) return <HardDrive className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card className={`${getStatusColor(check.status)} transition-colors`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getServiceIcon(check.service)}
            <CardTitle className="text-base">{check.service}</CardTitle>
          </div>
          {getStatusIcon(check.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge
              variant={
                check.status === 'healthy'
                  ? 'default'
                  : check.status === 'warning'
                    ? 'secondary'
                    : 'destructive'
              }
              className="text-xs"
            >
              {check.status.toUpperCase()}
            </Badge>
            <span className="text-xs text-gray-500">
              {check.responseTime > 0 ? `${check.responseTime}ms` : '—'}
            </span>
          </div>
          {check.details && (
            <p className="text-sm text-gray-600">{check.details}</p>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            {formatTime(check.lastChecked)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  status?: 'healthy' | 'warning' | 'error';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function MetricCard({
  title,
  value,
  description,
  icon,
  status = 'healthy',
  trend,
}: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`h-4 w-4 ${getStatusColor()}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getStatusColor()}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <p className="text-muted-foreground text-xs">{description}</p>
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            <TrendingUp
              className={`h-3 w-3 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}
            />
            <span
              className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SystemHealthDashboard() {
  const [healthData, setHealthData] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealthData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/system/health');

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      setHealthData(data);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load system health';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHealthData();
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [fetchHealthData]);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  };

  const getOverallStatusIcon = () => {
    if (!healthData) return <Activity className="h-6 w-6 text-gray-500" />;

    switch (healthData.overall) {
      case 'healthy':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Activity className="h-6 w-6 text-gray-500" />;
    }
  };

  if (error && !healthData) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-800">
            <XCircle className="h-5 w-5" />
            <span>System health check failed: {error}</span>
          </div>
          <Button
            onClick={fetchHealthData}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getOverallStatusIcon()}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System Health</h2>
            <p className="text-muted-foreground">
              {healthData && (
                <>
                  Overall status:{' '}
                  <span className="font-medium capitalize">
                    {healthData.overall}
                  </span>
                  <span className="ml-2 text-xs">
                    Last updated {formatTimeAgo(lastRefresh)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchHealthData}
          disabled={isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && !healthData && (
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

      {/* System Metrics */}
      {healthData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              title="System Uptime"
              value={formatUptime(healthData.uptime)}
              description="Process running time"
              icon={<Clock className="h-4 w-4" />}
            />

            <MetricCard
              title="Memory Usage"
              value={`${healthData.metrics.memoryUsage.percentage}%`}
              description={`${healthData.metrics.memoryUsage.used}MB / ${healthData.metrics.memoryUsage.total}MB`}
              icon={<HardDrive className="h-4 w-4" />}
              status={
                healthData.metrics.memoryUsage.percentage > 85
                  ? 'error'
                  : healthData.metrics.memoryUsage.percentage > 70
                    ? 'warning'
                    : 'healthy'
              }
            />

            <MetricCard
              title="API Success Rate"
              value={`${Math.round((healthData.metrics.apiCalls.successful / healthData.metrics.apiCalls.total) * 100)}%`}
              description={`${healthData.metrics.apiCalls.successful}/${healthData.metrics.apiCalls.total} requests`}
              icon={<BarChart3 className="h-4 w-4" />}
              status={
                healthData.metrics.apiCalls.successful /
                  healthData.metrics.apiCalls.total <
                0.95
                  ? 'warning'
                  : 'healthy'
              }
            />

            <MetricCard
              title="Avg Response Time"
              value={`${healthData.metrics.apiCalls.averageResponseTime}ms`}
              description="API response performance"
              icon={<Zap className="h-4 w-4" />}
              status={
                healthData.metrics.apiCalls.averageResponseTime > 1000
                  ? 'warning'
                  : 'healthy'
              }
            />

            <MetricCard
              title="DB Connections"
              value={healthData.metrics.database.activeConnections}
              description={`Status: ${healthData.metrics.database.connectionStatus}`}
              icon={<Database className="h-4 w-4" />}
              status={
                healthData.metrics.database.connectionStatus === 'connected'
                  ? 'healthy'
                  : 'error'
              }
            />
          </div>

          {/* Service Health Checks */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">
              Service Health Checks
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {healthData.checks.map((check, index) => (
                <HealthCard key={index} check={check} />
              ))}
            </div>
          </div>

          {/* System Summary */}
          <Card>
            <CardHeader>
              <CardTitle>System Summary</CardTitle>
              <CardDescription>
                Health check performed at{' '}
                {new Date(healthData.timestamp).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-green-50 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {
                      healthData.checks.filter(c => c.status === 'healthy')
                        .length
                    }
                  </div>
                  <div className="text-sm text-green-700">Healthy Services</div>
                </div>

                <div className="rounded-lg bg-yellow-50 p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {
                      healthData.checks.filter(c => c.status === 'warning')
                        .length
                    }
                  </div>
                  <div className="text-sm text-yellow-700">
                    Warning Services
                  </div>
                </div>

                <div className="rounded-lg bg-red-50 p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {healthData.checks.filter(c => c.status === 'error').length}
                  </div>
                  <div className="text-sm text-red-700">Critical Services</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
