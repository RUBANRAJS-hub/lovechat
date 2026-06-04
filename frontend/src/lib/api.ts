const API_BASE = 'http://localhost:5000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  status: number;
}

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('foreverus_token');
  }
  return null;
};

export const apiRequest = async <T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  isMultipart = false
): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = {};

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    if (isMultipart) {
      config.body = body; // Formdata
    } else {
      config.body = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (response.status === 401) {
    // Session expired, clear token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('foreverus_token');
    }
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data as T;
};
