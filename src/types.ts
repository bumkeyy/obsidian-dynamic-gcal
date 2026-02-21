import type { NormalizedEvent } from "./api/normalizeGoogleEvent";
import type { OAuthTokenBundle } from "./auth/oauth";

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

export interface DynamicGcalSettings {
	googleClientId: string;
	tokens?: TokenBundle;
	authState: AuthState;
	defaultCalendarIds: string[];
	defaultHideAttendees: boolean;
}

export const DEFAULT_SETTINGS: DynamicGcalSettings = {
	googleClientId: "",
	tokens: undefined,
	authState: {
		status: "logged_out",
		message: "Not connected",
		hasRefreshToken: false,
	},
	defaultCalendarIds: [],
	defaultHideAttendees: false,
};
