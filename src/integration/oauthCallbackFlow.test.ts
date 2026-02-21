import { describe, expect, it, vi } from "vitest";

import { handleOAuthCallbackFlow } from "../main";

const oauthConfig = {
	clientId: "client-id",
	redirectUri: "obsidian://gcal-auth",
	scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
};

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

describe("oauth callback flow", () => {
	it("exchanges auth code when state matches", async () => {
		const fetchFn = vi.fn().mockResolvedValue(
			jsonResponse(200, {
				access_token: "access",
				refresh_token: "refresh",
				expires_in: 3600,
				token_type: "Bearer",
				scope: "calendar.readonly",
			}),
		);

		const token = await handleOAuthCallbackFlow({
			params: { code: "auth-code", state: "state-1" },
			pendingAuth: {
				state: "state-1",
				codeVerifier: "verifier",
			},
			oauthConfig,
			fetchFn,
			now: () => 100,
		});

		expect(token.accessToken).toBe("access");
		expect(token.refreshToken).toBe("refresh");
		expect(token.expiresAt).toBe(3_600_100);
	});

	it("throws when state mismatches", async () => {
		await expect(
			handleOAuthCallbackFlow({
				params: { code: "auth-code", state: "state-2" },
				pendingAuth: {
					state: "state-1",
					codeVerifier: "verifier",
				},
				oauthConfig,
			}),
		).rejects.toThrow("OAuth state mismatch. Please retry login.");
	});
});
