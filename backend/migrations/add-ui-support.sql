-- Add tasks table for Notification & Task Management
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'completed', 'overdue');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    status public.task_status DEFAULT 'todo',
    priority public.task_priority DEFAULT 'medium',
    due_date timestamp with time zone,
    impact text, -- e.g., "High Revenue", "Security"
    verification_criteria text, -- e.g., "Reduce failures to <5%"
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);

-- Update project_metrics to support detailed UI analytics
ALTER TABLE public.project_metrics
ADD COLUMN IF NOT EXISTS productivity_breakdown jsonb DEFAULT '{}', -- Store "Pillar Breakdown" scores
ADD COLUMN IF NOT EXISTS retention_data jsonb DEFAULT '{}', -- Store "Retention Over Time" cohorts
ADD COLUMN IF NOT EXISTS funnel_data jsonb DEFAULT '{}', -- Store "Users Activity Funnel"
ADD COLUMN IF NOT EXISTS active_wallets_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS transactions_count integer DEFAULT 0;

-- Trigger for updated_at on tasks
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
