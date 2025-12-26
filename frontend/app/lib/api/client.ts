const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    full_name: string;
    role?: string;
}

export interface ApiResponse<T> {
    data?: T;
    error?: string;
}

class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor() {
        this.baseUrl = API_URL;

        // Load token from localStorage if available
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('access_token');
        }
    }

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', token);
        }
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers,
            });

            if (!response.ok) {
                const error = await response.json();
                return { error: error.detail || 'An error occurred' };
            }

            const data = await response.json();
            return { data };
        } catch (error) {
            return { error: 'Network error occurred' };
        }
    }

    // Auth endpoints
    async login(credentials: LoginCredentials) {
        const formData = new FormData();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);

        const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.detail || 'Login failed' };
        }

        const data = await response.json();
        this.setToken(data.access_token);
        return { data };
    }

    async register(userData: RegisterData) {
        return this.request('/api/v1/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async getCurrentUser() {
        return this.request('/api/v1/auth/me');
    }

    // Decision endpoints
    async createDecision(decisionData: any) {
        return this.request('/api/v1/decisions/create', {
            method: 'POST',
            body: JSON.stringify(decisionData),
        });
    }

    async getDecisions(params?: { skip?: number; limit?: number }) {
        const queryParams = new URLSearchParams();
        if (params?.skip) queryParams.append('skip', params.skip.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        const query = queryParams.toString();
        return this.request(`/api/v1/decisions${query ? `?${query}` : ''}`);
    }

    async getDecision(id: string) {
        return this.request(`/api/v1/decisions/${id}`);
    }

    async analyzeDecision(id: string) {
        return this.request(`/api/v1/decisions/${id}/analyze`, {
            method: 'POST',
        });
    }

    async explainDecision(id: string) {
        return this.request(`/api/v1/decisions/${id}/explain`, {
            method: 'POST',
        });
    }

    async finalizeDecision(id: string) {
        return this.request(`/api/v1/decisions/${id}/finalize`, {
            method: 'PUT',
        });
    }

    async uploadDecisionData(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const headers: HeadersInit = {};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseUrl}/api/v1/decisions/upload`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            return { error: error.detail || 'Upload failed' };
        }

        const data = await response.json();
        return { data };
    }

    // Analytics endpoints
    async getDashboardMetrics() {
        return this.request('/api/v1/analytics/dashboard');
    }

    async getBiasTrends(days: number = 30) {
        return this.request(`/api/v1/analytics/bias-trends?days=${days}`);
    }

    async getFairnessMetrics() {
        return this.request('/api/v1/analytics/fairness-metrics');
    }
}

export const apiClient = new ApiClient();
