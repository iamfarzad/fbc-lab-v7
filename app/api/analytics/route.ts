export function GET() {
  // Return simple analytics data as JSON
  const analyticsData = {
    title: 'Real-time Analytics',
    totalUsers: 1350,
    activeUsers: 950,
    conversionRate: 0.14,
    revenue: 52000,
    metrics: [
      { date: '2024-01-01', users: 1200, revenue: 42000 },
      { date: '2024-01-02', users: 1250, revenue: 45000 },
      { date: '2024-01-03', users: 1300, revenue: 48000 },
      { date: '2024-01-04', users: 1350, revenue: 52000 },
    ]
  };

  return Response.json(analyticsData);
}
