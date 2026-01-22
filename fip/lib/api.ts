const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = {
    auth: {
        signup: async (data: { email?: string; phone?: string; password?: string; role?: string }) => {
            const res = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Signup failed');
            return res.json();
        },

        verifyOTP: async (data: { email?: string; phone?: string; otp: string }) => {
            const res = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Verification failed');
            return res.json();
        }
    },

    projects: {
        list: async (params?: { page?: number; limit?: number; chain?: string; category?: string; search?: string; sortBy?: string }) => {
            const searchParams = new URLSearchParams();
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null && value !== '') searchParams.append(key, value.toString());
                });
            }
            // Use the Business Intelligence API
            const res = await fetch(`${API_URL}/api/contract-business?${searchParams.toString()}`);
            if (!res.ok) throw new Error((await res.json()).message || 'Failed to fetch projects');
            return res.json();
        },
        create: async (data: any, token: string) => {
            const res = await fetch(`${API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Failed to create project');
            return res.json();
        },
        get: async (id: string) => {
            // Use the Business Intelligence Detail API
            const res = await fetch(`${API_URL}/api/contract-business/${id}`);
            if (!res.ok) throw new Error('Failed to fetch project details');
            return res.json();
        },
        getUserProjects: async (token: string) => {
            const res = await fetch(`${API_URL}/api/projects/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error('Failed to fetch user projects');
            return res.json();
        },
        update: async (id: string, data: any, token: string) => {
            const res = await fetch(`${API_URL}/api/projects/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update project');
            return res.json();
        },
        delete: async (id: string, token: string) => {
            const res = await fetch(`${API_URL}/api/projects/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error('Failed to delete project');
            return res.json();
        }
    },

    wallets: {
        create: async (projectId: string, data: any, token: string) => {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/wallets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to create wallet');
            return res.json();
        },
        list: async (projectId: string, token: string) => {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/wallets`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error('Failed to fetch wallets');
            return res.json();
        },
        get: async (projectId: string, walletId: string, token: string) => {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/wallets/${walletId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error('Failed to fetch wallet');
            return res.json();
        },
        refresh: async (projectId: string, walletId: string, token: string) => {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/wallets/${walletId}/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error('Failed to refresh wallet');
            return res.json();
        },
        getIndexingStatus: async (projectId: string, walletId: string, token: string) => {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/wallets/${walletId}/indexing-status`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error('Failed to fetch indexing status');
            return res.json();
        }
    }
};
