import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CalendarApp } from "./CalendarApp";

describe("CalendarApp", () => {
	it("renders loading state", () => {
		render(<CalendarApp isLoading={true} events={[]} hideAttendees={false} />);
		expect(screen.getByText("Loading events...")).toBeInTheDocument();
	});

	it("renders error state", () => {
		render(<CalendarApp isLoading={false} error="Auth failed" events={[]} hideAttendees={false} />);
		expect(screen.getByRole("alert")).toHaveTextContent("Auth failed");
	});

	it("renders attendees when hideAttendees is false", () => {
		render(
			<CalendarApp
				isLoading={false}
				events={[
					{
						id: "1",
						calendarId: "primary",
						calendarName: "Personal",
						calendarColor: "#3367d6",
						summary: "All-day note",
						responseStatus: "accepted",
						isAllDay: true,
						startTs: 1,
						endTs: 2,
						attendees: ["alice@example.com"],
					},
				]}
				hideAttendees={false}
			/>,
		);

		expect(screen.getByText("All-day note")).toBeInTheDocument();
		expect(screen.getByText("All day")).toBeInTheDocument();
		expect(screen.getByText("Personal")).toBeInTheDocument();
		expect(screen.getByText("Attendees: alice@example.com")).toBeInTheDocument();
		expect(document.querySelector(".gcal-calendar-chip")).toBeInTheDocument();
		expect(document.querySelector(".gcal-calendar-chip-dot")).toHaveStyle({ backgroundColor: "#3367d6" });
		const timelineDot = document.querySelector(".gcal-timeline-dot");
		expect(timelineDot).toHaveStyle({ backgroundColor: "#3367d6" });
	});

	it("hides attendees when hideAttendees is true", () => {
		const { container } = render(
			<CalendarApp
				isLoading={false}
				events={[
					{
						id: "1",
						calendarId: "primary",
						calendarName: "Personal",
						calendarColor: "#3367d6",
						summary: "Standup",
						responseStatus: "declined",
						isAllDay: false,
						startTs: new Date("2026-02-21T09:00:00Z").getTime(),
						endTs: new Date("2026-02-21T10:00:00Z").getTime(),
						attendees: ["alice@example.com"],
					},
				]}
				hideAttendees={true}
			/>,
		);

		expect(container.textContent).not.toContain("Attendees:");
		expect(container.textContent).toContain(" - ");
	});
});
