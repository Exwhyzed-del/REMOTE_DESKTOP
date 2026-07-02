export enum ConnectionStatus {
  IDLE = "IDLE",
  CONNECTING = "CONNECTING",
  HANDSHAKE = "HANDSHAKE",
  VERIFYING = "VERIFYING",
  CONNECTED = "CONNECTED",
  DISCONNECTED = "DISCONNECTED",
  LOCKED_OUT = "LOCKED_OUT"
}

export enum NetworkPreset {
  LAN = "LAN",
  WAN_4G = "WAN_4G",
  WAN_3G = "WAN_3G",
  BAD_CONNECTION = "BAD_CONNECTION"
}

export enum ColorDepth {
  DEPTH_24BIT = "DEPTH_24BIT",
  DEPTH_16BIT = "DEPTH_16BIT",
  DEPTH_8BIT_GRAY = "DEPTH_8BIT_GRAY"
}

export enum ControlMode {
  FULL_CONTROL = "FULL_CONTROL",
  VIEW_ONLY = "VIEW_ONLY"
}

export enum CaptureMode {
  VIRTUAL_OS = "VIRTUAL_OS",
  REAL_SCREEN = "REAL_SCREEN"
}

export interface NetworkMetrics {
  fps: number;
  latency: number; // in ms
  bitrate: number; // in Mbps
  packetLoss: number; // in %
  dirtyRectsCount: number;
  totalPacketsSent: number;
  hardwareEncoding: boolean;
  compressionRatio: number;
}

export interface InputEventLog {
  id: string;
  type: "click" | "move" | "keydown" | "scroll" | "drag";
  detail: string;
  timestamp: string;
  networkSize: number; // bytes
}

export interface VirtualFile {
  id: string;
  name: string;
  type: "folder" | "txt" | "image" | "code";
  content?: string;
  x: number;
  y: number;
}

export interface RecentSession {
  id: string;
  deviceId: string;
  alias: string;
  lastConnected: string;
}
