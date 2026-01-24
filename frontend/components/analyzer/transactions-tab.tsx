import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { mockAnalysisData } from './mock-data';

export function TransactionsTab() {
  const data = mockAnalysisData.transactions;
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(data.data.length / itemsPerPage);
  const paginatedData = data.data.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  
  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-600/30">
        <CardHeader>
          <CardTitle className="text-white">Transaction Volume Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.volumeTimeline}>
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
                  <th className="text-right py-2 px-4 text-gray-400 font-semibold">Gas</th>
                  <th className="text-center py-2 px-4 text-gray-400 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((tx, i) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4 text-white font-mono text-xs">{tx.hash}</td>
                    <td className="py-3 px-4 text-gray-300 font-mono text-xs">{tx.from}</td>
                    <td className="py-3 px-4 text-gray-300 font-mono text-xs">{tx.to}</td>
                    <td className="text-right py-3 px-4 text-green-400">{tx.value}</td>
                    <td className="text-right py-3 px-4 text-white">{tx.gas}</td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          tx.status === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-gray-400 text-sm">
              Page {currentPage + 1} of {totalPages}
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
        </CardContent>
      </Card>
    </div>
  );
}