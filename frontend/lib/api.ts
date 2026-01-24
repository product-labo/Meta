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
            const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Verification failed');
            return res.json();
        }
    }
};
