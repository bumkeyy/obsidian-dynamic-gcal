import React from "react";

import type { NormalizedEvent } from "../api/normalizeGoogleEvent";

export interface CalendarAppProps {
	title?: string;
	isLoading: boolean;
	error?: string;
	events: NormalizedEvent[];
	warnings?: string[];
	hideAttendees: boolean;
}

export function CalendarApp({
	title = "Google Calendar",
	isLoading,
	error,
	events,
	warnings = [],
	hideAttendees,
}: CalendarAppProps) {
	const calendars = getCalendars(events);

	return (
		<section data-testid="calendar-app" className="gcal-root">
			<header className="gcal-heading">{title}</header>

			{isLoading ? <p className="gcal-state">Loading events...</p> : null}
			{error ? <p className="gcal-state" role="alert">{error}</p> : null}

			{warnings.length > 0 ? (
				<ul className="gcal-warnings">
					{warnings.map((warning) => (
						<li key={warning}>{warning}</li>
					))}
				</ul>
			) : null}

			{!isLoading && !error && events.length === 0 ? <p className="gcal-state">No events for this date.</p> : null}

			{events.length > 0 ? (
				<>
					<div className="gcal-calendar-legend">
						{calendars.map((calendar) => (
							<div className="gcal-calendar-chip" key={calendar.calendarId}>
								<span
									className="gcal-calendar-chip-dot"
									style={{ backgroundColor: getCalendarColor(calendar.calendarColor) }}
								></span>
								<span>{calendar.calendarName}</span>
							</div>
						))}
					</div>
					<div className="gcal-timeline-container">
					{events.map((event) => (
						<div className="gcal-timeline-item" key={`${event.calendarId}-${event.id}`}>
							<div
								className="gcal-timeline-dot"
								style={{ backgroundColor: getCalendarColor(event.calendarColor) }}
							></div>
							<div className="gcal-timeline-content">
								<div className="gcal-time">{formatTimeRange(event)}</div>
								<div className="gcal-title">{event.summary}</div>
								{!hideAttendees && event.attendees.length > 0 ? (
									<div className="gcal-attendees">Attendees: {event.attendees.join(", ")}</div>
								) : null}
							</div>
						</div>
					))}
					</div>
				</>
			) : null}
		</section>
	);
}

function formatTime(timestamp: number): string {
	return new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(timestamp));
}

function formatTimeRange(event: NormalizedEvent): string {
	if (event.isAllDay) {
		return "All day";
	}
	return `${formatTime(event.startTs)} - ${formatTime(event.endTs)}`;
}

function getCalendarColor(color: string | undefined): string {
	if (color && /^#(?:[0-9a-fA-F]{3}){1,2}$/u.test(color)) {
		return color;
	}
	return "var(--interactive-accent)";
}

function getCalendars(events: NormalizedEvent[]): Array<{ calendarId: string; calendarName: string; calendarColor?: string }> {
	const seen = new Set<string>();
	const calendars: Array<{ calendarId: string; calendarName: string; calendarColor?: string }> = [];
	for (const event of events) {
		if (seen.has(event.calendarId)) {
			continue;
		}
		seen.add(event.calendarId);
		calendars.push({
			calendarId: event.calendarId,
			calendarName: event.calendarName,
			calendarColor: event.calendarColor,
		});
	}
	return calendars;
}
