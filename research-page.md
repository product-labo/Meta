'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, Radar,
  ScatterChart, Scatter, AreaChart, Area
} from 'recharts';

// ============ TYPE & SCHEMA DEFINITIONS ============
const chainLogos = {
  ethereum: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  polygon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
  lisk: 'https://cryptologos.cc/logos/lisk-lsk-logo.svg',
  solana: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  binance: 'https://cryptologos.cc/logos/binancecoin-bnb-logo.svg',
  arbitrum: 'https://cryptologos.cc/logos/arbitrum-arb-logo.svg',
};

const CompetitorSchema = z.object({
  name: z.string().optional().default(''),
  chain: z.string().optional().default(''),
  address: z.string().optional().default(''),
  abi: z.string().optional().default(''),
});

const WizardSchema = z.object({
  startupName: z.string().min(2, 'Startup name required (min 2 characters)'),
  chain: z.string().min(1, 'Chain required'),
  address: z.string().optional().default(''),
  abi: z.string().optional().default(''),
  competitors: z.array(CompetitorSchema).optional(),
  duration: z.enum(['7', '14', '30']).optional().default('7'),
});

type WizardFormData = z.infer<typeof WizardSchema>;

// ============ MOCK DATA ============
const mockAnalysisData = {
  startupName: 'MetaDEX Pro',
  chain: 'ethereum',
  timestamp: new Date().toISOString(),
  overview: {
    totalTransactions: 1245678,
    uniqueUsers: 34567,
    totalValue: '$2.3M',
    avgGas: 145,
    successRate: 98.5,
    timeRange: '7 days',
  },
  metrics: {
    tvl: [
      { name: 'Day 1', value: 850000 },
      { name: 'Day 2', value: 920000 },
      { name: 'Day 3', value: 1100000 },
      { name: 'Day 4', value: 1250000 },
      { name: 'Day 5', value: 1420000 },
      { name: 'Day 6', value: 1680000 },
      { name: 'Day 7', value: 2300000 },
    ],
    rates: [
      { name: 'Mon', borrowing: 3.2, lending: 2.1 },
      { name: 'Tue', borrowing: 3.4, lending: 2.3 },
      { name: 'Wed', borrowing: 3.1, lending: 2.0 },
      { name: 'Thu', borrowing: 3.8, lending: 2.5 },
      { name: 'Fri', borrowing: 3.5, lending: 2.2 },
      { name: 'Sat', borrowing: 3.9, lending: 2.6 },
      { name: 'Sun', borrowing: 4.1, lending: 2.8 },
    ],
    ratios: [
      { name: 'VolumeToTVL', value: 45 },
      { name: 'FeeToVolume', value: 25 },
      { name: 'RewardCost', value: 18 },
      { name: 'Slippage', value: 12 },
    ],
    dau: 8420,
    mau: 34567,
    activePools: 156,
    crossChain: 24,
  },
  users: {
    behavior: [
      { name: 'Whale', value: 5, fill: '#6B7280' },
      { name: 'Bot', value: 12, fill: '#4B5563' },
      { name: 'PowerUser', value: 28, fill: '#9CA3AF' },
      { name: 'NewUser', value: 55, fill: '#D1D5DB' },
    ],
    scores: [
      { metric: 'Loyalty', score: 8.5 },
      { metric: 'Retention', score: 7.8 },
      { metric: 'Growth', score: 9.2 },
      { metric: 'Churn', score: 4.3 },
    ],
    topUsers: [
      { address: '0x1234...5678', txCount: 1203, value: '$450K' },
      { address: '0xabcd...ef01', txCount: 956, value: '$380K' },
      { address: '0x5678...9abc', txCount: 834, value: '$295K' },
      { address: '0xdef0...1234', txCount: 645, value: '$210K' },
      { address: '0x9abc...def0', txCount: 512, value: '$165K' },
    ],
  },
  transactions: {
    data: [
      { hash: '0xabc...', from: '0x123...', to: '0x456...', value: '$1200', gas: 145, status: 'success' },
      { hash: '0xdef...', from: '0x789...', to: '0xabc...', value: '$450', gas: 127, status: 'success' },
      { hash: '0x123...', from: '0x456...', to: '0xdef...', value: '$2100', gas: 156, status: 'failed' },
      { hash: '0x456...', from: '0x789...', to: '0x123...', value: '$890', gas: 139, status: 'success' },
      { hash: '0x789...', from: '0xabc...', to: '0x456...', value: '$560', gas: 151, status: 'success' },
    ],
    volumeTimeline: [
      { day: 'Day 1', volume: 125000 },
      { day: 'Day 2', volume: 148000 },
      { day: 'Day 3', volume: 167000 },
      { day: 'Day 4', volume: 192000 },
      { day: 'Day 5', volume: 215000 },
      { day: 'Day 6', volume: 248000 },
      { day: 'Day 7', volume: 289000 },
    ],
  },
  competitive: {
    marketPosition: { share: 22, rank: 3 },
    advantages: [
      'Lower gas costs (145 avg vs 180 competitors)',
      'Higher success rate (98.5% vs 94% avg)',
      'Faster execution (2.1s avg vs 3.2s)',
      'Better user retention (7.8 score)',
    ],
    challenges: [
      'Limited liquidity pools (156 vs 300+ leaders)',
      'Newer ecosystem (6 months old)',
      'Smaller TVL ($2.3M vs $45M leaders)',
      'Limited cross-chain integration',
    ],
    benchmarks: [
      { metric: 'Gas Efficiency', you: 85, ethereum: 60 },
      { metric: 'Speed', you: 92, ethereum: 65 },
      { metric: 'Growth', you: 88, ethereum: 70 },
    ],
  },
  recommendations: [
    '🚀 Expand liquidity incentives to attract whale traders',
    '⚙️ Optimize gas consumption for micro-transactions',
    '🌍 Launch cross-chain bridge with Polygon and Arbitrum',
    '📊 Implement dynamic fee structure based on demand',
  ],
  alerts: [
    { severity: 'warning', message: 'TVL declined 2.3% in last 24 hours' },
    { severity: 'info', message: 'New competitor launched on same chain' },
  ],
};

