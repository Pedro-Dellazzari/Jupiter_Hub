import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { settingsRepo } from "../../../db/repositories/settingsRepo";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Em cliente OAuth do tipo "App para computador" o Google exige o client secret na troca do código,
// mas não o trata como segredo (ele vai embutido no app); quem protege o fluxo é o PKCE.
const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

/** `false` quando o app foi compilado sem as variáveis do Google (ver `.env.example`). */
export const isGoogleAvailable = Boolean(clientId && clientSecret);

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
/** Renova um pouco antes de vencer, para o token não expirar no meio de uma busca. */
const EXPIRY_MARGIN_MS = 60_000;

/**
 * Tokens do Google. Ficam em `app_settings`: só neste dispositivo, fora do sync —
 * nunca vão para o Supabase (mesmo critério das chaves de IA).
 */
const SETTING_KEYS = {
  refreshToken: "google.refresh_token",
  accessToken: "google.access_token",
  accessExpiresAt: "google.access_expires_at",
} as const;

export type GoogleAuthErrorKind = "cancelled" | "timeout" | "denied" | "expired" | "other";

export class GoogleAuthError extends Error {
  constructor(
    readonly kind: GoogleAuthErrorKind,
    message: string,
  ) {
    super(message);
  }
}

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
};

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomToken() {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function requestTokens(params: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId ?? "", client_secret: clientSecret ?? "", ...params }),
  });
  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok && !body.error) body.error = `http_${response.status}`;
  return body;
}

async function storeAccessToken(tokens: TokenResponse) {
  await Promise.all([
    settingsRepo.set(SETTING_KEYS.accessToken, tokens.access_token ?? ""),
    settingsRepo.set(SETTING_KEYS.accessExpiresAt, String(Date.now() + (tokens.expires_in ?? 0) * 1000)),
  ]);
}

async function clearTokens() {
  await Promise.all(Object.values(SETTING_KEYS).map((key) => settingsRepo.set(key, "")));
}

export async function hasGoogleSession(): Promise<boolean> {
  return Boolean(await settingsRepo.get(SETTING_KEYS.refreshToken));
}

/**
 * Autoriza no navegador do sistema (authorization code + PKCE, redirect em 127.0.0.1) e guarda os tokens.
 * Só resolve quando a pessoa conclui — ou rejeita com `cancelled`/`timeout`/`denied`.
 */
export async function connectGoogle(): Promise<void> {
  if (!isGoogleAvailable) throw new GoogleAuthError("other", "Integração com o Google não configurada neste build.");

  const port = await invoke<number>("oauth_loopback_start");
  const redirectUri = `http://127.0.0.1:${port}`;
  const state = randomToken();
  const verifier = randomToken();
  const challenge = base64Url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );

  await openUrl(
    `${AUTH_URL}?${new URLSearchParams({
      client_id: clientId ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPE,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      // offline + consent: garante que o Google devolve um refresh token, mesmo reconectando.
      access_type: "offline",
      prompt: "consent",
    })}`,
  );

  let query: string;
  try {
    query = await invoke<string>("oauth_loopback_wait");
  } catch (err) {
    if (err === "cancelled") throw new GoogleAuthError("cancelled", "Conexão cancelada.");
    if (err === "timeout") throw new GoogleAuthError("timeout", "A autorização demorou demais. Tente de novo.");
    throw new GoogleAuthError("other", "Não foi possível receber a resposta do Google.");
  }

  const params = new URLSearchParams(query);
  if (params.get("state") !== state) {
    throw new GoogleAuthError("other", "A resposta recebida não corresponde a este pedido de conexão.");
  }
  const code = params.get("code");
  if (!code) throw new GoogleAuthError("denied", "O acesso ao calendário não foi autorizado.");

  const tokens = await requestTokens({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  });
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new GoogleAuthError("other", "O Google não concluiu a conexão. Tente de novo.");
  }
  await Promise.all([settingsRepo.set(SETTING_KEYS.refreshToken, tokens.refresh_token), storeAccessToken(tokens)]);
}

export function cancelGoogleConnect() {
  return invoke("oauth_loopback_cancel");
}

let refreshing: Promise<string> | null = null;

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const tokens = await requestTokens({ grant_type: "refresh_token", refresh_token: refreshToken });
  if (tokens.error === "invalid_grant") {
    // Acesso revogado na conta Google, ou refresh token vencido (7 dias com o app OAuth em modo de teste).
    await clearTokens();
    throw new GoogleAuthError("expired", "A conexão com o Google expirou. Conecte de novo.");
  }
  if (!tokens.access_token) throw new GoogleAuthError("other", "Não foi possível renovar o acesso ao Google.");
  await storeAccessToken(tokens);
  return tokens.access_token;
}

/** Access token válido, renovando com o refresh token quando preciso. */
export async function getGoogleAccessToken(): Promise<string> {
  const stored = await settingsRepo.all();
  const refreshToken = stored[SETTING_KEYS.refreshToken];
  if (!refreshToken) throw new GoogleAuthError("expired", "Google Calendar não conectado.");

  const accessToken = stored[SETTING_KEYS.accessToken];
  if (accessToken && Number(stored[SETTING_KEYS.accessExpiresAt]) - EXPIRY_MARGIN_MS > Date.now()) return accessToken;

  // Buscas simultâneas (um calendário por requisição) compartilham a mesma renovação.
  refreshing ??= refreshAccessToken(refreshToken).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Revoga o acesso no Google (melhor esforço) e apaga os tokens locais. */
export async function disconnectGoogle(): Promise<void> {
  const refreshToken = await settingsRepo.get(SETTING_KEYS.refreshToken);
  if (refreshToken) {
    await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    }).catch(() => {});
  }
  await clearTokens();
}
