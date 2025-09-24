'use client';

import { artifact, useArtifact } from '@ai-sdk-tools/artifacts';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3Icon, TrendingUpIcon, UsersIcon } from 'lucide-react';

// Define analytics artifact schema
const AnalyticsData = artifact('analytics', z.object({
  title: z.string(),
  totalUsers: z.number(),
  activeUsers: z.number(),
  conversionRate: z.number(),
  revenue: z.number(),
  metrics: z.array(z.object({
    date: z.string(),
    users: z.number(),
    revenue: z.number(),
  })),
}));

export default function AnalyticsDashboard() {
  const { data, status, progress } = useArtifact(AnalyticsData);

  if (status === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground">Loading analytics data...</p>
              <Progress value={progress * 100} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load analytics data</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="h-5 w-5" />
            Analytics Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3Icon className="h-5 w-5" />
          {data.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <UsersIcon className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Total Users</span>
            </div>
            <p className="text-2xl font-bold">{data.totalUsers.toLocaleString()}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUpIcon className="h-4 w-4" />
              <span className="text-sm text-muted-foreground">Active Users</span>
            </div>
            <p className="text-2xl font-bold">{data.activeUsers.toLocaleString()}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
            </div>
            <p className="text-2xl font-bold">{(data.conversionRate * 100).toFixed(1)}%</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-sm text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold">${data.revenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Recent Metrics</h4>
          <div className="space-y-1">
            {data.metrics.slice(-5).map((metric, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <span className="text-sm">{metric.date}</span>
                <div className="flex gap-4 text-sm">
                  <span>{metric.users} users</span>
                  <span>${metric.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

