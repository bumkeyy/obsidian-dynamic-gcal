import React from "react";
import { Notice, Plugin, TFile, type MarkdownPostProcessorContext } from "obsidian";

import { fetchCalendarEvents } from "./api/gcal";
import { createAuthorizeRequest, assertCallbackState, exchangeCodeForTokens, parseOAuthCallbackParams, refreshAccessToken, revokeToken, type OAuthClientConfig } from "./auth/oauth";
import { generateCodeVerifier } from "./auth/pkce";
import { parseGcalBlock } from "./core/parseGcalBlock";
import { resolveTargetDate } from "./core/resolveTargetDate";
import { DynamicGcalSettingTab } from "./settings";
import { DEFAULT_SETTINGS, GCAL_READONLY_SCOPE, type AuthResult, type DynamicGcalSettings, type GcalBlockQuery, type GcalEvent, type TokenBundle } from "./types";
import { CalendarApp } from "./view/CalendarApp";
import { ReactChild } from "./view/ReactChild";

const REDIRECT_URI = "https://bumkeyy.github.io/obsidian-dynamic-gcal/";
const MIN_VALIDITY_MS = 60_000;
const PENDING_AUTH_STORAGE_KEY = "obsidian-dynamic-gcal:pending-auth";

interface PendingAuthSession {
	state: string;
	codeVerifier: string;
}

export interface OAuthCallbackFlowInput {
	params: Record<string, string>;
	pendingAuth: PendingAuthSession | undefined;
	oauthConfig: OAuthClientConfig;
	fetchFn?: typeof fetch;
	now?: () => number;
}

export interface CodeBlockRenderFlowInput {
	source: string;
	frontmatterDate: unknown;
	defaultCalendarIds: string[];
	defaultHideAttendees: boolean;
	accessToken: string;
	fetchFn?: typeof fetch;
	onUnauthorized?: () => Promise<string | undefined>;
	now?: Date;
}

export interface CodeBlockRenderFlowResult {
	query: GcalBlockQuery;
	events: GcalEvent[];
	warnings: string[];
	unresolvedCalendars: string[];
	usedRefresh: boolean;
}

export async function handleOAuthCallbackFlow(input: OAuthCallbackFlowInput): Promise<TokenBundle> {
	if (!input.pendingAuth) {
		throw new Error("No pending OAuth request was found. Please start login again.");
	}

	const callback = parseOAuthCallbackParams({
		code: input.params.code,
		state: input.params.state,
		error: input.params.error,
	});
	assertCallbackState(input.pendingAuth.state, callback.state);

	return exchangeCodeForTokens(
		input.oauthConfig,
		callback.code,
		input.pendingAuth.codeVerifier,
		input.fetchFn,
		input.now,
	);
}

export async function runCodeBlockRenderFlow(input: CodeBlockRenderFlowInput): Promise<CodeBlockRenderFlowResult> {
	const parsed = parseGcalBlock(input.source);
	const resolvedDate = resolveTargetDate(parsed, input.frontmatterDate, input.now);
	const calendarSelectors = parsed.calendarSelectors.length ? parsed.calendarSelectors : input.defaultCalendarIds;
	const hideAttendees = parsed.hideAttendees || input.defaultHideAttendees;

	const eventsResult = await fetchCalendarEvents({
		accessToken: input.accessToken,
		targetDate: resolvedDate.targetDate,
		calendarSelectors,
		fetchFn: input.fetchFn,
		onUnauthorized: input.onUnauthorized,
	});

	return {
		query: {
			targetDate: resolvedDate.targetDate,
			calendarSelectors,
			hideAttendees,
		},
		events: eventsResult.events,
		warnings: [...resolvedDate.warnings, ...eventsResult.warnings],
		unresolvedCalendars: eventsResult.unresolvedCalendars,
		usedRefresh: eventsResult.usedRefresh,
	};
}

export default class DynamicGoogleCalendarPlugin extends Plugin {
	settings: DynamicGcalSettings;
	private runtimeAccessToken: string | undefined;
	private pendingAuth: PendingAuthSession | undefined;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.addCommand({
			id: "gcal-login",
			name: "Login to Google Calendar",
			callback: async () => {
				await this.startLoginFlow();
			},
		});

		this.addCommand({
			id: "gcal-logout",
			name: "Logout from Google Calendar",
			callback: async () => {
				await this.logout();
			},
		});

