import { createOAuthState, generateCodeChallenge } from "./pkce";

const DEFAULT_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const DEFAULT_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DEFAULT_REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export interface OAuthClientConfig {
	clientId: string;
	redirectUri: string;
	scopes: string[];
	authEndpoint?: string;
	tokenEndpoint?: string;
	revokeEndpoint?: string;
}

export interface OAuthTokenBundle {
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
	scope: string;
	tokenType: string;
}

export interface AuthorizeRequestResult {
	url: string;
	state: string;
	codeVerifier: string;
}

export interface OAuthCallbackParams {
	code?: string;
	state?: string;
	error?: string;
}

interface TokenResponse {
	access_token: string;
	expires_in: number;
	token_type?: string;
	scope?: string;
	refresh_token?: string;
}

export async function createAuthorizeRequest(config: OAuthClientConfig, codeVerifier: string): Promise<AuthorizeRequestResult> {
	assertConfig(config);
	const state = createOAuthState();
	const codeChallenge = await generateCodeChallenge(codeVerifier);

	const url = new URL(config.authEndpoint ?? DEFAULT_AUTH_ENDPOINT);
	url.searchParams.set("client_id", config.clientId);
	url.searchParams.set("redirect_uri", config.redirectUri);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", config.scopes.join(" "));
	url.searchParams.set("state", state);
	url.searchParams.set("code_challenge", codeChallenge);
	url.searchParams.set("code_challenge_method", "S256");
	url.searchParams.set("access_type", "offline");
	url.searchParams.set("prompt", "consent");

	return {
		url: url.toString(),
		state,
		codeVerifier,
	};
}

export function parseOAuthCallbackParams(params: OAuthCallbackParams): { code: string; state: string } {
	if (params.error) {
		throw new Error(`OAuth callback returned an error: ${params.error}`);
	}
	if (!params.code || !params.state) {
		throw new Error("OAuth callback is missing required query params.");
	}

	return {
		code: params.code,
		state: params.state,
	};
}

export function assertCallbackState(expectedState: string, callbackState: string): void {
	if (expectedState !== callbackState) {
		throw new Error("OAuth state mismatch. Please retry login.");
	}
}

export async function exchangeCodeForTokens(
	config: OAuthClientConfig,
	code: string,
	codeVerifier: string,
	fetchFn: typeof fetch = fetch,
	now: () => number = Date.now,
): Promise<OAuthTokenBundle> {
	assertConfig(config);
	const body = new URLSearchParams({
		code,
		client_id: config.clientId,
		code_verifier: codeVerifier,
		redirect_uri: config.redirectUri,
		grant_type: "authorization_code",
	});

	const response = await fetchFn(config.tokenEndpoint ?? DEFAULT_TOKEN_ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
	});

	if (!response.ok) {
		throw new Error(`Token exchange failed with status ${response.status}.`);
	}

	const json = (await response.json()) as TokenResponse;
	return normalizeTokenResponse(json, now(), json.refresh_token);
}

export async function refreshAccessToken(
	config: OAuthClientConfig,
	refreshToken: string,
	fetchFn: typeof fetch = fetch,
	now: () => number = Date.now,
): Promise<OAuthTokenBundle> {
	assertConfig(config);
	const body = new URLSearchParams({
		client_id: config.clientId,
		refresh_token: refreshToken,
		grant_type: "refresh_token",
	});

	const response = await fetchFn(config.tokenEndpoint ?? DEFAULT_TOKEN_ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
	});

	if (!response.ok) {
		throw new Error(`Token refresh failed with status ${response.status}.`);
	}

	const json = (await response.json()) as TokenResponse;
	return normalizeTokenResponse(json, now(), refreshToken);
}

export async function revokeToken(config: OAuthClientConfig, token: string, fetchFn: typeof fetch = fetch): Promise<void> {
	assertConfig(config);
	if (!token) {
		return;
	}

	const body = new URLSearchParams({ token });
	const response = await fetchFn(config.revokeEndpoint ?? DEFAULT_REVOKE_ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body,
	});

	if (!response.ok) {
		throw new Error(`Token revoke failed with status ${response.status}.`);
	}
}

function normalizeTokenResponse(raw: TokenResponse, nowEpochMs: number, fallbackRefreshToken?: string): OAuthTokenBundle {
	if (!raw.access_token || typeof raw.expires_in !== "number") {
		throw new Error("Token response is missing required fields.");
	}

	return {
		accessToken: raw.access_token,
		refreshToken: raw.refresh_token ?? fallbackRefreshToken,
		expiresAt: nowEpochMs + raw.expires_in * 1000,
		scope: raw.scope ?? "",
		tokenType: raw.token_type ?? "Bearer",
	};
}

function assertConfig(config: OAuthClientConfig): void {
	if (!config.clientId.trim()) {
		throw new Error("Google OAuth client ID is required.");
	}
	if (!config.redirectUri.trim()) {
		throw new Error("OAuth redirect URI is required.");
	}
	if (!config.scopes.length) {
		throw new Error("At least one OAuth scope is required.");
	}
}
