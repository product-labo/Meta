"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts"
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Activity, DollarSign, Users, Star } from "lucide-react"

interface WalletDetail {
  address: string;
  classification: 'whale' | 'premium' | 'regular' | 'small';
  total_transactions: number;
  total_volume_eth: number;
  total_volume_usd: number;
  success_rate: number;
  first_interaction: string;
  last_interaction: string;
  active_days: number;
  favorite_projects: string[];
  portfolio_diversity: number;
}

interface ProjectInteraction {
  project_address: string;
  project_name: string;
  category: string;
  chain_name: string;
  transactions: number;
  volume_eth: number;
  success_rate: number;
  first_interaction: string;
  last_interaction: string;
}

export default function WalletDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [wallet, setWallet] = useState<WalletDetail | null>(null)
  const [interactions, setInteractions] = useState<ProjectInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const walletAddress = params.address as string

  useEffect(() => {
    if (walletAddress) {
      fetchWalletDetails()
      fetchProjectInteractions()
    }
  }, [walletAddress])

  const fetchWalletDetails = async () => {
    try {
      setLoading(true)
      // Mock data for now - this would be a real API call
      const mockWallet: WalletDetail = {
        address: walletAddress,
        classification: "premium",
        total_transactions: 1250,
        total_volume_eth: 45.67,
        total_volume_usd: 125000,
        success_rate: 96.8,
        first_interaction: "2024-01-15",
        last_interaction: "2024-12-28",
        active_days: 180,
        favorite_projects: ["DeFi Protocol Alpha", "NFT Marketplace Beta"],
        portfolio_diversity: 8.5
      }
      setWallet(mockWallet)
    } catch (err) {
      console.error("Failed to fetch wallet details:", err)
      setError("Failed to load wallet details")
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectInteractions = async () => {
    try {
      // Mock data for project interactions
      const mockInteractions: ProjectInteraction[] = [
        {
          project_address: "0x1234...5678",
          project_name: "DeFi Protocol Alpha",
          category: "DeFi",
          chain_name: "Ethereum",
          transactions: 450,
          volume_eth: 25.4,
          success_rate: 98.2,
          first_interaction: "2024-01-15",
          last_interaction: "2024-12-28"
        },
        {
          project_address: "0x2345...6789",
          project_name: "NFT Marketplace Beta",
          category: "NFT",
          chain_name: "Polygon",
          transactions: 320,
          volume_eth: 12.8,
          success_rate: 95.1,
          first_interaction: "2024-03-20",
          last_interaction: "2024-12-25"
        },
        {
          project_address: "0x3456...7890",
          project_name: "Bridge Protocol",
          category: "Bridge",
          chain_name: "Starknet",
          transactions: 180,
          volume_eth: 7.45,
          success_rate: 97.8,
          first_interaction: "2024-06-10",
          last_interaction: "2024-12-20"
        }
      ]
      setInteractions(mockInteractions)
    } catch (err) {
      console.error("Failed to fetch project interactions:", err)
    }
  }

  // Helper functions
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatETH = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K ETH`
    if (value >= 1) return `${value.toFixed(2)} ETH`
    return `${value.toFixed(4)} ETH`
  }

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'whale': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'premium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'regular': return 'bg-green-100 text-green-800 border-green-200'
      case 'small': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'whale': return '🐋'
      case 'premium': return '💎'
      case 'regular': return '👤'
      case 'small': return '🔸'
      default: return '👤'
    }
  }

  // Mock activity data
  const activityData = [
    { month: "Jul", transactions: 45, volume: 3.2 },
    { month: "Aug", transactions: 62, volume: 4.8 },
    { month: "Sep", transactions: 78, volume: 6.1 },
    { month: "Oct", transactions: 95, volume: 8.3 },
    { month: "Nov", transactions: 120, volume: 12.4 },
    { month: "Dec", transactions: 135, volume: 15.7 },
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !wallet) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Wallet Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || "The requested wallet could not be found."}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb 
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Wallets", href: "/dashboard?tab=wallets" },
          { label: `${wallet.address.substring(0, 8)}...`, current: true }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{wallet.address}</h1>
              <Badge className={getClassificationColor(wallet.classification)}>
                {getClassificationIcon(wallet.classification)} {wallet.classification}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Active for {wallet.active_days} days • Portfolio diversity: {wallet.portfolio_diversity}/10
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Star className="h-4 w-4 mr-2" />
            Add to Watchlist
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{formatNumber(wallet.total_transactions)}</p>
                <p className="text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {wallet.success_rate.toFixed(1)}% success rate
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">{formatETH(wallet.total_volume_eth)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${wallet.total_volume_usd.toLocaleString()} USD
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Projects Interacted</p>
                <p className="text-2xl font-bold">{interactions.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {new Set(interactions.map(i => i.chain_name)).size} chains
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Days</p>
                <p className="text-2xl font-bold">{wallet.active_days}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Since {new Date(wallet.first_interaction).toLocaleDateString()}
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="projects">Project Interactions</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="transactions"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fill="url(#colorTransactions)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interactions.map((interaction, index) => (
                  <div key={interaction.project_address} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{interaction.project_name}</span>
                          <Badge variant="outline">{interaction.category}</Badge>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${
                              interaction.chain_name === 'Ethereum' ? 'bg-blue-500' :
                              interaction.chain_name === 'Polygon' ? 'bg-purple-500' :
                              interaction.chain_name === 'Starknet' ? 'bg-teal-500' : 'bg-gray-500'
                            }`} />
                            <span className="text-xs text-muted-foreground">{interaction.chain_name}</span>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          First interaction: {new Date(interaction.first_interaction).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatETH(interaction.volume_eth)}</div>
                      <div className="text-sm text-muted-foreground">
                        {interaction.transactions} txs • {interaction.success_rate.toFixed(1)}% success
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {interactions.map((interaction, index) => {
                    const percentage = (interaction.volume_eth / wallet.total_volume_eth) * 100
                    return (
                      <div key={interaction.project_address} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{interaction.project_name}</span>
                          <span>{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Favorite Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {wallet.favorite_projects.map((project, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{project}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}