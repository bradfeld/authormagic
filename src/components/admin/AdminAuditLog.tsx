'use client';

import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  Download,
  Eye,
  Filter,
  RefreshCw,
  Shield,
  User,
  Users,
  XCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AuditLogEntry {
  id: string;
  action_type: string;
  action_category: string;
  action_description: string;
  performed_by_user_id: string;
  performed_by_email?: string;
  performed_by_name?: string;
  target_user_id?: string;
  target_email?: string;
  target_resource_type?: string;
  target_resource_id?: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface RecentActivity {
  id: string;
  action_type: string;
  action_category: string;
  action_description: string;
  performed_by_user_id: string;
  performed_by_email?: string;
  performed_by_name?: string;
  target_user_id?: string;
  target_email?: string;
  status: string;
  created_at: string;
  time_ago: string;
}

interface AuditStatistics {
  total_events: number;
  events_last_24h: number;
  events_last_7d: number;
  events_by_category: Record<string, number>;
  top_admins: Array<{
    user_id: string;
    email: string;
    count: number;
  }>;
}

interface AuditLogFilters {
  category?: string;
  type?: string;
  performer?: string;
  target?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

interface AuditLogResponse {
  audit_logs: AuditLogEntry[];
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  recent_activity: RecentActivity[];
  statistics?: AuditStatistics;
  filters: AuditLogFilters;
}

export function AdminAuditLog() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);

  // Filter states
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [limit] = useState(25);

  const fetchAuditLogs = useCallback(
    async (page = 0, includeStats = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        // Add filters
        if (filters.category) params.append('category', filters.category);
        if (filters.type) params.append('type', filters.type);
        if (filters.performer) params.append('performer', filters.performer);
        if (filters.target) params.append('target', filters.target);
        if (filters.status) params.append('status', filters.status);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);

        // Add pagination
        params.append('limit', limit.toString());
        params.append('offset', (page * limit).toString());

        if (includeStats) {
          params.append('include_stats', 'true');
        }

        const response = await fetch(`/api/admin/audit?${params}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch audit logs: ${response.status}`);
        }

        const newData = await response.json();
        setData(newData);
        setCurrentPage(page);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load audit logs';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [filters, limit],
  );

  useEffect(() => {
    fetchAuditLogs(0, true);
  }, [fetchAuditLogs]);

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setCurrentPage(0);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(0);
  };

  const exportToCSV = () => {
    if (!data?.audit_logs) return;

    const headers = [
      'Date',
      'Action Type',
      'Category',
      'Description',
      'Performed By',
      'Target',
      'Status',
    ];

    const csvContent = [
      headers.join(','),
      ...data.audit_logs.map(log =>
        [
          new Date(log.created_at).toLocaleString(),
          log.action_type,
          log.action_category,
          `"${log.action_description.replace(/"/g, '""')}"`,
          log.performed_by_email ||
            log.performed_by_name ||
            log.performed_by_user_id,
          log.target_email || log.target_user_id || '',
          log.status,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'user_management':
        return <Users className="h-4 w-4" />;
      case 'system':
        return <Activity className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'configuration':
        return <Filter className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Admin Activity Log
          </h2>
          <p className="text-muted-foreground">
            Track all administrative actions and system events
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchAuditLogs(currentPage, true)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={!data?.audit_logs?.length}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {data?.statistics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
              <Activity className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.statistics.total_events.toLocaleString()}
              </div>
              <p className="text-muted-foreground text-xs">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Last 24 Hours
              </CardTitle>
              <Calendar className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.statistics.events_last_24h}
              </div>
              <p className="text-muted-foreground text-xs">Recent activity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
              <Calendar className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.statistics.events_last_7d}
              </div>
              <p className="text-muted-foreground text-xs">This week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Admins
              </CardTitle>
              <User className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.statistics.top_admins.length}
              </div>
              <p className="text-muted-foreground text-xs">This month</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="logs">Detailed Logs</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        {/* Recent Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Admin Activity</CardTitle>
              <CardDescription>
                Latest administrative actions across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.recent_activity && data.recent_activity.length > 0 ? (
                <div className="space-y-4">
                  {data.recent_activity.map(activity => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 rounded-lg border p-4"
                    >
                      <div className="flex-shrink-0">
                        {getCategoryIcon(activity.action_category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.action_description}
                          </p>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(activity.status)}
                            <span className="text-xs text-gray-500">
                              {activity.time_ago}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          <span>
                            By:{' '}
                            {activity.performed_by_email ||
                              activity.performed_by_name}
                          </span>
                          {activity.target_email && (
                            <span>Target: {activity.target_email}</span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {activity.action_category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No recent activity to display
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={filters.category || ''}
                    onValueChange={value =>
                      handleFilterChange('category', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      <SelectItem value="user_management">
                        User Management
                      </SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="configuration">
                        Configuration
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.status || ''}
                    onValueChange={value => handleFilterChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={filters.start_date || ''}
                    onChange={e =>
                      handleFilterChange('start_date', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={filters.end_date || ''}
                    onChange={e =>
                      handleFilterChange('end_date', e.target.value)
                    }
                  />
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                {data ? `${data.total_count} total entries` : 'Loading...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center">
                  <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin" />
                  <p>Loading audit logs...</p>
                </div>
              ) : error ? (
                <div className="py-8 text-center text-red-600">
                  <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                  <p>{error}</p>
                </div>
              ) : data?.audit_logs && data.audit_logs.length > 0 ? (
                <div className="space-y-2">
                  {data.audit_logs.map(log => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
                    >
                      <div className="flex flex-1 items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getCategoryIcon(log.action_category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {log.action_description}
                            </p>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(log.status)}
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(log.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                            <span>
                              By:{' '}
                              {log.performed_by_email || log.performed_by_name}
                            </span>
                            {log.target_email && (
                              <span>Target: {log.target_email}</span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {log.action_type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEntry(log);
                          setShowDetails(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-gray-500">
                      Showing {currentPage * limit + 1} to{' '}
                      {Math.min((currentPage + 1) * limit, data.total_count)} of{' '}
                      {data.total_count} entries
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 0}
                        onClick={() => fetchAuditLogs(currentPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!data.has_more}
                        onClick={() => fetchAuditLogs(currentPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No audit logs found matching your criteria
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-4">
          {data?.statistics && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Events by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(data.statistics.events_by_category).map(
                      ([category, count]) => (
                        <div
                          key={category}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(category)}
                            <span className="capitalize">
                              {category.replace('_', ' ')}
                            </span>
                          </div>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Active Admins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.statistics.top_admins.map((admin, index) => (
                      <div
                        key={admin.user_id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            #{index + 1}
                          </span>
                          <span>{admin.email}</span>
                        </div>
                        <Badge variant="secondary">{admin.count} actions</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this administrative action
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium">Action Type:</label>
                  <p>{selectedEntry.action_type}</p>
                </div>
                <div>
                  <label className="font-medium">Category:</label>
                  <p className="capitalize">
                    {selectedEntry.action_category.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="font-medium">Status:</label>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(selectedEntry.status)}
                    <span className="capitalize">{selectedEntry.status}</span>
                  </div>
                </div>
                <div>
                  <label className="font-medium">Timestamp:</label>
                  <p>{new Date(selectedEntry.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <label className="font-medium">Description:</label>
                <p className="mt-1">{selectedEntry.action_description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium">Performed By:</label>
                  <p>
                    {selectedEntry.performed_by_email ||
                      selectedEntry.performed_by_name ||
                      selectedEntry.performed_by_user_id}
                  </p>
                </div>
                {selectedEntry.target_email && (
                  <div>
                    <label className="font-medium">Target:</label>
                    <p>{selectedEntry.target_email}</p>
                  </div>
                )}
              </div>

              {selectedEntry.error_message && (
                <div>
                  <label className="font-medium text-red-600">
                    Error Message:
                  </label>
                  <p className="mt-1 text-red-600">
                    {selectedEntry.error_message}
                  </p>
                </div>
              )}

              {(selectedEntry.before_state || selectedEntry.after_state) && (
                <div className="space-y-2">
                  <label className="font-medium">State Changes:</label>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {selectedEntry.before_state && (
                      <div>
                        <p className="font-medium">Before:</p>
                        <pre className="overflow-auto rounded bg-gray-100 p-2">
                          {JSON.stringify(selectedEntry.before_state, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedEntry.after_state && (
                      <div>
                        <p className="font-medium">After:</p>
                        <pre className="overflow-auto rounded bg-gray-100 p-2">
                          {JSON.stringify(selectedEntry.after_state, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
