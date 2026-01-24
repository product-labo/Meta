import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockAnalysisData } from './mock-data';

export function OverviewTab() {
  const data = mockAnalysisData.overview;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.totalTransactions.toLocaleString()}</p>
            <p className="text-green-600 text-xs mt-1">↑ 12% from last period</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold">{data.uniqueUsers.toLocaleString()}</p>
            </div>
            <div className="mt-3 bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full w-3/4" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value Locked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.totalValue}</p>
            <p className="text-green-600 text-xs mt-1">⬆ $340K this week</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Gas (Gwei)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.avgGas}</p>
            <p className="text-orange-600 text-xs mt-1">Lower than network avg</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.successRate}%</p>
            <p className="text-emerald-600 text-xs mt-1">Industry leading</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Time Range</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-center">{data.timeRange}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {mockAnalysisData.recommendations.map((rec, i) => (
              <li key={i} className="text-sm">{rec}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚡ Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {mockAnalysisData.alerts.map((alert, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${
                alert.severity === 'warning'
                  ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              {alert.message}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}