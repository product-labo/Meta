import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

interface MetricsTabProps {
  analysisResults: any;
}

export function MetricsTab({ analysisResults }: MetricsTabProps) {
  const results = analysisResults?.results?.target || {};
  const fullReport = results.fullReport || {};
  const defiMetrics = fullReport.defiMetrics || {};
  const userBehavior = fullReport.userBehavior || {};
  
  // Create chart data from real metrics
  const tvlData = [
    { name: 'Current', value: defiMetrics.tvl || 0 }
  ];

  const ratesData = [
    { 
      name: 'Current', 
      borrowing: defiMetrics.borrowingRate || 0, 
      lending: defiMetrics.lendingRate || 0 
    }
  ];

  const ratiosData = [
    { name: 'Volume/TVL', value: Math.round((defiMetrics.volumeToTvlRatio || 0) * 100) },
    { name: 'Fee/Volume', value: Math.round((defiMetrics.feeToVolumeRatio || 0) * 100) },
    { name: 'Impermanent Loss', value: Math.round((defiMetrics.impermanentLoss || 0) * 100) },
    { name: 'Slippage', value: Math.round((defiMetrics.slippageTolerance || 0) * 100) },
  ];

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-600/30">
          <CardHeader>
            <CardTitle className="text-white">TVL Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-4xl font-bold text-white mb-2">
                {formatCurrency(defiMetrics.tvl)}
              </p>
              <p className="text-gray-400">Total Value Locked</p>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Utilization</p>
                  <p className="text-white font-semibold">{formatValue(defiMetrics.liquidityUtilization, 0)}%</p>
                </div>
                <div>
                  <p className="text-gray-400">Active Pools</p>
                  <p className="text-white font-semibold">{formatValue(defiMetrics.activePoolsCount, 0)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-600/30">
          <CardHeader>
            <CardTitle className="text-white">Borrowing & Lending Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ratesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #3B82F6' }} />
                <Legend />
                <Line type="monotone" dataKey="borrowing" stroke="#9CA3AF" strokeWidth={2} name="Borrowing Rate %" />
                <Line type="monotone" dataKey="lending" stroke="#6B7280" strokeWidth={2} name="Lending Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-white">DeFi Ratios</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={ratiosData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ratiosData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#A855F7', '#3B82F6', '#10B981', '#F59E0B'][index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-white">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">Daily Active Users</span>
              <span className="text-white font-bold">{formatValue(defiMetrics.dau, 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">Monthly Active Users</span>
              <span className="text-white font-bold">{formatValue(defiMetrics.mau, 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">24h Volume</span>
              <span className="text-white font-bold">{formatCurrency(defiMetrics.transactionVolume24h)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">Revenue Per User</span>
              <span className="text-white font-bold">{formatCurrency(defiMetrics.revenuePerUser)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">Gas Efficiency</span>
              <span className="text-white font-bold">{formatValue(defiMetrics.gasEfficiency, 'N/A')}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">Cross-Chain Volume</span>
              <span className="text-white font-bold">{formatCurrency(defiMetrics.crossChainVolume)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-400 text-sm">Protocol Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{formatCurrency(defiMetrics.protocolFees)}</p>
            <p className="text-blue-300 text-xs mt-1">Total collected</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 text-sm">Yield Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{formatCurrency(defiMetrics.yieldGenerated)}</p>
            <p className="text-green-300 text-xs mt-1">For users</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-400 text-sm">Staking Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{formatCurrency(defiMetrics.stakingRewards)}</p>
            <p className="text-purple-300 text-xs mt-1">Distributed</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}