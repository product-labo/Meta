"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Crown, Target, Zap, Shield, AlertTriangle, ExternalLink } from "lucide-react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"

interface CompetitiveAnalysisProps {
  filters?: {
    categories: string[];
    chains: string[];
  };
}

interface CompetitorProject {
  contract_address: string;
  business_name: string;
  category: string;
  chain_name: string;
  total_customers: number;
  total_revenue_eth: number;
  growth_score: number;
  health_score: number;
  risk_score: number;
  customer_growth_rate_percent: number;
  volume_growth_rate_percent: number;
  success_rate_percent: number;
  is_verified: boolean;
}

interface CategoryLeader {
  category: string;
  leader: CompetitorProject;
  totalProjects: number;
  avgGrowthScore: number;
  marketSize: number;
}

export function CompetitiveAnalysis({ filters }: CompetitiveAnalysisProps) {
  const router = useRouter()
  const [topPerformers, setTopPerformers] = useState<CompetitorProject[]>([])
  const [categoryLeaders, setCategoryLeaders] = useState<CategoryLeader[]>([])
  const [risingStars, setRisingStars] = useState<CompetitorProject[]>([])
  const [riskProjects, setRiskProjects] = useState<CompetitorProject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedChain, setSelectedChain] = useState<string>("all")

  useEffect(() => {
    fetchCompetitiveData()
  }, [filters, selectedCategory, selectedChain])

  const fetchCompetitiveData = async () => {
    setLoading(true)
    try {
      const params: any = { limit: 200, sortBy: 'growth_score' }
      
      // Apply filters
      if (selectedCategory !== "all") params.category = selectedCategory
      if (selectedChain !== "all") params.chainId = selectedChain
      if (filters?.categories.length) params.category = filters.categories[0]
      if (filters?.chains.length) params.chainId = filters.chains[0]

      const res = await api.projects.list(params)
      
      if (res.success && res.data && res.data.businesses) {
        const projects: CompetitorProject[] = res.data.businesses
        
        // Top Performers (highest growth scores)
        const topPerformersData = projects
          .filter(p => (p.growth_score || 0) >= 60)
          .sort((a, b) => (b.growth_score || 0) - (a.growth_score || 0))
          .slice(0, 5)
        
        // Rising Stars (high growth rates but smaller size)
        const risingStarsData = projects
          .filter(p => 
            (p.customer_growth_rate_percent || 0) > 20 && 
            (p.total_customers || 0) < 10000
          )
          .sort((a, b) => (b.customer_growth_rate_percent || 0) - (a.customer_growth_rate_percent || 0))
          .slice(0, 5)
        
        // High Risk Projects
        const riskProjectsData = projects
          .filter(p => (p.risk_score || 0) >= 70)
          .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
          .slice(0, 5)
        
        // Category Leaders
        const categoryMap = new Map<string, CompetitorProject[]>()
        projects.forEach(project => {
          const category = project.category || 'Unknown'
          if (!categoryMap.has(category)) {
            categoryMap.set(category, [])
          }
          categoryMap.get(category)!.push(project)
        })
        
        const categoryLeadersData: CategoryLeader[] = Array.from(categoryMap.entries())
          .map(([category, categoryProjects]) => {
            const leader = categoryProjects
              .sort((a, b) => (b.total_revenue_eth || 0) - (a.total_revenue_eth || 0))[0]
            
            const avgGrowthScore = categoryProjects.length > 0 
              ? categoryProjects.reduce((sum, p) => sum + (p.growth_score || 50), 0) / categoryProjects.length
              : 50
            
            const marketSize = categoryProjects.reduce((sum, p) => sum + (p.total_revenue_eth || 0), 0)
            
            return {
              category,
              leader,
              totalProjects: categoryProjects.length,
              avgGrowthScore,
              marketSize
            }
          })
          .filter(cl => cl.leader && cl.totalProjects >= 3) // Only categories with meaningful data
          .sort((a, b) => b.marketSize - a.marketSize)
          .slice(0, 6)
        
        setTopPerformers(topPerformersData)
        setRisingStars(risingStarsData)
        setRiskProjects(riskProjectsData)
        setCategoryLeaders(categoryLeadersData)
      }
    } catch (error) {
      console.error('Failed to fetch competitive data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatETH = (value: any) => {
    const numValue = Number(value) || 0
    if (numValue >= 1000) return `${(numValue / 1000).toFixed(1)}K ETH`
    if (numValue >= 1) return `${numValue.toFixed(2)} ETH`
    return `${numValue.toFixed(4)} ETH`
  }

  const getScoreColor = (score: number, type: 'growth' | 'health' | 'risk') => {
    if (type === 'risk') {
      if (score <= 30) return 'text-green-600 bg-green-50'
      if (score <= 60) return 'text-yellow-600 bg-yellow-50'
      return 'text-red-600 bg-red-50'
    } else {
      if (score >= 70) return 'text-green-600 bg-green-50'
      if (score >= 40) return 'text-yellow-600 bg-yellow-50'
      return 'text-red-600 bg-red-50'
    }
  }

  const getTrendIcon = (rate: number) => {
    if (rate > 5) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (rate < -5) return <TrendingDown className="h-4 w-4 text-red-500" />
    return null
  }

  const handleProjectClick = (address: string) => {
    router.push(`/projects/${address}`)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="DeFi">DeFi</SelectItem>
            <SelectItem value="NFT">NFT</SelectItem>
            <SelectItem value="DAO">DAO</SelectItem>
            <SelectItem value="Identity">Identity</SelectItem>
            <SelectItem value="Bridge">Bridge</SelectItem>
            <SelectItem value="Infrastructure">Infrastructure</SelectItem>
            <SelectItem value="Privacy">Privacy</SelectItem>
            <SelectItem value="Gaming">Gaming</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedChain} onValueChange={setSelectedChain}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Chain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Chains</SelectItem>
            <SelectItem value="1">Ethereum</SelectItem>
            <SelectItem value="137">Polygon</SelectItem>
            <SelectItem value="4202">Starknet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((project, index) => (
                <div 
                  key={project.contract_address}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleProjectClick(project.contract_address)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{project.business_name}</span>
                        {project.is_verified && (
                          <Badge variant="secondary" className="text-xs">✓</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {project.category} • {project.chain_name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(project.growth_score || 50, 'growth')}`}>
                      {(project.growth_score || 50).toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(project.total_customers)} customers
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rising Stars */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Rising Stars
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {risingStars.map((project, index) => (
                <div 
                  key={project.contract_address}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleProjectClick(project.contract_address)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{project.business_name}</span>
                        {project.is_verified && (
                          <Badge variant="secondary" className="text-xs">✓</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {project.category} • {project.chain_name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600 font-medium text-sm">
                      +{(project.customer_growth_rate_percent || 0).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      growth rate
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Leaders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              Category Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryLeaders.map((categoryData, index) => (
                <div 
                  key={categoryData.category}
                  className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleProjectClick(categoryData.leader.contract_address)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {categoryData.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {categoryData.totalProjects} projects
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatETH(categoryData.marketSize)} market
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{categoryData.leader.business_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(categoryData.leader.total_customers)} customers • {formatETH(categoryData.leader.total_revenue_eth)}
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* High Risk Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              High Risk Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskProjects.map((project, index) => (
                <div 
                  key={project.contract_address}
                  className="flex items-center justify-between p-3 rounded-lg border border-red-200 hover:bg-red-50 cursor-pointer transition-colors"
                  onClick={() => handleProjectClick(project.contract_address)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{project.business_name}</span>
                        {project.is_verified && (
                          <Badge variant="secondary" className="text-xs">✓</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {project.category} • {project.chain_name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(project.risk_score || 50, 'risk')}`}>
                      {(project.risk_score || 50).toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      risk score
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}