import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';

interface TransactionsTabProps {
  analysisResults: any;
}

export function TransactionsTab({ analysisResults }: TransactionsTabProps) {
  const results = analysisResults?.results?.target || {};
  const fullReport = results.fullReport || {};
  const transactions = fullReport.transactions || [];
  const gasAnalysis = fullReport.gasAnalysis || {};
  
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const paginatedData = transactions.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  // Create volume timeline from transactions
  const volumeTimeline = transactions.length > 0 ? 
    transactions.reduce((acc: any[], tx: any, index: number) => {
      const day = Math.floor(index / Math.max(1, transactions.length / 7)) + 1;
      const existingDay = acc.find(d => d.day === `Day ${day}`);
      if (existingDay) {
        existingDay.volume += tx.valueEth || 0;
      } else {
        acc.push({ day: `Day ${day}`, volume: tx.valueEth || 0 });
      }
      return acc;
    }, []) : 
    [{ day: 'No Data', volume: 0 }];

  const formatValue = (value: any, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    return value;
  };

  const formatCurrency = (value: any) => {
    if (!value || value === 0) return '$0';
    if (typeof value === 'number') {
      return value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : 
             value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : 
             `$${value.toFixed(6)}`;
    }
    return value;
  };

  const formatAddress = (address: string | number) => {
    if (!address) return 'N/A';
    const addr = address.toString();
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatHash = (hash: string | number) => {
    if (!hash) return 'N/A';
    const hashStr = hash.toString();
    return `${hashStr.slice(0, 8)}...${hashStr.slice(-6)}`;
  };
  
  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-600/30">
        <CardHeader>
          <CardTitle className="text-white">Transaction Volume Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={volumeTimeline}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="day" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #9CA3AF' }} />
              <Area type="monotone" dataKey="volume" stroke="#9CA3AF" fillOpacity={1} fill="url(#colorVolume)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gas Analysis Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-400 text-sm">Avg Gas Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {gasAnalysis.averageGasPrice ? 
                (parseInt(gasAnalysis.averageGasPrice) / 1e9).toFixed(1) : 
                'N/A'
              }
            </p>
            <p className="text-blue-300 text-xs mt-1">Gwei</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-400 text-sm">Avg Gas Used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {typeof gasAnalysis.averageGasUsed === 'number' ? 
                gasAnalysis.averageGasUsed.toLocaleString() : 
                formatValue(gasAnalysis.averageGasUsed, 'N/A')
              }
            </p>
            <p className="text-green-300 text-xs mt-1">Gas units</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-400 text-sm">Total Gas Cost (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              ${gasAnalysis.totalGasCostUSD ? gasAnalysis.totalGasCostUSD.toLocaleString() : 'N/A'}
            </p>
            <p className="text-purple-300 text-xs mt-1">USD equivalent</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-900/20 to-orange-800/20 border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-400 text-sm">Failure Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {typeof gasAnalysis.failureRate === 'number' ? 
                gasAnalysis.failureRate : 
                formatValue(gasAnalysis.failureRate, 'N/A')
              }%
            </p>
            <p className="text-orange-300 text-xs mt-1">Failed transactions</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-600/30">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-4 text-gray-400 font-semibold">Hash</th>
                  <th className="text-left py-2 px-4 text-gray-400 font-semibold">From</th>
                  <th className="text-left py-2 px-4 text-gray-400 font-semibold">To</th>
                  <th className="text-right py-2 px-4 text-gray-400 font-semibold">Value</th>
                  <th className="text-right py-2 px-4 text-gray-400 font-semibold">Gas Used</th>
                  <th className="text-right py-2 px-4 text-gray-400 font-semibold">Gas Cost (USD)</th>
                  <th className="text-center py-2 px-4 text-gray-400 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((tx: any, i: number) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4 text-white font-mono text-xs">
                      {formatHash(tx.hash)}
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-mono text-xs">
                      {formatAddress(tx.from)}
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-mono text-xs">
                      {formatAddress(tx.to)}
                      {tx.contractName && (
                        <div className="text-xs text-blue-400 mt-1">
                          {tx.contractName}
                        </div>
                      )}
                    </td>
                    <td className="text-right py-3 px-4 text-green-400">
                      {formatCurrency(tx.valueEth)}
                    </td>
                    <td className="text-right py-3 px-4 text-white">
                      {typeof tx.gasUsed === 'number' ? 
                        tx.gasUsed.toLocaleString() : 
                        formatValue(tx.gasUsed, 'N/A')
                      }
                    </td>
                    <td className="text-right py-3 px-4 text-gray-300">
                      {tx.gasCostEth ? `$${(tx.gasCostEth * 2500).toFixed(2)}` : 'N/A'}
                      <div className="text-xs text-gray-500">{formatCurrency(tx.gasCostEth)} ETH</div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          tx.status === true || tx.status === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {tx.status === true || tx.status === 'success' ? 'success' : 'failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {transactions.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>No transaction data available for this analysis period.</p>
            </div>
          )}
          
          {transactions.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-gray-400 text-sm">
                Page {currentPage + 1} of {totalPages} • {transactions.length} total transactions
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  variant="outline"
                  className="text-gray-300"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1}
                  variant="outline"
                  className="text-gray-300"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}