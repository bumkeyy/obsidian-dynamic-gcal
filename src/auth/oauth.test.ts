import { describe, expect, it, vi } from "vitest";

import {
	assertCallbackState,
	createAuthorizeRequest,
	exchangeCodeForTokens,
	parseOAuthCallbackParams,
	refreshAccessToken,
	revokeToken,
} from "./oauth";

const config = {
	clientId: "client-id",
	clientSecret: "client-secret",
	redirectUri: "https://bumkeyy.github.io/obsidian-dynamic-gcal/",
	scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
};

describe("oauth", () => {
	it("creates authorize request URL", async () => {
		const request = await createAuthorizeRequest(config, "test-verifier");
		const url = new URL(request.url);
		expect(url.searchParams.get("client_id")).toBe(config.clientId);
		expect(url.searchParams.get("redirect_uri")).toBe(config.redirectUri);
		expect(url.searchParams.get("scope")).toContain("calendar.readonly");
		expect(url.searchParams.get("code_challenge_method")).toBe("S256");
		expect(request.state.length).toBeGreaterThan(8);
	});

	it("exchanges auth code for tokens", async () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const fetchFn = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				access_token: "access-token",
				refresh_token: "refresh-token",
				expires_in: 3600,
				token_type: "Bearer",
				scope: "calendar.readonly",
			}),
		});

		const token = await exchangeCodeForTokens(config, "code", "verifier", fetchFn, () => 1000);
		expect(token).toEqual({
			accessToken: "access-token",
			refreshToken: "refresh-token",
			expiresAt: 3_601_000,
			scope: "calendar.readonly",
			tokenType: "Bearer",
		});
		expect(fetchFn).toHaveBeenCalledTimes(1);
		const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
		const body = init.body as URLSearchParams;
		expect(body.get("grant_type")).toBe("authorization_code");
		expect(body.get("redirect_uri")).toBe(config.redirectUri);
		expect(body.get("code_verifier")).toBe("verifier");
		expect(body.get("client_secret")).toBe(config.clientSecret);
		expect(logSpy).toHaveBeenCalledWith(
			"[dynamic-gcal] oauth exchange payload",
			expect.objectContaining({
				client_secret: "cl***et",
				grant_type: "authorization_code",
			}),
		);
		logSpy.mockRestore();
	});

	it("refreshes access token and preserves refresh token", async () => {
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		const fetchFn = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				access_token: "next-access-token",
				expires_in: 1200,
			}),
		});

		const token = await refreshAccessToken(config, "refresh-token", fetchFn, () => 5000);
		expect(token.accessToken).toBe("next-access-token");
		expect(token.refreshToken).toBe("refresh-token");
		expect(token.expiresAt).toBe(1_205_000);
		const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
		const body = init.body as URLSearchParams;
		expect(body.get("grant_type")).toBe("refresh_token");
		expect(body.get("client_secret")).toBe(config.clientSecret);
		expect(logSpy).toHaveBeenCalledWith(
			"[dynamic-gcal] oauth refresh payload",
			expect.objectContaining({
				client_secret: "cl***et",
				grant_type: "refresh_token",
			}),
		);
		logSpy.mockRestore();
	});

	it("parses callback params and validates state", () => {
		const parsed = parseOAuthCallbackParams({ code: "auth-code", state: "state-a" });
		expect(parsed).toEqual({ code: "auth-code", state: "state-a" });
		expect(() => assertCallbackState("state-a", "state-b")).toThrow("OAuth state mismatch. Please retry login.");
	});

	it("revokes token", async () => {
		const fetchFn = vi.fn().mockResolvedValue({ ok: true });
		await revokeToken(config, "token", fetchFn);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});
});
