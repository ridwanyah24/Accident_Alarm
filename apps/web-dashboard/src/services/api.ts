import * as ApiContracts from '@accident-alarm/api-contracts';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const API_BASE = `${API_ORIGIN}/api/v1`;

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errBody;
      try {
        errBody = await response.json();
      } catch {
        errBody = { error: { message: response.statusText } };
      }
      throw new Error(errBody.error?.message || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  async getPublicConfig(): Promise<ApiContracts.PublicEmergencyConfig> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.PublicEmergencyConfig>>('/config/public');
    return res.data;
  }

  async login(email: string, password: string): Promise<{ token: string; user: ApiContracts.UserProfile }> {
    const res = await this.request<ApiContracts.ApiResponse<{ token: string; user: ApiContracts.UserProfile }>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.data.token);
    return res.data;
  }

  logout() {
    this.setToken(null);
  }

  async getCurrentUser(): Promise<ApiContracts.UserProfile> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.UserProfile>>('/auth/me');
    return res.data;
  }

  async getIncidents(filters: ApiContracts.IncidentFilterQuery = {}): Promise<{ items: ApiContracts.IncidentStaffDetailResponse[]; total: number }> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.unassignedOnly) params.append('unassignedOnly', 'true');
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.IncidentStaffDetailResponse[]>>(`/staff/incidents${query}`);
    return {
      items: res.data,
      total: res.meta?.total || res.data.length
    };
  }

  async getIncidentDetail(id: string): Promise<ApiContracts.IncidentStaffDetailResponse> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.IncidentStaffDetailResponse>>(`/staff/incidents/${id}`);
    return res.data;
  }

  async triageIncident(id: string, data: ApiContracts.TriageIncidentRequest): Promise<ApiContracts.IncidentStaffDetailResponse> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.IncidentStaffDetailResponse>>(`/staff/incidents/${id}/triage`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return res.data;
  }

  async updateIncidentStatus(id: string, toStatus: ApiContracts.IncidentStatus, note?: string): Promise<ApiContracts.IncidentStaffDetailResponse> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.IncidentStaffDetailResponse>>(`/staff/incidents/${id}/status-events`, {
      method: 'POST',
      body: JSON.stringify({ toStatus, note })
    });
    return res.data;
  }

  async addInternalNote(id: string, note: string): Promise<ApiContracts.IncidentStaffDetailResponse> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.IncidentStaffDetailResponse>>(`/staff/incidents/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
    return res.data;
  }

  async assignIncident(id: string, data: ApiContracts.CreateAssignmentRequest): Promise<any> {
    const res = await this.request<ApiContracts.ApiResponse<any>>(`/staff/incidents/${id}/assignments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  }

  async updateAssignment(id: string, data: ApiContracts.UpdateAssignmentRequest): Promise<any> {
    const res = await this.request<ApiContracts.ApiResponse<any>>(`/staff/assignments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return res.data;
  }

  async getAgencies(): Promise<ApiContracts.AgencyDto[]> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.AgencyDto[]>>('/staff/agencies');
    return res.data;
  }

  async getStaffUsers(): Promise<ApiContracts.UserProfile[]> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.UserProfile[]>>('/admin/users');
    return res.data;
  }

  async inviteStaff(data: any): Promise<ApiContracts.UserProfile> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.UserProfile>>('/admin/users/invitations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  }

  async updateStaff(id: string, data: any): Promise<ApiContracts.UserProfile> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.UserProfile>>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
    return res.data;
  }

  async getAuditLogs(): Promise<ApiContracts.AuditLogDto[]> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.AuditLogDto[]>>('/admin/audit-logs');
    return res.data;
  }

  async getNotifications(): Promise<ApiContracts.NotificationDeliveryDto[]> {
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.NotificationDeliveryDto[]>>('/staff/notifications');
    return res.data;
  }

  async createIncident(data: ApiContracts.CreateIncidentRequest, idempotencyKey?: string): Promise<ApiContracts.IncidentCreationResult> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await this.request<ApiContracts.ApiResponse<ApiContracts.IncidentCreationResult>>('/incidents', {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return res.data;
  }
}

export const api = new ApiClient();
