import { describe, expect, it } from "vitest";

import { createOAuthState, createPkcePair, generateCodeChallenge } from "./pkce";

describe("pkce", () => {
	it("creates deterministic challenge from known verifier", async () => {
		const challenge = await generateCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
		expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
	});

	it("creates pkce pair", async () => {
		const pair = await createPkcePair();
		expect(pair.codeVerifier.length).toBeGreaterThan(20);
		expect(pair.codeChallenge.length).toBeGreaterThan(20);
	});

	it("creates random oauth state", () => {
		const stateA = createOAuthState();
		const stateB = createOAuthState();
		expect(stateA).not.toEqual(stateB);
	});
});
