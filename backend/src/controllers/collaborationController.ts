import { Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';
import crypto from 'crypto';

export class CollaborationController {
  constructor(private db: Pool) {}

  // GET /api/projects/:id/team
  async getProjectTeam(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id: projectId } = req.params;

      // Verify user has access to this project
      const accessQuery = `
        SELECT p.id, p.name, p.user_id,
               CASE 
                 WHEN p.user_id = $1 THEN 'owner'
                 WHEN pt.role IS NOT NULL THEN pt.role
                 ELSE NULL
               END as user_role
        FROM projects p
        LEFT JOIN project_team pt ON p.id = pt.project_id AND pt.user_id = $1
        WHERE p.id = $2 AND (p.user_id = $1 OR pt.user_id = $1)
      `;
      
      const accessResult = await this.db.query(accessQuery, [userId, projectId]);

      if (accessResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found or access denied' });
      }

      const project = accessResult.rows[0];

      // Get team members
      const teamQuery = `
        SELECT 
          u.id,
          u.email,
          u.username,
          u.avatar_url,
          pt.role,
          pt.joined_at,
          pt.permissions,
          CASE WHEN p.user_id = u.id THEN true ELSE false END as is_owner
        FROM project_team pt
        JOIN users u ON pt.user_id = u.id
        JOIN projects p ON pt.project_id = p.id
        WHERE pt.project_id = $1
        UNION
        SELECT 
          u.id,
          u.email,
          u.username,
          u.avatar_url,
          'owner' as role,
          p.created_at as joined_at,
          '["all"]'::json as permissions,
          true as is_owner
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
        ORDER BY is_owner DESC, joined_at ASC
      `;
      
      const teamResult = await this.db.query(teamQuery, [projectId]);

      // Get pending invitations
      const invitationsQuery = `
        SELECT 
          id,
          email,
          role,
          permissions,
          invited_at,
          expires_at,
          status
        FROM project_invitations
        WHERE project_id = $1 AND status = 'pending'
        ORDER BY invited_at DESC
      `;
      
      const invitationsResult = await this.db.query(invitationsQuery, [projectId]);

      res.json({
        success: true,
        data: {
          project: {
            id: project.id,
            name: project.name,
            user_role: project.user_role
          },
          team_members: teamResult.rows,
          pending_invitations: invitationsResult.rows,
          team_size: teamResult.rows.length,
          can_manage_team: ['owner', 'admin'].includes(project.user_role)
        }
      });
    } catch (error) {
      console.error('Get project team error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch project team' });
    }
  }

  // POST /api/projects/:id/team/invite
  async inviteTeamMember(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id: projectId } = req.params;
      const { email, role = 'viewer', permissions = ['read'], message } = req.body;

      if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, error: 'Valid email is required' });
      }

      if (!['admin', 'editor', 'viewer'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
      }

      // Verify user can manage this project
      const accessQuery = `
        SELECT p.id, p.name, p.user_id,
               CASE 
                 WHEN p.user_id = $1 THEN 'owner'
                 WHEN pt.role IN ('admin') THEN pt.role
                 ELSE NULL
               END as user_role
        FROM projects p
        LEFT JOIN project_team pt ON p.id = pt.project_id AND pt.user_id = $1
        WHERE p.id = $2 AND (p.user_id = $1 OR pt.role IN ('admin'))
      `;
      
      const accessResult = await this.db.query(accessQuery, [userId, projectId]);

      if (accessResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      // Check if user is already a team member
      const existingMemberQuery = `
        SELECT u.id FROM users u
        LEFT JOIN project_team pt ON u.id = pt.user_id AND pt.project_id = $1
        LEFT JOIN projects p ON p.user_id = u.id AND p.id = $1
        WHERE u.email = $2 AND (pt.user_id IS NOT NULL OR p.user_id IS NOT NULL)
      `;
      
      const existingMember = await this.db.query(existingMemberQuery, [projectId, email]);

      if (existingMember.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'User is already a team member' });
      }

      // Check for existing pending invitation
      const existingInviteQuery = `
        SELECT id FROM project_invitations
        WHERE project_id = $1 AND email = $2 AND status = 'pending'
      `;
      
      const existingInvite = await this.db.query(existingInviteQuery, [projectId, email]);

      if (existingInvite.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Invitation already sent to this email' });
      }

      // Generate invitation token
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation
      const inviteQuery = `
        INSERT INTO project_invitations (
          project_id, email, role, permissions, invite_token, 
          invited_by, invited_at, expires_at, status, message
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, 'pending', $8)
        RETURNING id, email, role, invited_at, expires_at
      `;
      
      const inviteResult = await this.db.query(inviteQuery, [
        projectId, email, role, JSON.stringify(permissions), 
        inviteToken, userId, expiresAt, message
      ]);

      // TODO: Send invitation email
      // await this.sendInvitationEmail(email, inviteToken, project.name, message);

      res.status(201).json({
        success: true,
        data: {
          invitation: inviteResult.rows[0],
          invite_link: `${process.env.FRONTEND_URL}/invite/${inviteToken}`,
          message: 'Invitation sent successfully'
        }
      });
    } catch (error) {
      console.error('Invite team member error:', error);
      res.status(500).json({ success: false, error: 'Failed to send invitation' });
    }
  }

  // DELETE /api/projects/:id/team/:userId
  async removeTeamMember(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id: projectId, userId: targetUserId } = req.params;

      // Verify user can manage this project
      const accessQuery = `
        SELECT p.user_id,
               CASE 
                 WHEN p.user_id = $1 THEN 'owner'
                 WHEN pt.role = 'admin' THEN 'admin'
                 ELSE NULL
               END as user_role
        FROM projects p
        LEFT JOIN project_team pt ON p.id = pt.project_id AND pt.user_id = $1
        WHERE p.id = $2 AND (p.user_id = $1 OR pt.role = 'admin')
      `;
      
      const accessResult = await this.db.query(accessQuery, [userId, projectId]);

      if (accessResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      const project = accessResult.rows[0];

      // Can't remove the project owner
      if (project.user_id === parseInt(targetUserId)) {
        return res.status(400).json({ success: false, error: 'Cannot remove project owner' });
      }

      // Remove team member
      const removeQuery = `
        DELETE FROM project_team 
        WHERE project_id = $1 AND user_id = $2
        RETURNING user_id
      `;
      
      const removeResult = await this.db.query(removeQuery, [projectId, targetUserId]);

      if (removeResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Team member not found' });
      }

      // Log the removal
      await this.db.query(`
        INSERT INTO project_activity_logs (
          project_id, user_id, action, details, timestamp
        ) VALUES ($1, $2, 'member_removed', $3, NOW())
      `, [projectId, userId, JSON.stringify({ removed_user_id: targetUserId })]);

      res.json({
        success: true,
        message: 'Team member removed successfully'
      });
    } catch (error) {
      console.error('Remove team member error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove team member' });
    }
  }

  // PUT /api/projects/:id/team/:userId/role
  async updateTeamMemberRole(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id: projectId, userId: targetUserId } = req.params;
      const { role, permissions } = req.body;

      if (!['admin', 'editor', 'viewer'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
      }

      // Verify user can manage this project
      const accessQuery = `
        SELECT p.user_id,
               CASE 
                 WHEN p.user_id = $1 THEN 'owner'
                 WHEN pt.role = 'admin' THEN 'admin'
                 ELSE NULL
               END as user_role
        FROM projects p
        LEFT JOIN project_team pt ON p.id = pt.project_id AND pt.user_id = $1
        WHERE p.id = $2 AND (p.user_id = $1 OR pt.role = 'admin')
      `;
      
      const accessResult = await this.db.query(accessQuery, [userId, projectId]);

      if (accessResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      const project = accessResult.rows[0];

      // Can't change the project owner's role
      if (project.user_id === parseInt(targetUserId)) {
        return res.status(400).json({ success: false, error: 'Cannot change project owner role' });
      }

      // Update team member role
      const updateQuery = `
        UPDATE project_team 
        SET role = $1, permissions = $2, updated_at = NOW()
        WHERE project_id = $3 AND user_id = $4
        RETURNING user_id, role, permissions, updated_at
      `;
      
      const updateResult = await this.db.query(updateQuery, [
        role, JSON.stringify(permissions || this.getDefaultPermissions(role)), 
        projectId, targetUserId
      ]);

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Team member not found' });
      }

      // Log the role change
      await this.db.query(`
        INSERT INTO project_activity_logs (
          project_id, user_id, action, details, timestamp
        ) VALUES ($1, $2, 'role_updated', $3, NOW())
      `, [projectId, userId, JSON.stringify({ 
        target_user_id: targetUserId, 
        new_role: role 
      })]);

      res.json({
        success: true,
        data: updateResult.rows[0],
        message: 'Team member role updated successfully'
      });
    } catch (error) {
      console.error('Update team member role error:', error);
      res.status(500).json({ success: false, error: 'Failed to update team member role' });
    }
  }

  // GET /api/projects/:id/permissions
  async getProjectPermissions(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id: projectId } = req.params;

      // Get user's role and permissions for this project
      const permissionsQuery = `
        SELECT 
          p.id,
          p.name,
          CASE 
            WHEN p.user_id = $1 THEN 'owner'
            WHEN pt.role IS NOT NULL THEN pt.role
            ELSE NULL
          END as user_role,
          CASE 
            WHEN p.user_id = $1 THEN '["all"]'::json
            WHEN pt.permissions IS NOT NULL THEN pt.permissions
            ELSE '[]'::json
          END as permissions
        FROM projects p
        LEFT JOIN project_team pt ON p.id = pt.project_id AND pt.user_id = $1
        WHERE p.id = $2 AND (p.user_id = $1 OR pt.user_id = $1)
      `;
      
      const result = await this.db.query(permissionsQuery, [userId, projectId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found or access denied' });
      }

      const project = result.rows[0];
      const userPermissions = project.permissions;

      // Define available permissions
      const availablePermissions = {
        read: 'View project data and analytics',
        write: 'Create and edit project content',
        delete: 'Delete project content',
        manage_team: 'Invite and manage team members',
        manage_settings: 'Modify project settings',
        export_data: 'Export project data',
        api_access: 'Access project via API'
      };

      // Check specific permissions
      const hasPermission = (permission: string) => {
        if (project.user_role === 'owner') return true;
        if (Array.isArray(userPermissions) && userPermissions.includes('all')) return true;
        if (Array.isArray(userPermissions) && userPermissions.includes(permission)) return true;
        return false;
      };

      const effectivePermissions = Object.keys(availablePermissions).reduce((acc, perm) => {
        acc[perm] = hasPermission(perm);
        return acc;
      }, {} as Record<string, boolean>);

      res.json({
        success: true,
        data: {
          project: {
            id: project.id,
            name: project.name
          },
          user_role: project.user_role,
          permissions: effectivePermissions,
          available_permissions: availablePermissions,
          is_owner: project.user_role === 'owner'
        }
      });
    } catch (error) {
      console.error('Get project permissions error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch project permissions' });
    }
  }

  // POST /api/projects/:id/share
  async shareProject(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id: projectId } = req.params;
      const { 
        share_type = 'link', 
        permissions = ['read'], 
        expires_in_days, 
        password,
        description 
      } = req.body;

      // Verify user can share this project
      const accessQuery = `
        SELECT p.id, p.name, p.user_id,
               CASE 
                 WHEN p.user_id = $1 THEN 'owner'
                 WHEN pt.role IN ('admin', 'editor') THEN pt.role
                 ELSE NULL
               END as user_role
        FROM projects p
        LEFT JOIN project_team pt ON p.id = pt.project_id AND pt.user_id = $1
        WHERE p.id = $2 AND (p.user_id = $1 OR pt.role IN ('admin', 'editor'))
      `;
      
      const accessResult = await this.db.query(accessQuery, [userId, projectId]);

      if (accessResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      // Generate share token
      const shareToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = expires_in_days ? 
        new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000) : null;

      // Hash password if provided
      const passwordHash = password ? 
        crypto.createHash('sha256').update(password).digest('hex') : null;

      // Create shared project entry
      const shareQuery = `
        INSERT INTO shared_projects (
          project_id, shared_by, share_token, share_type, 
          permissions, password_hash, expires_at, description,
          created_at, access_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 0)
        RETURNING id, share_token, created_at, expires_at
      `;
      
      const shareResult = await this.db.query(shareQuery, [
        projectId, userId, shareToken, share_type,
        JSON.stringify(permissions), passwordHash, expiresAt, description
      ]);

      const shareLink = `${process.env.FRONTEND_URL}/shared/${shareToken}`;

      res.status(201).json({
        success: true,
        data: {
          share_id: shareResult.rows[0].id,
          share_token: shareToken,
          share_link: shareLink,
          share_type,
          permissions,
          expires_at: shareResult.rows[0].expires_at,
          password_protected: !!password,
          created_at: shareResult.rows[0].created_at
        }
      });
    } catch (error) {
      console.error('Share project error:', error);
      res.status(500).json({ success: false, error: 'Failed to share project' });
    }
  }

  // GET /api/shared-projects
  async getSharedProjects(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      // Get projects shared by the user
      const sharedByUserQuery = `
        SELECT 
          sp.id,
          sp.share_token,
          sp.share_type,
          sp.permissions,
          sp.expires_at,
          sp.created_at,
          sp.access_count,
          sp.description,
          p.name as project_name,
          p.id as project_id,
          'shared_by_me' as relationship
        FROM shared_projects sp
        JOIN projects p ON sp.project_id = p.id
        WHERE sp.shared_by = $1
        ORDER BY sp.created_at DESC
      `;
      
      const sharedByUserResult = await this.db.query(sharedByUserQuery, [userId]);

      // Get projects shared with the user (through team membership)
      const sharedWithUserQuery = `
        SELECT 
          p.id as project_id,
          p.name as project_name,
          pt.role,
          pt.permissions,
          pt.joined_at,
          u.username as owner_username,
          u.email as owner_email,
          'shared_with_me' as relationship
        FROM project_team pt
        JOIN projects p ON pt.project_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE pt.user_id = $1
        ORDER BY pt.joined_at DESC
      `;
      
      const sharedWithUserResult = await this.db.query(sharedWithUserQuery, [userId]);

      res.json({
        success: true,
        data: {
          shared_by_me: sharedByUserResult.rows,
          shared_with_me: sharedWithUserResult.rows,
          summary: {
            total_shared_by_me: sharedByUserResult.rows.length,
            total_shared_with_me: sharedWithUserResult.rows.length,
            active_shares: sharedByUserResult.rows.filter(s => 
              !s.expires_at || new Date(s.expires_at) > new Date()
            ).length
          }
        }
      });
    } catch (error) {
      console.error('Get shared projects error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch shared projects' });
    }
  }

  // Helper methods
  private getDefaultPermissions(role: string): string[] {
    const permissions = {
      admin: ['read', 'write', 'delete', 'manage_team', 'manage_settings', 'export_data', 'api_access'],
      editor: ['read', 'write', 'export_data', 'api_access'],
      viewer: ['read']
    };

    return permissions[role as keyof typeof permissions] || ['read'];
  }

  private async sendInvitationEmail(email: string, token: string, projectName: string, message?: string) {
    // TODO: Implement email sending
    // This would integrate with your email service (SendGrid, AWS SES, etc.)
    console.log(`Sending invitation email to ${email} for project ${projectName}`);
  }
}