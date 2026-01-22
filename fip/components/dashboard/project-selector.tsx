"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface Project {
  id: string
  name: string
  description?: string
  category: string
  status: string
  wallet_count: number
  last_wallet_sync?: string
}

interface ProjectSelectorProps {
  currentProjectId?: string
  onProjectChange: (projectId: string) => void
  onAddProject: () => void
}

export function ProjectSelector({ currentProjectId, onProjectChange, onAddProject }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)

  useEffect(() => {
    fetchUserProjects()
  }, [])

  useEffect(() => {
    if (currentProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === currentProjectId)
      setCurrentProject(project || null)
    }
  }, [currentProjectId, projects])

  const fetchUserProjects = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/projects/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(data.data || [])
        
        // If no current project is selected, select the first one
        if (!currentProjectId && data.data.length > 0) {
          const firstProject = data.data[0]
          setCurrentProject(firstProject)
          onProjectChange(firstProject.id)
          localStorage.setItem('currentProjectId', firstProject.id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectSelect = (project: Project) => {
    setCurrentProject(project)
    onProjectChange(project.id)
    localStorage.setItem('currentProjectId', project.id)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'draft':
        return 'secondary'
      case 'archived':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <Button onClick={onAddProject} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Create First Project
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="truncate">
              {currentProject?.name || 'Select Project'}
            </span>
            {currentProject && (
              <Badge variant={getStatusBadgeVariant(currentProject.status)} className="text-xs">
                {currentProject.status}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        {projects.map((project) => (
          <DropdownMenuItem
            key={project.id}
            onClick={() => handleProjectSelect(project)}
            className="flex flex-col items-start gap-1 p-3"
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">{project.name}</span>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusBadgeVariant(project.status)} className="text-xs">
                  {project.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {project.wallet_count} wallet{project.wallet_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            {project.description && (
              <span className="text-xs text-muted-foreground line-clamp-1">
                {project.description}
              </span>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="capitalize">{project.category}</span>
              {project.last_wallet_sync && (
                <>
                  <span>•</span>
                  <span>Last sync: {new Date(project.last_wallet_sync).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAddProject} className="p-3">
          <Plus className="h-4 w-4 mr-2" />
          Add New Project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}