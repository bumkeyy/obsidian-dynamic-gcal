import { describe, expect, it } from "vitest";

import { decryptRefreshToken, encryptRefreshToken } from "./tokenVault";

describe("tokenVault", () => {
	it("encrypts and decrypts refresh token", async () => {
		const payload = await encryptRefreshToken("refresh-token-value", "safe-passphrase");
		const decrypted = await decryptRefreshToken(payload, "safe-passphrase");
		expect(decrypted).toBe("refresh-token-value");
	});

	it("throws on invalid passphrase", async () => {
		const payload = await encryptRefreshToken("refresh-token-value", "safe-passphrase");
		await expect(decryptRefreshToken(payload, "wrong-passphrase")).rejects.toThrow(
			"Unable to decrypt refresh token with the provided passphrase.",
		);
	});

	it("throws when passphrase is empty", async () => {
		await expect(encryptRefreshToken("value", "   ")).rejects.toThrow(
			"Passphrase is required for token encryption.",
		);
	});
});
