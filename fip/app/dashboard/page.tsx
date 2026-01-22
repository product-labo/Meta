'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/header"
import { ProjectsTable } from "@/components/dashboard/projects-table"
import { WalletList } from "@/components/dashboard/wallet-list"
import { IndexingProgressWidget } from "@/components/dashboard/indexing-progress-widget"
import { DashboardSummary } from "@/components/dashboard/dashboard-summary"

export default function DashboardPage() {
  const router = useRouter()
  const [currentProjectId, setCurrentProjectId] = useState<string>("")
  const [activeWalletId, setActiveWalletId] = useState<string>("")
  const [refreshKey, setRefreshKey] = useState<number>(0)

  // In a real app, this would come from user context, URL params, or localStorage
  useEffect(() => {
    // Try to get project ID from localStorage (set during onboarding)
    const storedProjectId = localStorage.getItem('currentProjectId')
    if (storedProjectId) {
      setCurrentProjectId(storedProjectId)
    }
  }, [])

  const handleProjectChange = (projectId: string) => {
    setCurrentProjectId(projectId)
    setActiveWalletId("") // Clear active wallet when switching projects
    setRefreshKey(prev => prev + 1) // Force refresh of components
  }

  const handleAddProject = () => {
    // Navigate to project creation flow
    router.push('/projects/create')
  }

  const handleAddWallet = () => {
    // Navigate to wallet addition flow
    // This could open a modal or navigate to a dedicated page
    console.log("Add wallet clicked")
  }

  const handleWalletClick = (walletId: string) => {
    // Set active wallet for progress tracking
    setActiveWalletId(walletId)
    console.log("Wallet clicked:", walletId)
  }

  const handleRefreshAll = () => {
    // Force refresh of all components
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-0">
        <DashboardHeader 
          title="Project Dashboard" 
          subtitle="Manage your Web3 projects and wallet analytics"
          showProjectSelector={true}
          currentProjectId={currentProjectId}
          onProjectChange={handleProjectChange}
          onAddProject={handleAddProject}
        />
      </div>
      <div className="flex-1 p-6 space-y-6">
        {/* Dashboard Summary - Only show if we have a project */}
        {currentProjectId && (
          <DashboardSummary
            key={`summary-${currentProjectId}-${refreshKey}`}
            projectId={currentProjectId}
            onAddWallet={handleAddWallet}
            onRefreshAll={handleRefreshAll}
          />
        )}

        {/* Wallet Management Section - Only show if we have a project */}
        {currentProjectId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <WalletList 
                key={`wallets-${currentProjectId}-${refreshKey}`}
                projectId={currentProjectId}
                onAddWallet={handleAddWallet}
                onWalletClick={handleWalletClick}
              />
            </div>
            <div>
              {/* Show indexing progress for the active wallet */}
              {activeWalletId ? (
                <IndexingProgressWidget 
                  key={`progress-${activeWalletId}-${refreshKey}`}
                  walletId={activeWalletId}
                  projectId={currentProjectId}
                />
              ) : (
                <div className="p-6 border rounded-lg text-center text-muted-foreground">
                  Select a wallet to view indexing progress
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Show message when no project is selected */}
        {!currentProjectId && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No Project Selected</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project to start tracking wallet analytics
            </p>
          </div>
        )}
        
        {/* Projects Table */}
        <ProjectsTable />
      </div>
    </div>
  )
}
