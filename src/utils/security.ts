import { ConnectionStatus } from "../types";

/**
 * Simulates generating a cryptographically secure session key using AES-256-GCM.
 */
export function generateSessionKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "AES_256_GCM_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a mock replay protection token (nonce + timestamp-signed).
 */
export function generateReplayToken(): string {
  const nonce = Math.floor(Math.random() * 1000000).toString(16);
  const ts = Date.now();
  return `replay_shield_${nonce}_${ts}`;
}

export interface SecurityState {
  failedAttempts: number;
  lockoutUntil: number | null;
}

/**
 * Handles security checks for connecting.
 * Supports rate limiting.
 */
export function verifyConnectionPassword(
  passwordInput: string,
  correctPassword: string,
  securityState: SecurityState,
  onFailed: (attempts: number, lockoutDurationSeconds: number | null) => void,
  onSuccess: () => void
) {
  const now = Date.now();
  
  if (securityState.lockoutUntil && now < securityState.lockoutUntil) {
    return ConnectionStatus.LOCKED_OUT;
  }

  if (passwordInput !== correctPassword) {
    const nextAttempts = securityState.failedAttempts + 1;
    let lockoutDuration = null;
    
    // Rate limit rule: Lock out for 30s after 3 failed attempts, 60s after 5
    if (nextAttempts >= 5) {
      lockoutDuration = 60000; // 60 seconds
    } else if (nextAttempts >= 3) {
      lockoutDuration = 30000; // 30 seconds
    }

    onFailed(nextAttempts, lockoutDuration ? lockoutDuration / 1000 : null);
    return ConnectionStatus.IDLE;
  }

  onSuccess();
  return ConnectionStatus.CONNECTED;
}

/**
 * Generates standard connection logs reflecting C++20 Boost.Asio, OpenSSL, 
 * and DXGI Desktop Duplication handshakes.
 */
export function getHandshakeLogs(
  remoteId: string, 
  sessionKey: string, 
  replayToken: string,
  networkPreset: string
): string[] {
  return [
    `[Boost.Asio] [TCP] Socket initiated: binding endpoint to 0.0.0.0...`,
    `[Boost.Asio] [TCP] Resolving route to remote node ID: ${remoteId}...`,
    `[Boost.Asio] [TCP] Handshake requested: Connection established successfully.`,
    `[OpenSSL] [TLSv1.3] ClientHello sent with cipher suites [TLS_AES_256_GCM_SHA384].`,
    `[OpenSSL] [TLSv1.3] ServerHello received. Verifying remote host cert.`,
    `[Security] [Handshake] Negotiating custom ephemeral Diffie-Hellman session keys...`,
    `[Security] [Handshake] Session Key generated successfully: ${sessionKey}`,
    `[Security] [ReplayShield] Challenge-response validated with replay token: ${replayToken}`,
    `[Security] [Auth] Transmitting credentials securely over TLS channel...`,
    `[Security] [Auth] Password validated by remote client host.`,
    `[DXGI] [ScreenCapture] Desktop Duplication API initialized on Primary Monitor.`,
    `[FFmpeg] [NVENC] Hardware accelerated H.264 Encoder ready. Mode: Dynamic Bitrate.`,
    `[Boost.Asio] [UDP] Signaling stream active. Subscribing to dirty rectangles buffer.`,
    `[NetworkPreset] Network profile active: ${networkPreset}. Streaming started at 60 FPS.`
  ];
}
