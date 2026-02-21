export interface GoogleEventAttendee {
	email?: string;
	displayName?: string;
	self?: boolean;
	responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
}

export interface GoogleEvent {
	id?: string;
	summary?: string;
	start?: {
		date?: string;
		dateTime?: string;
	};
	end?: {
		date?: string;
		dateTime?: string;
	};
	attendees?: GoogleEventAttendee[];
}

export interface NormalizedEvent {
	id: string;
	calendarId: string;
	calendarName: string;
	calendarColor?: string;
	summary: string;
	responseStatus?: "needsAction" | "declined" | "tentative" | "accepted" | "unknown";
	isAllDay: boolean;
	startTs: number;
	endTs: number;
	attendees: string[];
}

export function normalizeGoogleEvent(
	event: GoogleEvent,
	calendarId: string,
	calendarName: string,
	calendarColor?: string,
): NormalizedEvent {
	const start = parseGoogleDate(event.start);
	if (!start) {
		throw new Error("Google event is missing start date/dateTime.");
	}

	const end = parseGoogleDate(event.end) ?? start;
	const attendees = (event.attendees ?? [])
		.map((item) => item.displayName ?? item.email ?? "")
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
	const selfAttendee = (event.attendees ?? []).find((attendee) => attendee.self);
	const responseStatus = selfAttendee?.responseStatus ?? "unknown";

	return {
		id: event.id ?? `${calendarId}-${start.timestamp}`,
		calendarId,
		calendarName,
		calendarColor,
		summary: event.summary?.trim() || "(Untitled)",
		responseStatus,
		isAllDay: start.isAllDay,
		startTs: start.timestamp,
		endTs: end.timestamp,
		attendees,
	};
}

function parseGoogleDate(value: GoogleEvent["start"] | GoogleEvent["end"]): { timestamp: number; isAllDay: boolean } | undefined {
	if (!value) {
		return undefined;
	}
	if (value.dateTime) {
		const dateTime = new Date(value.dateTime);
		if (!Number.isNaN(dateTime.getTime())) {
			return {
				timestamp: dateTime.getTime(),
				isAllDay: false,
			};
		}
	}
	if (value.date) {
		const date = new Date(`${value.date}T00:00:00`);
		if (!Number.isNaN(date.getTime())) {
			return {
				timestamp: date.getTime(),
				isAllDay: true,
			};
		}
	}

	return undefined;
}
