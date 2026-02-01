import type {
  ApiResponse,
  DashboardData,
  ToolInfo,
  SettingsData,
  DebugData,
  LogListData,
  LogDownloadData,
  LoginResponse,
} from './types';

const API_BASE = '';

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    // Redirect to login
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return res.json();
}

// Auth API
export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Authorization': 'Basic ' + btoa(`${username}:${password}`),
    },
  });

  if (res.status === 401) {
    throw new Error('Invalid credentials');
  }

  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/logout`, {
    method: 'GET',
    credentials: 'include',
  });
}

// Dashboard API
export async function getDashboard(): Promise<ApiResponse<DashboardData>> {
  return request<DashboardData>('/api/dashboard');
}

export async function getTool(): Promise<ApiResponse<ToolInfo>> {
  return request<ToolInfo>('/api/tool');
}

// Settings API
export async function getSettings(): Promise<ApiResponse<SettingsData>> {
  return request<SettingsData>('/api/settings');
}

export async function updateSystemSettings(data: Partial<SettingsData['system']>): Promise<ApiResponse> {
  return request('/api/settings/system', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVersionSettings(data: Partial<SettingsData['ver']>): Promise<ApiResponse> {
  return request('/api/settings/ver', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateNetworkSettings(data: Partial<SettingsData['network']>): Promise<ApiResponse> {
  return request('/api/settings/network', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function syncTime(timestamp: number): Promise<ApiResponse> {
  return request('/api/settings/sync-time', {
    method: 'POST',
    body: JSON.stringify({ timestamp }),
  });
}

// Debug API
export async function getDebug(): Promise<ApiResponse<DebugData>> {
  return request<DebugData>('/api/debug');
}

export async function updateDebug(data: Partial<DebugData>): Promise<ApiResponse> {
  return request('/api/debug', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function saveDebug(): Promise<ApiResponse> {
  return request('/api/debug/save', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// Log API
export async function getLogList(): Promise<ApiResponse<LogListData>> {
  return request<LogListData>('/api/log');
}

export async function downloadLogChunk(
  name: string,
  offset: number,
  size: number = 1024
): Promise<ApiResponse<LogDownloadData>> {
  return request<LogDownloadData>(
    `/api/log/download?name=${encodeURIComponent(name)}&offset=${offset}&size=${size}`
  );
}

// Firmware API
export async function firmwareBegin(
  target: string,
  name: string,
  size: number
): Promise<ApiResponse> {
  return request('/api/firmware/begin', {
    method: 'POST',
    body: JSON.stringify({ target, name, size }),
  });
}

export async function firmwareUpload(
  offset: number,
  data: ArrayBuffer
): Promise<ApiResponse<{ offset: number; written: number }>> {
  const res = await fetch(`${API_BASE}/api/firmware/upload?offset=${offset}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: data,
  });
  return res.json();
}

// System API
export async function reboot(): Promise<ApiResponse> {
  return request('/api/reboot', { method: 'POST' });
}

// WebSocket
export function createStatusWebSocket(
  onMessage: (data: unknown) => void,
  onError?: (error: Event) => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('WebSocket parse error:', e);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    onError?.(error);
  };

  return ws;
}
