"use client"

import type { ReactNode } from "react"
import { Bell } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ProjectSelector } from "./project-selector"

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  showFilters?: boolean
  showProjectSelector?: boolean
  currentProjectId?: string
  onProjectChange?: (projectId: string) => void
  onAddProject?: () => void
}

export function DashboardHeader({ 
  title, 
  subtitle, 
  action, 
  showFilters = false,
  showProjectSelector = false,
  currentProjectId,
  onProjectChange,
  onAddProject
}: DashboardHeaderProps) {
  return (
    <header className="bg-card px-6 py-4 rounded-lg border">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
          </div>
          
          {showProjectSelector && onProjectChange && onAddProject && (
            <ProjectSelector
              currentProjectId={currentProjectId}
              onProjectChange={onProjectChange}
              onAddProject={onAddProject}
            />
          )}
        </div>

        <div className="flex items-center gap-4">
          {action}
          {!action && (
            <>
              <button type="button" className="relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  2
                </span>
              </button>
              <Avatar>
                <AvatarImage src="/diverse-avatars.png" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="flex items-center gap-3 mt-4">
          <Select defaultValue="all-chain">
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Chain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-chain">All Chain</SelectItem>
              <SelectItem value="ethereum">Ethereum</SelectItem>
              <SelectItem value="polygon">Polygon</SelectItem>
              <SelectItem value="starknet">Starknet</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all-categories">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-categories">All Categories</SelectItem>
              <SelectItem value="dex">DEX</SelectItem>
              <SelectItem value="nft">NFT</SelectItem>
              <SelectItem value="dao">DAO</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="growth-score">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Growth score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="growth-score">Growth score</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="retention">Retention</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm">
              Trending
            </Button>
            <Button variant="outline" size="sm">
              Top Retention
            </Button>
            <Button variant="outline" size="sm">
              High Growth
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
