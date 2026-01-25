const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Auth token management
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token'); // Changed from 'authToken' to 'token' to match auth provider
  }
  return null;
};

const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token); // Changed from 'authToken' to 'token' to match auth provider
  }
};

const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token'); // Changed from 'authToken' to 'token' to match auth provider
  }
};

// API request helper with auth
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
};

export const api = {
  auth: {
    register: async (data: { email: string; password: string; name: string }) => {
      const result = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (result.token) {
        setAuthToken(result.token);
      }
      return result;
    },

    login: async (data: { email: string; password: string }) => {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (result.token) {
        setAuthToken(result.token);
      }
      return result;
    },

    logout: () => {
      removeAuthToken();
    },

    getCurrentUser: async () => {
      return apiRequest('/api/auth/me');
    },

    // Legacy methods for compatibility
    signup: async (data: { email?: string; phone?: string; password?: string; role?: string }) => {
      return api.auth.register({
        email: data.email || '',
        password: data.password || '',
        name: data.role || 'user'
      });
    },

    verifyOTP: async (data: { email?: string; phone?: string; otp: string }) => {
      // For now, just return success - OTP not implemented in backend yet
      return { success: true, message: 'Verification successful' };
    }
  },

  contracts: {
    list: async () => {
      return apiRequest('/api/contracts');
    },

    create: async (data?: any) => {
      return apiRequest('/api/contracts', {
        method: 'POST',
        body: JSON.stringify(data || {}), // Empty body uses .env defaults
      });
    },

    get: async (id: string) => {
      return apiRequest(`/api/contracts/${id}`);
    },

    update: async (id: string, data: any) => {
      return apiRequest(`/api/contracts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string) => {
      return apiRequest(`/api/contracts/${id}`, {
        method: 'DELETE',
      });
    }
  },

  analysis: {
    start: async (configId: string, analysisType: 'single' | 'competitive' | 'comparative' = 'competitive') => {
      return apiRequest('/api/analysis/start', {
        method: 'POST',
        body: JSON.stringify({ configId, analysisType }),
      });
    },

    getStatus: async (analysisId: string) => {
      return apiRequest(`/api/analysis/${analysisId}/status`);
    },

    getResults: async (analysisId: string) => {
      return apiRequest(`/api/analysis/${analysisId}/results`);
    },

    getHistory: async () => {
      return apiRequest('/api/analysis/history');
    },

    getStats: async () => {
      return apiRequest('/api/analysis/stats');
    },

    // AI-powered endpoints
    interpretWithAI: async (analysisId: string) => {
      return apiRequest(`/api/analysis/${analysisId}/interpret`, {
        method: 'POST',
      });
    },

    getQuickInsights: async (analysisId: string) => {
      return apiRequest(`/api/analysis/${analysisId}/quick-insights`);
    },

    getRecommendations: async (analysisId: string, contractType: string = 'defi') => {
      return apiRequest(`/api/analysis/${analysisId}/recommendations`, {
        method: 'POST',
        body: JSON.stringify({ contractType }),
      });
    },

    // New enhanced AI endpoints
    generateAlerts: async (analysisId: string, previousResultsId?: string) => {
      return apiRequest(`/api/analysis/${analysisId}/alerts`, {
        method: 'POST',
        body: JSON.stringify({ previousResultsId }),
      });
    },

    generateSentiment: async (analysisId: string, marketData?: any) => {
      return apiRequest(`/api/analysis/${analysisId}/sentiment`, {
        method: 'POST',
        body: JSON.stringify({ marketData }),
      });
    },

    generateOptimizations: async (analysisId: string, contractType: string = 'defi') => {
      return apiRequest(`/api/analysis/${analysisId}/optimizations`, {
        method: 'POST',
        body: JSON.stringify({ contractType }),
      });
    }
  },

  users: {
    getDashboard: async () => {
      return apiRequest('/api/users/dashboard');
    },

    getProfile: async () => {
      return apiRequest('/api/users/profile');
    },

    updateProfile: async (data: any) => {
      return apiRequest('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    getUsage: async () => {
      return apiRequest('/api/users/usage');
    }
  }
};

// Analysis monitoring helper
export const monitorAnalysis = async (
  analysisId: string, 
  onProgress: (status: any) => void,
  pollInterval: number = 5000
): Promise<any> => {
  const poll = async (): Promise<any> => {
    try {
      const status = await api.analysis.getStatus(analysisId);
      onProgress(status);
      
      if (status.status === 'completed') {
        return api.analysis.getResults(analysisId);
      } else if (status.status === 'failed') {
        throw new Error(status.errorMessage || 'Analysis failed');
      } else {
        // Continue polling
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        return poll();
      }
    } catch (error) {
      console.error('Analysis monitoring error:', error);
      throw error;
    }
  };
  
  return poll();
};

export { getAuthToken, setAuthToken, removeAuthToken };
