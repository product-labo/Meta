import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { mockAnalysisData } from './mock-data';

export function UsersTab() {
  const data = mockAnalysisData.users;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-600/30">
          <CardHeader>
            <CardTitle className="text-white">User Behavior</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.behavior}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.behavior.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-600/30">
          <CardHeader>
            <CardTitle className="text-white">User Engagement Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.scores}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="metric" stroke="#888" />
                <YAxis stroke="#888" domain={[0, 10]} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #3B82F6' }} />
                <Bar dataKey="score" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-white">Top Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-4 text-gray-400 font-semibold">Address</th>
                  <th className="text-right py-2 px-4 text-gray-400 font-semibold">Transactions</th>
                  <th className="text-right py-2 px-4 text-gray-400 font-semibold">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((user, i) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4 text-white font-mono">{user.address}</td>
                    <td className="text-right py-3 px-4 text-white">{user.txCount}</td>
                    <td className="text-right py-3 px-4 text-gray-300">{user.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}