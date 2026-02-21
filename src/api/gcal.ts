import { buildEventQueryParams } from "./buildEventQueryParams";
import { matchCalendars, type CalendarListItem } from "./matchCalendars";
import { mergeAndSortEvents } from "./mergeAndSortEvents";
import { normalizeGoogleEvent, type GoogleEvent, type NormalizedEvent } from "./normalizeGoogleEvent";

interface CalendarListResponse {
	items?: CalendarListItem[];
}

interface EventListResponse {
	items?: GoogleEvent[];
}

interface AuthorizedFetchResult {
	response: Response;
	usedRefresh: boolean;
}

export interface FetchCalendarEventsOptions {
	accessToken: string;
	targetDate: string;
	calendarSelectors: string[];
	fetchFn?: typeof fetch;
	onUnauthorized?: () => Promise<string | undefined>;
	timeoutMs?: number;
}

export interface FetchCalendarEventsResult {
	events: NormalizedEvent[];
	unresolvedCalendars: string[];
	warnings: string[];
	usedRefresh: boolean;
}

export async function fetchCalendarEvents(options: FetchCalendarEventsOptions): Promise<FetchCalendarEventsResult> {
	const fetchFn = options.fetchFn ?? fetch;
	const authFetch = createAuthorizedFetch(options.accessToken, options.onUnauthorized, fetchFn, options.timeoutMs ?? 10_000);

	const calendarList = await fetchCalendarList(authFetch);
	const selected = matchCalendars(calendarList, options.calendarSelectors);
	const warnings: string[] = [];
	if (selected.unresolved.length) {
		warnings.push(`Unresolved calendars: ${selected.unresolved.join(", ")}`);
	}

	const eventLists = await Promise.all(
		selected.matched.map(async (calendar) => {
			try {
				return await fetchEventsForCalendar(authFetch, calendar.id, calendar.summary, options.targetDate);
			} catch {
				warnings.push(`Failed to fetch events for calendar: ${calendar.summary}`);
				return [];
			}
		}),
	);

	return {
		events: mergeAndSortEvents(eventLists),
		unresolvedCalendars: selected.unresolved,
		warnings,
		usedRefresh: authFetch.didRefresh(),
	};
}

export async function fetchCalendarList(
	authorizedFetch: (url: string, init?: RequestInit) => Promise<AuthorizedFetchResult>,
): Promise<CalendarListItem[]> {
	const { response } = await authorizedFetch("https://www.googleapis.com/calendar/v3/users/me/calendarList");
	if (!response.ok) {
		throw new Error(`Failed to fetch calendar list with status ${response.status}.`);
	}

	const json = (await response.json()) as CalendarListResponse;
	return json.items ?? [];
}

export async function fetchEventsForCalendar(
	authorizedFetch: (url: string, init?: RequestInit) => Promise<AuthorizedFetchResult>,
	calendarId: string,
	calendarName: string,
	targetDate: string,
): Promise<NormalizedEvent[]> {
	const query = buildEventQueryParams(targetDate);
	const encodedCalendarId = encodeURIComponent(calendarId);
	const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?${query.toString()}`;
	const { response } = await authorizedFetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch events for ${calendarName} with status ${response.status}.`);
	}

	const json = (await response.json()) as EventListResponse;
	return (json.items ?? []).map((item) => normalizeGoogleEvent(item, calendarId, calendarName));
}

function createAuthorizedFetch(
	initialAccessToken: string,
	onUnauthorized: (() => Promise<string | undefined>) | undefined,
	fetchFn: typeof fetch,
	timeoutMs: number,
): ((url: string, init?: RequestInit) => Promise<AuthorizedFetchResult>) & { didRefresh: () => boolean } {
	let accessToken = initialAccessToken;
	let usedRefresh = false;
	let refreshInFlight: Promise<string | undefined> | undefined;

	const run = async (url: string, init?: RequestInit): Promise<AuthorizedFetchResult> => {
		const firstResponse = await executeWithTimeout(fetchFn, url, withAuthHeaders(init, accessToken), timeoutMs);
		if (firstResponse.status !== 401 || !onUnauthorized) {
			return { response: firstResponse, usedRefresh: false };
		}

		if (!refreshInFlight) {
			refreshInFlight = onUnauthorized().finally(() => {
				refreshInFlight = undefined;
			});
		}

		const refreshedToken = await refreshInFlight;
		if (!refreshedToken) {
			return { response: firstResponse, usedRefresh: false };
		}

		accessToken = refreshedToken;
		usedRefresh = true;
		const retryResponse = await executeWithTimeout(fetchFn, url, withAuthHeaders(init, accessToken), timeoutMs);
		return { response: retryResponse, usedRefresh: true };
	};

	return Object.assign(run, {
		didRefresh: () => usedRefresh,
	});
}

function withAuthHeaders(init: RequestInit | undefined, accessToken: string): RequestInit {
	const headers = new Headers(init?.headers ?? undefined);
	headers.set("Authorization", `Bearer ${accessToken}`);
	return {
		...init,
		headers,
	};
}

async function executeWithTimeout(fetchFn: typeof fetch, url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetchFn(url, {
			...init,
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timer);
	}
}
