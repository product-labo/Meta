import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EnhancedAIInsights } from './enhanced-ai-insights';

interface OverviewTabProps {
  analysisResults: any;
  analysisId?: string;
}

export function OverviewTab({ analysisResults, analysisId }: OverviewTabProps) {
  const results = analysisResults?.results?.target || {};
  const fullReport = results.fullReport || {};
  const summary = fullReport.summary || {};
  const defiMetrics = fullReport.defiMetrics || {};
  const recommendations = fullReport.recommendations || [];
  const alerts = fullReport.alerts || [];
  
  // Format values safely
  const formatValue = (value: any, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    return value;
  };

  const formatCurrency = (value: any) => {
    if (!value || value === 0) return '$0';
    if (typeof value === 'number') {
      return value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : 
             value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : 
             `$${value.toFixed(2)}`;
    }
    return value;
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatValue(summary.totalTransactions, 0).toLocaleString()}</p>
            <p className="text-green-600 text-xs mt-1">
              {summary.successRate ? `${summary.successRate}% success rate` : 'Analysis complete'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold">{formatValue(summary.uniqueUsers, 0).toLocaleString()}</p>
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
            <p className="text-3xl font-bold">{formatCurrency(defiMetrics.tvl)}</p>
            <p className="text-green-600 text-xs mt-1">
              {defiMetrics.liquidityUtilization ? `${defiMetrics.liquidityUtilization}% utilization` : 'TVL tracked'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Gas Used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatValue(summary.avgGasUsed, 0).toLocaleString()}</p>
            <p className="text-orange-600 text-xs mt-1">
              {defiMetrics.gasEfficiency ? `${defiMetrics.gasEfficiency} efficiency` : 'Gas tracked'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatValue(summary.successRate, 100)}%</p>
            <p className="text-emerald-600 text-xs mt-1">Transaction reliability</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Time Range</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-center">{formatValue(summary.timeRange, '24h')}</p>
          </CardContent>
        </Card>
      </div>

      {recommendations.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💡 Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.slice(0, 5).map((rec: string, i: number) => (
                <li key={i} className="text-sm">{rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {alerts.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚡ Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 3).map((alert: any, i: number) => (
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
      )}

      {/* Enhanced AI Insights Section */}
      {analysisId && (
        <EnhancedAIInsights 
          analysisId={analysisId} 
          analysisResults={analysisResults} 
        />
      )}

      {/* Show basic info if no detailed data available */}
      {!fullReport.summary && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analysis completed for contract {results.contract?.address} on {results.contract?.chain}.
              {results.transactions > 0 ? 
                ` Found ${results.transactions} transactions with detailed metrics available.` :
                ' No transactions found in the analyzed block range.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}