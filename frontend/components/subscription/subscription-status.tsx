'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useSubscription } from '@/hooks/use-subscription'
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/lib/web3-config'
import { Crown, Calendar, AlertTriangle, Zap, ArrowUp } from 'lucide-react'
import Link from 'next/link'

interface SubscriptionStatusProps {
  className?: string
}

export function SubscriptionStatus({ className = "" }: SubscriptionStatusProps) {
  const {
    isActive,
    currentTier,
    subscriptionInfo,
    daysRemaining,
    isInGracePeriod,
    isLoading,
    canUpgrade,
    networkError,
    isValidNetwork
  } = useSubscription()

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show network error if not on correct network
  if (!isValidNetwork && networkError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-orange-600 mb-4">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{networkError}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Please switch to Lisk Sepolia Testnet to view your subscription status.
          </p>
        </CardContent>
      </Card>
    )
  }

  const currentPlan = SUBSCRIPTION_PLANS[currentTier]
  const isFreeTier = currentTier === SubscriptionTier.Free

  const getStatusBadge = () => {
    if (isFreeTier) {
      return <Badge variant="secondary">Free Plan</Badge>
    }
    
    if (isInGracePeriod) {
      return <Badge variant="destructive">Grace Period</Badge>
    }
    
    if (isActive) {
      return <Badge variant="default">Active</Badge>
    }
    
    return <Badge variant="outline">Inactive</Badge>
  }

  const getTimeProgress = () => {
    if (!subscriptionInfo || isFreeTier) return 0
    
    const totalDuration = Number(subscriptionInfo.endTime) - Number(subscriptionInfo.startTime)
    const elapsed = Math.floor(Date.now() / 1000) - Number(subscriptionInfo.startTime)
    
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Subscription Status
          </div>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Current plan: {currentPlan.name}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Plan Details */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>API Calls/Month:</span>
            <span className="font-medium">
              {currentPlan.features.apiCallsPerMonth.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Max Projects:</span>
            <span className="font-medium">{currentPlan.features.maxProjects}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Max Alerts:</span>
            <span className="font-medium">{currentPlan.features.maxAlerts}</span>
          </div>
        </div>

        {/* Time Remaining (for paid plans) */}
        {!isFreeTier && subscriptionInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Time Remaining</span>
              </div>
              <span className="font-medium">
                {daysRemaining} days
              </span>
            </div>
            
            <Progress value={100 - getTimeProgress()} className="h-2" />
            
            {isInGracePeriod && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Subscription expired - Grace period active</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {isFreeTier ? (
            <Link href="/subscription" className="flex-1">
              <Button className="w-full">
                <Zap className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
            </Link>
          ) : (
            <>
              {canUpgrade(SubscriptionTier.Enterprise) && (
                <Link href="/subscription" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Upgrade
                  </Button>
                </Link>
              )}
              
              <Link href="/subscription" className="flex-1">
                <Button variant="outline" className="w-full">
                  Manage Plan
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Current plan includes:</p>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {currentPlan.features.exportAccess && (
              <span className="text-green-600">✓ Data Export</span>
            )}
            {currentPlan.features.comparisonTool && (
              <span className="text-green-600">✓ Comparison Tool</span>
            )}
            {currentPlan.features.walletIntelligence && (
              <span className="text-green-600">✓ Wallet Intelligence</span>
            )}
            {currentPlan.features.apiAccess && (
              <span className="text-green-600">✓ API Access</span>
            )}
            {currentPlan.features.prioritySupport && (
              <span className="text-green-600">✓ Priority Support</span>
            )}
            {currentPlan.features.customInsights && (
              <span className="text-green-600">✓ Custom Insights</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}