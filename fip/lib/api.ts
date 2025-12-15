const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export const api = {
    auth: {
        signup: async (data: { email?: string; phone?: string; password?: string; role?: string }) => {
            const res = await fetch(`${API_URL}/auth/signup`, {
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
        },
        get: async (id: string) => {
            // Use the Business Intelligence Detail API
            const res = await fetch(`${API_URL}/api/contract-business/${id}`);
            if (!res.ok) throw new Error('Failed to fetch project details');
            return res.json();
        }
    }
};