		this.addCommand({
			id: "gcal-refresh-calendars",
			name: "Refresh Google Calendar token",
			callback: async () => {
				const refreshed = await this.refreshAccessTokenFromStoredToken();
				new Notice(refreshed ? "Google Calendar token refreshed." : "Unable to refresh token.");
			},
		});

		this.registerObsidianProtocolHandler("gcal-auth", async (params) => {
			await this.handleOAuthCallback(params);
		});

		this.registerMarkdownCodeBlockProcessor("gcal", (source, el, context) => {
			const container = el.createDiv({ cls: "dynamic-gcal-root" });
			const state = {
				isLoading: true,
				error: undefined as string | undefined,
				events: [] as GcalEvent[],
				warnings: [] as string[],
				hideAttendees: this.settings.defaultHideAttendees,
			};

			const child = new ReactChild(container, () =>
				React.createElement(CalendarApp, {
					isLoading: state.isLoading,
					error: state.error,
					events: state.events,
					warnings: state.warnings,
					hideAttendees: state.hideAttendees,
				}),
			);
			context.addChild(child);

			void this.renderCalendarBlock(source, context, state, child);
		});

		this.addSettingTab(new DynamicGcalSettingTab(this.app, this));
	}

	async startLoginFlow(): Promise<void> {
		try {
			const config = this.getOAuthConfig();

			const codeVerifier = generateCodeVerifier();
			const authRequest = await createAuthorizeRequest(config, codeVerifier);
			this.pendingAuth = {
				state: authRequest.state,
				codeVerifier: authRequest.codeVerifier,
			};
			this.persistPendingAuthSession(this.pendingAuth);
			this.settings.authState = {
				status: "pending",
				message: "Waiting for OAuth callback...",
				hasRefreshToken: Boolean(this.settings.tokens?.refreshToken),
			};
			await this.saveSettings();
			window.open(authRequest.url, "_blank");
		} catch (error) {
			const message = toErrorMessage(error);
			new Notice(message);
			this.settings.authState = {
				status: "error",
				message,
				hasRefreshToken: Boolean(this.settings.tokens?.refreshToken),
			};
			await this.saveSettings();
		}
	}

	async logout(): Promise<void> {
		const config = this.tryGetOAuthConfig();

		const runtimeAccessToken = this.runtimeAccessToken;
		if (config && runtimeAccessToken) {
			await safeExecute(() => revokeToken(config, runtimeAccessToken));
		}
		const refreshToken = this.settings.tokens?.refreshToken;
		if (config && refreshToken) {
			await safeExecute(() => revokeToken(config, refreshToken));
		}

		this.runtimeAccessToken = undefined;
		this.pendingAuth = undefined;
		this.clearPendingAuthSession();
		this.settings.tokens = undefined;
		this.settings.authState = {
			status: "logged_out",
			message: "Disconnected",
			hasRefreshToken: false,
		};
		await this.saveSettings();
		new Notice("Google Calendar logout complete.");
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<DynamicGcalSettings>);
		this.settings.defaultCalendarIds = this.settings.defaultCalendarIds ?? [];
		this.runtimeAccessToken = this.settings.tokens?.accessToken;
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async handleOAuthCallback(params: Record<string, string>): Promise<void> {
		try {
			const pendingAuth = this.pendingAuth ?? this.loadPendingAuthSession();
			const tokenBundle = await handleOAuthCallbackFlow({
				params,
				pendingAuth,
				oauthConfig: this.getOAuthConfig(),
			});

			this.runtimeAccessToken = tokenBundle.accessToken;
			this.settings.tokens = tokenBundle;
			this.settings.authState = {
				status: "logged_in",
				message: "Connected to Google Calendar",
				hasRefreshToken: Boolean(this.settings.tokens?.refreshToken),
			};
			await this.saveSettings();
			new Notice("Google Calendar login complete.");
		} catch (error) {
			const message = toErrorMessage(error);
			this.settings.authState = {
				status: "error",
				message,
				hasRefreshToken: Boolean(this.settings.tokens?.refreshToken),
			};
			await this.saveSettings();
			new Notice(message);
		} finally {
			this.pendingAuth = undefined;
			this.clearPendingAuthSession();
		}
	}

	private async renderCalendarBlock(
		source: string,
		context: MarkdownPostProcessorContext,
		state: {
			isLoading: boolean;
			error?: string;
			events: GcalEvent[];
			warnings: string[];
			hideAttendees: boolean;
		},
		child: ReactChild,
	): Promise<void> {
		try {
			const accessToken = await this.getValidAccessToken();
			const frontmatterDate = this.getFrontmatterDate(context);
			const result = await runCodeBlockRenderFlow({
				source,
				frontmatterDate,
				defaultCalendarIds: this.settings.defaultCalendarIds,
				defaultHideAttendees: this.settings.defaultHideAttendees,
				accessToken,
				onUnauthorized: async () => this.refreshAccessTokenFromStoredToken(),
			});

			state.error = undefined;
			state.events = result.events;
			state.warnings = result.warnings;
			state.hideAttendees = result.query.hideAttendees;
		} catch (error) {
			state.error = toErrorMessage(error);
			state.events = [];
		} finally {
			state.isLoading = false;
			child.update(() =>
				React.createElement(CalendarApp, {
					isLoading: state.isLoading,
					error: state.error,
					events: state.events,
					warnings: state.warnings,
					hideAttendees: state.hideAttendees,
				}),
			);
		}
	}

	private getFrontmatterDate(context: MarkdownPostProcessorContext): unknown {
		const file = this.app.vault.getAbstractFileByPath(context.sourcePath);
		if (!(file instanceof TFile)) {
			return undefined;
		}

		const cache = this.app.metadataCache.getFileCache(file);
		return cache?.frontmatter?.date;
	}

	private async getValidAccessToken(): Promise<string> {
		if (this.runtimeAccessToken && !isExpiringSoon(this.settings.tokens?.expiresAt)) {
			return this.runtimeAccessToken;
		}

		const refreshed = await this.refreshAccessTokenFromStoredToken();
		if (!refreshed) {
			throw new Error("Login required. Open plugin settings and connect your Google account.");
		}

		return refreshed;
	}

	private async refreshAccessTokenFromStoredToken(): Promise<string | undefined> {
		const refreshToken = this.settings.tokens?.refreshToken;
		if (!refreshToken) {
			return undefined;
		}
		const refreshed = await refreshAccessToken(this.getOAuthConfig(), refreshToken);
		this.runtimeAccessToken = refreshed.accessToken;
		this.settings.tokens = {
			...refreshed,
			refreshToken: refreshed.refreshToken ?? refreshToken,
		};

		this.settings.authState = {
			status: "logged_in",
			message: "Connected to Google Calendar",
			hasRefreshToken: Boolean(this.settings.tokens?.refreshToken),
		};
		await this.saveSettings();
		return this.runtimeAccessToken;
	}

	private tryGetOAuthConfig(): OAuthClientConfig | undefined {
		const clientId = this.settings.googleClientId.trim();
		const clientSecret = this.settings.googleClientSecret.trim();
		if (!clientId || !clientSecret) {
			return undefined;
		}
		return {
			clientId,
			clientSecret,
			redirectUri: REDIRECT_URI,
			scopes: [GCAL_READONLY_SCOPE],
		};
	}

	private getOAuthConfig(): OAuthClientConfig {
		const config = this.tryGetOAuthConfig();
		if (!config) {
			throw new Error("Google OAuth client ID and client secret are required.");
		}
		return config;
	}

	private persistPendingAuthSession(session: PendingAuthSession): void {
		try {
			localStorage.setItem(PENDING_AUTH_STORAGE_KEY, JSON.stringify(session));
		} catch {
			// Ignore storage errors and keep in-memory fallback.
		}
	}

	private loadPendingAuthSession(): PendingAuthSession | undefined {
		try {
			const raw = localStorage.getItem(PENDING_AUTH_STORAGE_KEY);
			if (!raw) {
				return undefined;
			}
			const parsed = JSON.parse(raw) as Partial<PendingAuthSession>;
			if (typeof parsed.state === "string" && typeof parsed.codeVerifier === "string") {
				return { state: parsed.state, codeVerifier: parsed.codeVerifier };
			}
		} catch {
			// Ignore invalid storage payloads.
		}
		return undefined;
	}

	private clearPendingAuthSession(): void {
		try {
			localStorage.removeItem(PENDING_AUTH_STORAGE_KEY);
		} catch {
			// Ignore storage errors.
		}
	}
}

function isExpiringSoon(expiresAt: number | undefined): boolean {
	if (!expiresAt) {
		return true;
	}
	return expiresAt - Date.now() < MIN_VALIDITY_MS;
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return "Unexpected error";
}

async function safeExecute(task: () => Promise<void>): Promise<AuthResult> {
	try {
		await task();
		return { ok: true, message: "ok" };
	} catch (error) {
		return { ok: false, message: toErrorMessage(error) };
	}
}
