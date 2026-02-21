import { fromBase64Url, generateRandomBase64Url, toBase64Url } from "./pkce";

const DEFAULT_ITERATIONS = 210_000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface EncryptedTokenPayload {
	ciphertext: string;
	iv: string;
	salt: string;
	iterations: number;
	createdAt: number;
}

export async function encryptRefreshToken(
	refreshToken: string,
	passphrase: string,
	iterations: number = DEFAULT_ITERATIONS,
): Promise<EncryptedTokenPayload> {
	assertNonEmpty(passphrase, "Passphrase is required for token encryption.");
	assertNonEmpty(refreshToken, "Refresh token is required.");

	const salt = generateRandomBase64Url(16);
	const iv = generateRandomBase64Url(12);
	const key = await deriveAesKey(passphrase, fromBase64Url(salt), iterations, ["encrypt"]);
	const encrypted = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: fromBase64Url(iv),
		},
		key,
		textEncoder.encode(refreshToken),
	);

	return {
		ciphertext: toBase64Url(encrypted),
		iv,
		salt,
		iterations,
		createdAt: Date.now(),
	};
}

export async function decryptRefreshToken(payload: EncryptedTokenPayload, passphrase: string): Promise<string> {
	assertNonEmpty(passphrase, "Passphrase is required for token decryption.");

	const key = await deriveAesKey(passphrase, fromBase64Url(payload.salt), payload.iterations, ["decrypt"]);

	try {
		const decrypted = await crypto.subtle.decrypt(
			{
				name: "AES-GCM",
				iv: fromBase64Url(payload.iv),
			},
			key,
			fromBase64Url(payload.ciphertext),
		);
		return textDecoder.decode(decrypted);
	} catch {
		throw new Error("Unable to decrypt refresh token with the provided passphrase.");
	}
}

async function deriveAesKey(
	passphrase: string,
	salt: Uint8Array,
	iterations: number,
	usages: KeyUsage[],
): Promise<CryptoKey> {
	const material = await crypto.subtle.importKey("raw", textEncoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);

	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt,
			iterations,
			hash: "SHA-256",
		},
		material,
		{
			name: "AES-GCM",
			length: 256,
		},
		false,
		usages,
	);
}

function assertNonEmpty(value: string, message: string): void {
	if (!value.trim()) {
		throw new Error(message);
	}
}
