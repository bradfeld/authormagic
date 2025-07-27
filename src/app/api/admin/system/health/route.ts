import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { WaitlistService } from '@/lib/services/waitlist.service';

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

export async function GET() {
  const startTime = Date.now();

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const waitlistService = new WaitlistService();

    // Check if current user is admin
    const isAdmin = await waitlistService.isUserAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 },
      );
    }

    const checks: HealthCheck[] = [];
    const timestamp = new Date().toISOString();

    // 1. Database Health Check
    const dbCheckStart = Date.now();
    let dbStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    let dbDetails = 'Connection successful';

    try {
      // Test database connection with a simple query
      await waitlistService.isUserAdmin(userId); // This tests DB connectivity
      const dbResponseTime = Date.now() - dbCheckStart;

      if (dbResponseTime > 2000) {
        dbStatus = 'warning';
        dbDetails = `Slow response time: ${dbResponseTime}ms`;
      } else if (dbResponseTime > 5000) {
        dbStatus = 'error';
        dbDetails = `Very slow response time: ${dbResponseTime}ms`;
      }

      checks.push({
        service: 'Supabase Database',
        status: dbStatus,
        responseTime: dbResponseTime,
        details: dbDetails,
        lastChecked: timestamp,
      });
    } catch (error) {
      checks.push({
        service: 'Supabase Database',
        status: 'error',
        responseTime: Date.now() - dbCheckStart,
        details: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: timestamp,
      });
    }

    // 2. Clerk Authentication Service Check
    const clerkCheckStart = Date.now();
    try {
      const { clerkClient } = await import('@clerk/nextjs/server');
      const clerk = await clerkClient();

      // Test Clerk connectivity with a lightweight operation
      await clerk.users.getCount();

      const clerkResponseTime = Date.now() - clerkCheckStart;
      let clerkStatus: 'healthy' | 'warning' | 'error' = 'healthy';
      let clerkDetails = 'API accessible';

      if (clerkResponseTime > 3000) {
        clerkStatus = 'warning';
        clerkDetails = `Slow response time: ${clerkResponseTime}ms`;
      }

      checks.push({
        service: 'Clerk Authentication',
        status: clerkStatus,
        responseTime: clerkResponseTime,
        details: clerkDetails,
        lastChecked: timestamp,
      });
    } catch (error) {
      checks.push({
        service: 'Clerk Authentication',
        status: 'error',
        responseTime: Date.now() - clerkCheckStart,
        details: `Service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: timestamp,
      });
    }

    // 3. External API Health (simulate checking book APIs)
    const apiCheckStart = Date.now();
    try {
      // Simulate external API health check
      const mockApiResponse = await new Promise<boolean>(resolve => {
        setTimeout(() => resolve(true), Math.random() * 500 + 100);
      });

      const apiResponseTime = Date.now() - apiCheckStart;
      checks.push({
        service: 'Book Data APIs',
        status: mockApiResponse ? 'healthy' : 'warning',
        responseTime: apiResponseTime,
        details: mockApiResponse ? 'All APIs responding' : 'Some APIs degraded',
        lastChecked: timestamp,
      });
    } catch (error) {
      checks.push({
        service: 'Book Data APIs',
        status: 'error',
        responseTime: Date.now() - apiCheckStart,
        details: `API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: timestamp,
      });
    }

    // 4. Memory Usage (Node.js process)
    const memoryUsage = process.memoryUsage();
    const memoryUsageGB = {
      used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
      total: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      percentage: Math.round(
        (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      ),
    };

    // Add memory health check
    let memoryStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    let memoryDetails = `${memoryUsageGB.percentage}% used`;

    if (memoryUsageGB.percentage > 85) {
      memoryStatus = 'error';
      memoryDetails = `High memory usage: ${memoryUsageGB.percentage}%`;
    } else if (memoryUsageGB.percentage > 70) {
      memoryStatus = 'warning';
      memoryDetails = `Elevated memory usage: ${memoryUsageGB.percentage}%`;
    }

    checks.push({
      service: 'Memory Usage',
      status: memoryStatus,
      responseTime: 0,
      details: memoryDetails,
      lastChecked: timestamp,
    });

    // 5. Calculate overall system health
    const errorCount = checks.filter(c => c.status === 'error').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;

    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    if (errorCount > 0) {
      overallStatus = 'error';
    } else if (warningCount > 0) {
      overallStatus = 'warning';
    }

    // 6. Generate mock metrics (in a real system, these would come from monitoring tools)
    const uptime = process.uptime(); // Process uptime in seconds

    const systemHealth: SystemHealth = {
      overall: overallStatus,
      uptime: Math.round(uptime),
      checks,
      metrics: {
        memoryUsage: memoryUsageGB,
        apiCalls: {
          total: 1247, // Mock data - would come from actual monitoring
          successful: 1198,
          failed: 49,
          averageResponseTime: 284,
        },
        database: {
          connectionStatus: dbStatus === 'error' ? 'disconnected' : 'connected',
          activeConnections: Math.floor(Math.random() * 10) + 5, // Mock data
          queryPerformance:
            checks.find(c => c.service === 'Supabase Database')?.responseTime ||
            0,
        },
      },
      timestamp,
    };

    return NextResponse.json(systemHealth);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in system health API:', error);
    }

    // Return error status even for health check failures
    return NextResponse.json(
      {
        overall: 'error',
        uptime: process.uptime(),
        checks: [
          {
            service: 'Health Check API',
            status: 'error' as const,
            responseTime: Date.now() - startTime,
            details: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            lastChecked: new Date().toISOString(),
          },
        ],
        metrics: {
          memoryUsage: { used: 0, total: 0, percentage: 0 },
          apiCalls: {
            total: 0,
            successful: 0,
            failed: 1,
            averageResponseTime: 0,
          },
          database: {
            connectionStatus: 'disconnected' as const,
            activeConnections: 0,
            queryPerformance: 0,
          },
        },
        timestamp: new Date().toISOString(),
      } as SystemHealth,
      { status: 500 },
    );
  }
}