const CHAINS = Object.keys(chainLogos) as Array<keyof typeof chainLogos>;

// ============ COMPONENTS ============
function WizardStep({ step, totalSteps }: { step: number; totalSteps: number }) {
  const icons = ['🚀', '⚔️', '⏱️'];
  const labels = ['Your Startup', 'Competitors', 'Duration'];
  
  return (
    <div className="flex items-center justify-between mb-12">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div
            className={`w-16 h-16 flex items-center justify-center rounded-full text-3xl font-bold transition-all duration-300 ${
              i < step
                ? 'bg-gray-600 text-white scale-110'
                : i === step
                ? 'bg-gradient-to-r from-gray-600 to-gray-500 text-white scale-125 shadow-lg shadow-gray-600/50 animate-pulse'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {icons[i]}
          </div>
          <p
            className={`mt-2 text-sm font-medium ${
              i <= step ? 'text-white' : 'text-gray-500'
            }`}
          >
            {labels[i]}
          </p>
        </div>
      ))}
    </div>
  );
}

function ChainSelector({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (chain: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-4">Select Blockchain</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {CHAINS.map((chain) => (
          <button
            key={chain}
            onClick={() => onChange(chain)}
            className={`p-4 rounded-lg transition-all transform hover:scale-105 ${
              value === chain
                ? 'border-2 border-gray-500 bg-gray-500/20 shadow-lg shadow-gray-500/50'
                : 'border border-gray-600 bg-gray-800 hover:border-blue-400'
            }`}
          >
            <img
              src={chainLogos[chain] || "/placeholder.svg"}
              alt={chain}
              className="w-12 h-12 mx-auto mb-2 object-contain"
            />
            <span className="text-xs font-semibold text-white capitalize">{chain}</span>
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}

function LoadingScreen({ startupName }: { startupName: string }) {
  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="text-center">
        <div className="relative w-48 h-48 mx-auto mb-8">
          {/* Outer radar ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-gray-600"
          />
          {/* Middle radar ring */}
          <div
            className="absolute inset-6 rounded-full border-2 border-gray-700"
          />
          {/* Inner radar ring */}
          <div
            className="absolute inset-12 rounded-full border-2 border-gray-700"
          />
          
          {/* Rotating radar sweep - outer */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, rgba(107, 114, 128, 0.5) 0deg, rgba(107, 114, 128, 0) 90deg)',
              animation: 'radarSweep 3s linear infinite',
            }}
          />
          
          {/* Rotating radar sweep - middle */}
          <div
            className="absolute inset-6 rounded-full"
            style={{
              background: 'conic-gradient(from 180deg, rgba(156, 163, 175, 0.4) 0deg, rgba(156, 163, 175, 0) 90deg)',
              animation: 'radarSweep 4s linear infinite reverse',
            }}
          />
          
          {/* Pulsing center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-4 h-4">
              <div
                className="absolute inset-0 rounded-full bg-gray-400"
                style={{
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <div
                className="absolute inset-1 rounded-full bg-gray-300"
                style={{
                  animation: 'pulse 2s ease-in-out infinite 0.3s',
                }}
              />
            </div>
          </div>
        </div>
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-300 mb-2">
          Scanning Blockchain...
        </h2>
        <p className="text-gray-400 text-lg">Analyzing {startupName}</p>
        <style>{`
          @keyframes radarSweep {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    </div>
  );
}

function DashboardHeader({ startupName, chain }: { startupName: string; chain: string }) {
  const chainIcon = chainLogos[chain as keyof typeof chainLogos];
  
  return (
      <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 border border-gray-500/30">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-300 to-gray-200">
            OnChain Report: {startupName}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Generated {new Date().toLocaleString()} • {mockAnalysisData.chain.toUpperCase()}
          </p>
        </div>
        {chainIcon && (
          <img src={chainIcon || "/placeholder.svg"} alt={chain} className="w-16 h-16 object-contain" />
        )}
      </div>
    </div>
  );
}

function OverviewTab() {
  const data = mockAnalysisData.overview;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600/30 hover:shadow-lg hover:shadow-gray-500/20 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{data.totalTransactions.toLocaleString()}</p>
            <p className="text-green-400 text-xs mt-1">↑ 12% from last period</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600/30 hover:shadow-lg hover:shadow-gray-500/20 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-white">{data.uniqueUsers.toLocaleString()}</p>
            </div>
            <div className="mt-3 bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-gray-500 to-gray-600 h-2 rounded-full w-3/4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-green-500/30 hover:shadow-lg hover:shadow-green-500/20 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Value Locked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{data.totalValue}</p>
            <p className="text-green-400 text-xs mt-1">⬆ $340K this week</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/20 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Avg Gas (Gwei)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{data.avgGas}</p>
            <p className="text-orange-400 text-xs mt-1">Lower than network avg</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{data.successRate}%</p>
            <p className="text-emerald-400 text-xs mt-1">Industry leading</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-600/30 hover:shadow-lg hover:shadow-gray-500/20 transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Time Range</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white text-center">{data.timeRange}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricsTab() {
  const data = mockAnalysisData.metrics;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-600/30">
          <CardHeader>
            <CardTitle className="text-white">TVL Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.tvl}>
                <defs>
                  <linearGradient id="colorTVL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B7280" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #6B7280' }} />
                <Area type="monotone" dataKey="value" stroke="#6B7280" fillOpacity={1} fill="url(#colorTVL)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-600/30">
          <CardHeader>
            <CardTitle className="text-white">Borrowing & Lending Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.rates}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #3B82F6' }} />
                <Legend />
              <Line type="monotone" dataKey="borrowing" stroke="#9CA3AF" strokeWidth={2} />
              <Line type="monotone" dataKey="lending" stroke="#6B7280" strokeWidth={2} />
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
                  data={data.ratios}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[0, 1, 2, 3].map((index) => (
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
              <span className="text-white font-bold">{data.dau.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">Monthly Active Users</span>
              <span className="text-white font-bold">{data.mau.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">Active Liquidity Pools</span>
              <span className="text-white font-bold">{data.activePools}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">Cross-Chain Integrations</span>
              <span className="text-white font-bold">{data.crossChain}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UsersTab() {
  const data = mockAnalysisData.users;
  const COLORS = ['#A855F7', '#3B82F6', '#10B981', '#F59E0B'];
  
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

function TransactionsTab() {
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

function CompetitiveTab() {
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

// ============ MAIN PAGE COMPONENT ============
export default function OnChainAnalyzer() {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<WizardFormData | null>(null);
  const [dashboardTab, setDashboardTab] = useState('overview');

  const form = useForm<WizardFormData>({
    resolver: zodResolver(WizardSchema),
    mode: 'onSubmit',
    defaultValues: {
      startupName: '',
      chain: '',
      address: '',
      abi: '',
      competitors: [],
      duration: '7',
    },
  });

  const { fields: competitorFields, append: appendCompetitor, remove: removeCompetitor } = useFieldArray({
    control: form.control,
    name: 'competitors',
  });

  async function onSubmit(data: WizardFormData) {
    setIsLoading(true);
    setFormData(data);
    
    // Simulate 3-5 second API call
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    setIsLoading(false);
  }

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen startupName={formData?.startupName || 'Your Protocol'} />;
  }

  // Show dashboard after analysis
  if (formData && !isLoading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader startupName={formData.startupName} chain={formData.chain} />

          <Tabs value={dashboardTab} onValueChange={setDashboardTab} className="w-full">
            <TabsList className="bg-gray-800 border-b border-gray-700 mb-6 w-full justify-start gap-2 rounded-lg p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-gray-600">
                📊 Overview
              </TabsTrigger>
              <TabsTrigger value="metrics" className="data-[state=active]:bg-gray-600">
                📈 Metrics
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-gray-600">
                👥 Users
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-gray-600">
                💰 Transactions
              </TabsTrigger>
              <TabsTrigger value="competitive" className="data-[state=active]:bg-gray-600">
                ⚔️ Competitive
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <OverviewTab />
              
              <Card className="bg-gray-800 border-amber-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    💡 Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {mockAnalysisData.recommendations.map((rec, i) => (
                      <li key={i} className="text-gray-300 text-sm">{rec}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    ⚡ Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mockAnalysisData.alerts.map((alert, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg ${
                        alert.severity === 'warning'
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                          : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                      }`}
                    >
                      {alert.message}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics">
              <MetricsTab />
            </TabsContent>

            <TabsContent value="users">
              <UsersTab />
            </TabsContent>

            <TabsContent value="transactions">
              <TransactionsTab />
            </TabsContent>

            <TabsContent value="competitive">
              <CompetitiveTab />
            </TabsContent>
          </Tabs>

          <div className="mt-12 p-6 bg-gray-800 border border-gray-700 rounded-lg text-center">
            <p className="text-gray-400 text-sm">
              Generated by <span className="text-gray-300 font-semibold">xAI</span> •{' '}
              <Button
                onClick={() => alert('PDF export initiated!')}
                variant="outline"
                size="sm"
                className="text-gray-300 hover:text-white"
              >
                📥 Export PDF
              </Button>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Button
              onClick={() => {
                setFormData(null);
                form.reset();
                setStep(0);
                setDashboardTab('overview');
              }}
              className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
            >
              ↻ New Analysis
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Show wizard form
  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-300 to-gray-200 mb-2">
            OnChain Analyzer
          </h1>
          <p className="text-gray-400">Analyze your blockchain contract and compare with competitors</p>
        </div>

        <WizardStep step={step} totalSteps={3} />

        <Card className="bg-gray-800/50 border-gray-600/30 shadow-2xl shadow-gray-500/20">
          <CardContent className="pt-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {step === 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Startup Name</label>
                    <input
                      type="text"
                      placeholder="e.g., MetaDEX Pro"
                      {...form.register('startupName')}
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all ${
                        form.formState.errors.startupName
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500/50'
                          : 'border-gray-600 focus:border-gray-400 focus:ring-2 focus:ring-gray-500/20'
                      }`}
                    />
                    {form.formState.errors.startupName && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.startupName.message}</p>
                    )}
                  </div>

                  <ChainSelector
                    value={form.watch('chain')}
                    onChange={(chain) => form.setValue('chain', chain)}
                    error={form.formState.errors.chain?.message}
                  />

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Contract Address</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      {...form.register('address')}
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all font-mono ${
                        form.formState.errors.address
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500/50'
                          : 'border-gray-600 focus:border-gray-400 focus:ring-2 focus:ring-gray-500/20'
                      }`}
                    />
                    {form.formState.errors.address && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.address.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Contract ABI</label>
                    <textarea
                      placeholder='Paste ABI JSON here...'
                      {...form.register('abi')}
                      className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-all font-mono h-32 resize-none ${
                        form.formState.errors.abi
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500/50'
                          : 'border-gray-600 focus:border-gray-400 focus:ring-2 focus:ring-gray-500/20'
                      }`}
                    />
                    {form.formState.errors.abi && (
                      <p className="text-red-500 text-sm mt-1">{form.formState.errors.abi.message}</p>
                    )}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <p className="text-gray-400">Add up to 3 competitors (optional, can skip)</p>
                  
                  {competitorFields.map((field, index) => (
                    <Card key={field.id} className="bg-gray-700/50 border-gray-600">
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-white font-semibold">Competitor {index + 1}</h3>
                          <Button
                            type="button"
                            onClick={() => removeCompetitor(index)}
                            variant="outline"
                            size="sm"
                            className="text-red-400 border-red-500/30"
                          >
                            Remove
                          </Button>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                          <input
                            type="text"
                            placeholder="Competitor name"
                            {...form.register(`competitors.${index}.name`)}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Chain</label>
                          <div className="grid grid-cols-3 gap-2">
                            {CHAINS.slice(0, 3).map((chain) => (
                              <button
                                key={chain}
                                type="button"
                                onClick={() => form.setValue(`competitors.${index}.chain`, chain)}
                                className={`p-2 rounded text-xs font-semibold ${
                                  form.watch(`competitors.${index}.chain`) === chain
                                    ? 'bg-gray-600 text-white'
                                    : 'bg-gray-600 text-gray-300'
                                }`}
                              >
                                {chain.slice(0, 3).toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                          <input
                            type="text"
                            placeholder="0x..."
                            {...form.register(`competitors.${index}.address`)}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">ABI</label>
                          <textarea
                            placeholder="Paste ABI..."
                            {...form.register(`competitors.${index}.abi`)}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 font-mono text-xs h-20 resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {competitorFields.length < 3 && (
                    <Button
                      type="button"
                      onClick={() =>
                        appendCompetitor({
                          name: '',
                          chain: '',
                          address: '',
                          abi: '',
                        })
                      }
                      variant="outline"
                      className="w-full border-gray-500/50 text-gray-300 hover:bg-gray-500/20"
                    >
                      + Add Competitor
                    </Button>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div>
                    <label className="block text-sm font-medium text-white mb-4">Analysis Duration</label>
                    <div className="space-y-3">
                      {(['7', '14', '30'] as const).map((duration) => (
                        <label
                          key={duration}
                          className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            form.watch('duration') === duration
          ? 'bg-gray-500/20 border-gray-500'
          : 'bg-gray-700 border-gray-600 hover:border-gray-400'
                          }`}
                        >
                          <input
                            type="radio"
                            value={duration}
                            {...form.register('duration')}
                            className="w-4 h-4"
                          />
                          <span className="ml-3 flex-1">
                            <span className="text-white font-semibold">{duration} Days</span>
                            <p className="text-gray-400 text-sm">Detailed analysis over {duration} days</p>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Card className="bg-gray-800/20 border-gray-500/30">
                    <CardContent className="pt-6">
                      <p className="text-gray-300 text-sm">
                        <span className="font-semibold text-gray-300">Ready to analyze?</span> Click "Analyze Now" to scan your blockchain contract and compare with competitors. Analysis will complete in 3-5 seconds.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="flex gap-3 pt-6">
                {step > 0 && (
                  <Button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300"
                  >
                    ← Back
                  </Button>
                )}
                
                {step < 2 ? (
                  <Button
                    type="button"
                    onClick={async () => {
                      if (step === 0) {
                        const isValid = await form.trigger(['startupName', 'chain']);
                        if (isValid) setStep(step + 1);
                      } else {
                        setStep(step + 1);
                      }
                    }}
                    className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
                  >
                    Next →
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-lg font-semibold h-12 animate-pulse"
                  >
                    🚀 Analyze Now
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
