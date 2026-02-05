// API response types
export interface ApiResponse<T = unknown> {
  ack: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
  };
}

// Dashboard types
export interface DeviceInfo {
  name: string;
  firmware: string;
  hardware: string;
  serial: string;
}

export interface NetworkInfo {
  ip: string;
  mac: string;
}

export interface DashboardData {
  device: DeviceInfo;
  network: NetworkInfo;
  tool: ToolInfo;      // Included in dashboard response
  status: {            // Initial status (same as WebSocket push)
    timestamp: number;
    tz_offset: number;
    sram_used: number;
    sram_max: number;
    sdram_used: number;
    sdram_max: number;
    tool_state: number;
    tool_change: boolean;
  };
}

export interface ToolInfo {
  state: number; // 0=offline, 1=connecting, 2=online
  name?: string;
  firmware?: string;
  hardware?: string;
  model?: string;
  serial?: string;
}

// WebSocket status push
export interface StatusPush {
  type: 'status';
  data: {
    tool_state: number;
    tool_change: boolean;
    sram_used: number;
    sram_max: number;
    sdram_used: number;
    sdram_max: number;
    timestamp: number;
    tz_offset: number;
  };
}

// Settings types
export interface SystemSettings {
  language: number;
  unit: number;
  start_mode: number;
  activation_mode: number;
  barcode_mode: number;
  timezone: number;
}

export interface VersionSettings {
  firmware: string;
  name: string;
  hardware: string;
  serial: string;
}

export interface NetworkSettings {
  ip: string;
  mbtcp_port: number;
  custom_port: number;
}

export interface SettingsData {
  system: SystemSettings;
  ver: VersionSettings;
  network: NetworkSettings;
}

// Debug types
export interface TcpConnection {
  id: number;
  connected: boolean;
  ip: string;
  port: number;
}

export interface DebugData {
  tcp_connections: {
    custom: TcpConnection[];
    mbtcp: TcpConnection[];
  };
  udp_target_ip: string;
  cli: {
    serial_log: boolean;
    telnet_auth: boolean;
  };
  udp_forward: {
    tool_rx: boolean;
    tool_tx: boolean;
    screen_rx: boolean;
    screen_tx: boolean;
    op1_rx: boolean;
    op1_tx: boolean;
    op2_rx: boolean;
    op2_tx: boolean;
    mbtcp1_rx: boolean;
    mbtcp1_tx: boolean;
    mbtcp2_rx: boolean;
    mbtcp2_tx: boolean;
    mbtcp3_rx: boolean;
    mbtcp3_tx: boolean;
    udp_log: boolean;
  };
  op_log: {
    io: boolean;
    mbtcp: boolean;
    op: boolean;
    tool: boolean;
    screen: boolean;
  };
}

// Log types
export interface LogEntry {
  name: string;
  size: number;
  type: 'file' | 'memory';
}

export interface LogListData {
  logs: LogEntry[];
}

export interface LogDownloadData {
  offset: number;
  size: number;
  content: string;
}

// Login response
export interface LoginResponse {
  user: string;
  level: number;
}
