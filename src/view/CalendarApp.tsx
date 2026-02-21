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

export function CalendarApp({ title = "Google Calendar", isLoading, error, events, warnings = [], hideAttendees }: CalendarAppProps) {
	return (
		<section
			data-testid="calendar-app"
			style={{
				border: "1px solid var(--background-modifier-border)",
				background: "var(--background-secondary)",
				color: "var(--text-normal)",
				padding: "12px",
				borderRadius: "8px",
				fontSize: "0.95rem",
			}}
		>
			<header style={{ marginBottom: "8px", fontWeight: 600 }}>{title}</header>

			{isLoading ? <p style={{ color: "var(--text-muted)", margin: 0 }}>Loading events...</p> : null}
			{error ? <p role="alert" style={{ color: "var(--text-normal)", margin: "0 0 8px 0" }}>{error}</p> : null}

			{warnings.length > 0 ? (
				<ul style={{ margin: "0 0 8px 0", color: "var(--text-muted)", paddingLeft: "18px" }}>
					{warnings.map((warning) => (
						<li key={warning}>{warning}</li>
					))}
				</ul>
			) : null}

			{!isLoading && !error && events.length === 0 ? (
				<p style={{ color: "var(--text-muted)", margin: 0 }}>No events for this date.</p>
			) : null}

			{events.length > 0 ? (
				<ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "8px" }}>
					{events.map((event) => (
						<li
							key={`${event.calendarId}-${event.id}`}
							style={{
								border: "1px solid var(--background-modifier-border)",
								background: "var(--background-primary)",
								padding: "8px",
								borderRadius: "6px",
							}}
						>
							<div style={{ fontWeight: 600 }}>{event.summary}</div>
							<div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
								{event.isAllDay ? "All day" : formatEventTime(event.startTs)} · {event.calendarName}
							</div>
							{!hideAttendees && event.attendees.length > 0 ? (
								<div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
									Attendees: {event.attendees.join(", ")}
								</div>
							) : null}
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}

function formatEventTime(timestamp: number): string {
	return new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(timestamp));
}
