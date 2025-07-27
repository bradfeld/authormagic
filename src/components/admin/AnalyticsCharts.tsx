'use client';

import {
  TrendingUp,
  Users,
  Activity,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  dailyStats: Array<{
    date: string;
    users: number;
    verified: number;
    admins: number;
  }>;
  activityPatterns: {
    daily: number;
    weekly: number;
    monthly: number;
    inactive: number;
  };
  demographics: {
    byRole: {
      admin: number;
      user: number;
    };
    byVerification: {
      verified: number;
      unverified: number;
    };
  };
}

interface AnalyticsChartsProps {
  data: AnalyticsData;
}

const COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280',
};

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const [visibleLines, setVisibleLines] = useState({
    users: true,
    verified: true,
    admins: true,
  });

  // Transform daily stats for charts
  const chartData = useMemo(() => {
    return data.dailyStats.map(day => ({
      ...day,
      date: new Date(day.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      fullDate: day.date,
    }));
  }, [data.dailyStats]);

  // Transform activity patterns for pie chart
  const activityData = useMemo(() => {
    return [
      {
        name: 'Daily Active',
        value: data.activityPatterns.daily,
        color: COLORS.success,
      },
      {
        name: 'Weekly Active',
        value: data.activityPatterns.weekly,
        color: COLORS.primary,
      },
      {
        name: 'Monthly Active',
        value: data.activityPatterns.monthly,
        color: COLORS.warning,
      },
      {
        name: 'Inactive',
        value: data.activityPatterns.inactive,
        color: COLORS.gray,
      },
    ].filter(item => item.value > 0);
  }, [data.activityPatterns]);

  // Transform demographics for charts
  const roleData = useMemo(
    () => [
      {
        name: 'Regular Users',
        value: data.demographics.byRole.user,
        color: COLORS.primary,
      },
      {
        name: 'Administrators',
        value: data.demographics.byRole.admin,
        color: COLORS.secondary,
      },
    ],
    [data.demographics.byRole],
  );

  const verificationData = useMemo(
    () => [
      {
        name: 'Verified',
        value: data.demographics.byVerification.verified,
        color: COLORS.success,
      },
      {
        name: 'Unverified',
        value: data.demographics.byVerification.unverified,
        color: COLORS.warning,
      },
    ],
    [data.demographics.byVerification],
  );

  // Custom tooltip for charts
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="mb-2 font-medium text-gray-900">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      payload: { total: number };
    }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value.toLocaleString()} users (
            {((data.value / data.payload.total) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const toggleLineVisibility = (line: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [line]: !prev[line],
    }));
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="growth">User Growth</TabsTrigger>
          <TabsTrigger value="activity">Activity Patterns</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-4">
          {/* User Growth Line Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    User Growth Over Time
                  </CardTitle>
                  <CardDescription>
                    Daily user registrations and verification trends
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleLineVisibility('users')}
                    className={visibleLines.users ? 'bg-blue-50' : ''}
                  >
                    {visibleLines.users ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                    <span className="ml-1">New Users</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleLineVisibility('verified')}
                    className={visibleLines.verified ? 'bg-green-50' : ''}
                  >
                    {visibleLines.verified ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                    <span className="ml-1">Verified</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleLineVisibility('admins')}
                    className={visibleLines.admins ? 'bg-purple-50' : ''}
                  >
                    {visibleLines.admins ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                    <span className="ml-1">Admins</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {visibleLines.users && (
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      name="New Users"
                      dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                  {visibleLines.verified && (
                    <Line
                      type="monotone"
                      dataKey="verified"
                      stroke={COLORS.success}
                      strokeWidth={2}
                      name="Verified Users"
                      dot={{ fill: COLORS.success, strokeWidth: 2, r: 4 }}
                    />
                  )}
                  {visibleLines.admins && (
                    <Line
                      type="monotone"
                      dataKey="admins"
                      stroke={COLORS.secondary}
                      strokeWidth={2}
                      name="New Admins"
                      dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cumulative Growth Area Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Cumulative User Growth
              </CardTitle>
              <CardDescription>
                Total accumulated user registrations over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={chartData.map((item, index) => ({
                    ...item,
                    cumulative: chartData
                      .slice(0, index + 1)
                      .reduce((sum, day) => sum + day.users, 0),
                  }))}
                >
                  <defs>
                    <linearGradient
                      id="cumulativeGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={COLORS.primary}
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.primary}
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke={COLORS.primary}
                    fillOpacity={1}
                    fill="url(#cumulativeGradient)"
                    name="Total Users"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {/* Activity Patterns */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  User Activity Patterns
                </CardTitle>
                <CardDescription>
                  User engagement based on last sign-in activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activityData.map(item => ({
                        ...item,
                        total: data.summary.totalUsers,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {activityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Activity Breakdown
                </CardTitle>
                <CardDescription>
                  Detailed user activity statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" stroke="#666" fontSize={12} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#666"
                      fontSize={12}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Users">
                      {activityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          {/* Demographics Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Roles Distribution</CardTitle>
                <CardDescription>
                  Breakdown of admin vs regular users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleData.map(item => ({
                        ...item,
                        total: data.summary.totalUsers,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${((percent || 0) * 100).toFixed(1)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {roleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Verification Status</CardTitle>
                <CardDescription>
                  Verified vs unverified user accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={verificationData.map(item => ({
                        ...item,
                        total: data.summary.totalUsers,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${((percent || 0) * 100).toFixed(1)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {verificationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Summary Statistics</CardTitle>
              <CardDescription>
                Key demographic insights and ratios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {(
                      (data.demographics.byRole.admin /
                        data.summary.totalUsers) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-sm text-blue-700">Admin Ratio</div>
                  <div className="mt-1 text-xs text-blue-600">
                    {data.demographics.byRole.admin} of{' '}
                    {data.summary.totalUsers} users
                  </div>
                </div>

                <div className="rounded-lg bg-green-50 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(
                      (data.demographics.byVerification.verified /
                        data.summary.totalUsers) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-sm text-green-700">
                    Verification Rate
                  </div>
                  <div className="mt-1 text-xs text-green-600">
                    {data.demographics.byVerification.verified} verified users
                  </div>
                </div>

                <div className="rounded-lg bg-purple-50 p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(
                      (data.summary.activeUsers / data.summary.totalUsers) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-sm text-purple-700">Active Users</div>
                  <div className="mt-1 text-xs text-purple-600">
                    {data.summary.activeUsers} recently active
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
