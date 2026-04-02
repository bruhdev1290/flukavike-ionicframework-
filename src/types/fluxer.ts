// ─────────────────────────────────────────────────────────────────────────────
// Discovery
// ─────────────────────────────────────────────────────────────────────────────
export interface FluxerWellKnown {
  api: string;      // e.g. "https://api.fluxer.app/v1"
  gateway: string;  // e.g. "wss://gateway.fluxer.app"
  cdn: string;      // e.g. "https://cdn.fluxer.app"
  version?: string;
  captcha?: {
    provider: 'hcaptcha' | 'turnstile' | 'none';
    hcaptcha_site_key?: string;
    turnstile_site_key?: string;
  };
  features?: {
    sms_mfa_enabled: boolean;
    voice_enabled: boolean;
    stripe_enabled: boolean;
    self_hosted: boolean;
    manual_review_enabled: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth — Login
// NOTE: Server returns `mfa` boolean discriminant, NOT an `allowedMethods` array.
// ─────────────────────────────────────────────────────────────────────────────
export interface LoginSuccessResponse {
  mfa: false;
  user_id: string;
  token: string;
  pending_verification?: boolean; // True when MFA disabled + unrecognized IP — check email
}

export interface LoginMfaRequiredResponse {
  mfa: true;
  ticket: string; // 5-minute TTL — store in React state only, never Preferences
  sms: boolean;
  totp: boolean;
  webauthn: boolean;
}

export type LoginResponse = LoginSuccessResponse | LoginMfaRequiredResponse;

export type MfaMethod = 'totp' | 'sms' | 'webauthn';

// Narrowing helpers
export const isLoginSuccess = (r: LoginResponse): r is LoginSuccessResponse => !r.mfa;
export const isMfaRequired  = (r: LoginResponse): r is LoginMfaRequiredResponse => r.mfa;

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────
export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline' | 'invisible';

export interface FluxerUser {
  id: string;
  username: string;
  global_name?: string;
  discriminator: string;
  email?: string;
  avatar?: string | null;
  flags?: number;
  premium_type?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Guild / Server
// ─────────────────────────────────────────────────────────────────────────────
export interface FluxerGuild {
  id: string;
  name: string;
  icon?: string | null;
  owner_id: string;
  member_count?: number;
  unread?: boolean;
  mention_count?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel
// ─────────────────────────────────────────────────────────────────────────────
export type ChannelType = 'text' | 'voice' | 'dm' | 'group_dm' | 'announcement';

export interface FluxerChannel {
  id: string;
  name: string;
  type: ChannelType;
  guild_id?: string;
  position?: number;
  parent_id?: string | null; // category id
  unread?: boolean;
  mention_count?: number;
  topic?: string | null;
}

export interface FluxerCategory {
  id: string;
  name: string;
  position: number;
  collapsed?: boolean;
  channels: FluxerChannel[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────────────────────────
export interface FluxerMessage {
  id: string;
  channel_id: string;
  author: FluxerUser;
  content: string;
  timestamp: string; // ISO8601
  edited_timestamp?: string | null;
  attachments?: FluxerAttachment[];
  reactions?: FluxerReaction[];
  referenced_message?: FluxerMessage | null;
  mentions?: FluxerUser[];
}

export interface FluxerAttachment {
  id: string;
  filename: string;
  url: string;
  proxy_url: string;
  size: number;
  width?: number;
  height?: number;
  content_type?: string;
}

export interface FluxerReaction {
  count: number;
  me: boolean;
  emoji: { id?: string | null; name: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Gateway
// ─────────────────────────────────────────────────────────────────────────────
export interface GatewayIdentifyProperties {
  os: string;
  browser: string;
  device: string;
}

export interface GatewayPayload {
  op: number;
  d?: unknown;
  s?: number | null;
  t?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────
export interface FluxerApiError {
  code: number;
  message: string;
  errors?: Record<string, unknown>;
}

export class FluxerHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly apiError: FluxerApiError,
    public readonly retryAfter?: number,
  ) {
    super(apiError.message);
    this.name = 'FluxerHttpError';
  }
}

export class FluxerRateLimitError extends FluxerHttpError {
  constructor(retryAfter: number) {
    super(429, { code: 429, message: 'You are being rate limited.' }, retryAfter);
    this.name = 'FluxerRateLimitError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth State Machine
// ─────────────────────────────────────────────────────────────────────────────
export type AuthStateName =
  | 'initializing'      // App boot: checking stored token — splash screen is visible
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'mfa_required'
  | 'ip_auth_required'  // Unrecognized IP + no MFA: authorization email sent
  | 'error';
