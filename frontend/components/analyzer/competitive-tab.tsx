import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RadarChart, Radar, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { mockAnalysisData } from './mock-data';

export function CompetitiveTab() {
  const data = mockAnalysisData.competitive;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-gray-800/40 to-gray-700/40 border-gray-500/50">
          <CardHeader>
            <CardTitle className="text-white">Market Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-300 to-gray-200">
                #{data.marketPosition.rank}
              </p>
              <p className="text-gray-400 mt-2">Market Ranking</p>
              <p className="text-2xl font-bold text-white mt-4">{data.marketPosition.share}%</p>
              <p className="text-gray-400">Market Share</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-600/30">
          <CardHeader>
            <CardTitle className="text-white">Competitive Benchmarks</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={data.benchmarks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="metric" stroke="#888" />
                <YAxis stroke="#888" />
                <Radar name="Your Protocol" dataKey="you" stroke="#6B7280" fill="#6B7280" fillOpacity={0.6} />
                <Radar name="Ethereum AVG" dataKey="ethereum" stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.3} />
                <Legend />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #3B82F6' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-green-400">Advantages</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.advantages.map((adv, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  <span className="text-green-400 font-bold">✓</span>
                  <span>{adv}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400">Challenges</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.challenges.map((challenge, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  <span className="text-red-400 font-bold">⚠</span>
                  <span>{challenge}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}