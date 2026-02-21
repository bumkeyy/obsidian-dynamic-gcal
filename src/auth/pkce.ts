const DEFAULT_RANDOM_BYTES = 32;

export function toBase64Url(input: ArrayBuffer | Uint8Array): string {
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

export function fromBase64Url(value: string): Uint8Array {
	const padded = value.replace(/-/gu, "+").replace(/_/gu, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
	const binary = atob(padded);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function generateRandomBase64Url(randomBytes: number = DEFAULT_RANDOM_BYTES): string {
	const bytes = new Uint8Array(randomBytes);
	crypto.getRandomValues(bytes);
	return toBase64Url(bytes);
}

export function generateCodeVerifier(): string {
	return generateRandomBase64Url(64);
}

export function createOAuthState(): string {
	return generateRandomBase64Url();
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(codeVerifier);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return toBase64Url(digest);
}

export async function createPkcePair(): Promise<{ codeVerifier: string; codeChallenge: string }> {
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = await generateCodeChallenge(codeVerifier);
	return { codeVerifier, codeChallenge };
}
