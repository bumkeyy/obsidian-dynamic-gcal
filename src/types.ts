import type { NormalizedEvent } from "./api/normalizeGoogleEvent";
import type { OAuthTokenBundle } from "./auth/oauth";
import type { EncryptedTokenPayload } from "./auth/tokenVault";

export const GCAL_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export interface GcalBlockQuery {
	targetDate: string;
	calendarSelectors: string[];
	hideAttendees: boolean;
}

export type TokenBundle = OAuthTokenBundle;

export interface AuthResult {
	ok: boolean;
	message: string;
}

export type GcalEvent = NormalizedEvent;

export interface AuthState {
	status: "logged_out" | "pending" | "logged_in" | "error";
	message: string;
	hasRefreshToken: boolean;
}

export interface TokenMeta {
	expiresAt: number;
	scope: string;
	tokenType: string;
}

export interface DynamicGcalSettings {
	googleClientId: string;
	encryptedRefreshToken?: EncryptedTokenPayload;
	tokenMeta?: TokenMeta;
	authState: AuthState;
	defaultCalendarIds: string[];
	defaultHideAttendees: boolean;
}

export const DEFAULT_SETTINGS: DynamicGcalSettings = {
	googleClientId: "",
	encryptedRefreshToken: undefined,
	tokenMeta: undefined,
	authState: {
		status: "logged_out",
		message: "Not connected",
		hasRefreshToken: false,
	},
	defaultCalendarIds: [],
	defaultHideAttendees: false,
};
