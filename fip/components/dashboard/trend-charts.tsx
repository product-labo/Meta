"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, BarChart3, PieChart, Activity } from "lucide-react"
import { api } from "@/lib/api"

interface TrendChartsProps {
  filters?: {
    chains: string[];
    categories: string[];
  };
}

interface TrendData {
  date: string;
  projects: number;
  customers: number;
  revenue: number;
  avgGrowthScore: number;
  avgHealthScore: number;
}

interface CategoryData {
  category: string;
  projects: number;
  customers: number;
  revenue: number;
  avgScore: number;
  color: string;
}

interface ChainData {
  chain: string;
  projects: number;
  customers: number;
  revenue: number;
  marketShare: number;
  color: string;
}

export function TrendCharts({ filters }: TrendChartsProps) {
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [chainData, setChainData] = useState<ChainData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMetric, setSelectedMetric] = useState<'customers' | 'revenue' | 'projects'>('customers')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    fetchTrendData()
    fetchCategoryBreakdown()
    fetchChainBreakdown()
  }, [filters, timeRange])

  const fetchTrendData = async () => {
    try {
      // Fetch real historical data from API
      const params: any = { days: timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90 }
      if (filters?.chains.length) params.chainId = filters.chains[0]
      if (filters?.categories.length) params.category = filters.categories[0]
      
      const res = await api.projects.getHistoricalMetrics(params)
      
      if (res.success && res.data && res.data.historical_metrics) {
        const historicalData = res.data.historical_metrics
        
        // Convert to TrendData format
        const trendData: TrendData[] = historicalData.map((item: any) => ({
          date: item.metric_date,
          projects: parseInt(item.projects || 0),
          customers: parseInt(item.customers || 0),
          revenue: parseFloat(item.revenue || 0),
          avgGrowthScore: 65, // Default for now
          avgHealthScore: 70, // Default for now
        }))
        
        setTrendData(trendData)
      } else {
        setTrendData([])
      }
    } catch (error) {
      console.error('Failed to fetch trend data:', error)
      setTrendData([])
    }
  }

  const fetchCategoryBreakdown = async () => {
    try {
      const params: any = { limit: 1000 }
      if (filters?.chains.length) params.chainId = filters.chains[0]
      
      const res = await api.projects.list(params)
      
      if (res.success && res.data && res.data.businesses) {
        const projects = res.data.businesses
        
        // Group by category
        const categoryMap = new Map<string, any>()
        
        projects.forEach(project => {
          const category = project.category || 'Unknown'
          if (!categoryMap.has(category)) {
            categoryMap.set(category, {
              category,
              projects: 0,
              customers: 0,
              revenue: 0,
              totalScore: 0,
              count: 0
            })
          }
          
          const data = categoryMap.get(category)!
          data.projects += 1
          data.customers += project.total_customers || 0
          data.revenue += project.total_revenue_eth || 0
          data.totalScore += project.growth_score || 50
          data.count += 1
        })
        
        const categoryColors = [
          '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
          '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
        ]
        
        const categoryBreakdown: CategoryData[] = Array.from(categoryMap.values())
          .map((data, index) => ({
            category: data.category,
            projects: data.projects,
            customers: data.customers,
            revenue: data.revenue,
            avgScore: data.count > 0 ? data.totalScore / data.count : 50,
            color: categoryColors[index % categoryColors.length]
          }))
          .sort((a, b) => b.projects - a.projects)
        
        setCategoryData(categoryBreakdown)
      }
    } catch (error) {
      console.error('Failed to fetch category data:', error)
    }
  }

  const fetchChainBreakdown = async () => {
    try {
      const res = await api.projects.list({ limit: 1000 })
      
      if (res.success && res.data && res.data.businesses) {
        const projects = res.data.businesses
        
        // Group by chain
        const chainMap = new Map<string, any>()
        const totalRevenue = projects.reduce((sum, p) => sum + (p.total_revenue_eth || 0), 0)
        
        projects.forEach(project => {
          const chain = project.chain || 'Unknown'
          if (!chainMap.has(chain)) {
            chainMap.set(chain, {
              chain,
              projects: 0,
              customers: 0,
              revenue: 0
            })
          }
          
          const data = chainMap.get(chain)!
          data.projects += 1
          data.customers += project.total_customers || 0
          data.revenue += project.total_revenue_eth || 0
        })
        
        const chainColors = {
          'Lisk': '#0c4a6e',
          'Starknet': '#0c0c4f',
          'Unknown': '#6b7280'
        }
        
        const chainBreakdown: ChainData[] = Array.from(chainMap.values())
          .map(data => ({
            chain: data.chain,
            projects: data.projects,
            customers: data.customers,
            revenue: data.revenue,
            marketShare: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
            color: chainColors[data.chain as keyof typeof chainColors] || chainColors.Unknown
          }))
          .sort((a, b) => b.revenue - a.revenue)
        
        setChainData(chainBreakdown)
      }
    } catch (error) {
      console.error('Failed to fetch chain data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Market Trends Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Market Trends
          </CardTitle>
          <div className="flex gap-2">
            <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customers">Customers</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="projects">Projects</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7d</SelectItem>
                <SelectItem value="30d">30d</SelectItem>
                <SelectItem value="90d">90d</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <div className="text-sm text-muted-foreground">
              Real trend data: {trendData.length} data points
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No historical data available for selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categoryData.map((category, index) => {
              const totalProjects = categoryData.reduce((sum, c) => sum + c.projects, 0)
              const percentage = totalProjects > 0 ? (category.projects / totalProjects) * 100 : 0
              
              return (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.category}</span>
                    <Badge variant="secondary">{(Number(percentage) || 0).toFixed(1)}%</Badge>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{category.projects} projects</div>
                    <div>{category.customers} customers</div>
                    <div>{(Number(category.revenue) || 0).toFixed(1)} ETH</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Chain Distribution */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Chain Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {chainData.map((chain, index) => (
              <div key={chain.chain} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: chain.color }}
                  />
                  <span className="font-medium">{chain.chain}</span>
                  <Badge variant="secondary">{(Number(chain.marketShare) || 0).toFixed(1)}%</Badge>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>{chain.projects} projects</div>
                  <div>{chain.customers} customers</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
