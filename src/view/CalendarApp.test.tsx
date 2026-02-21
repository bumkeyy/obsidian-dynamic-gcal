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

	it("renders events and attendee visibility based on option", () => {
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
		expect(document.querySelector(".gcal-status-accepted")).toBeInTheDocument();
		expect(document.querySelector(".gcal-calendar-chip")).toBeInTheDocument();
		expect(document.querySelector(".gcal-calendar-chip-dot")).toHaveStyle({ backgroundColor: "#3367d6" });
	});

	it("hides attendees when configured", () => {
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
						startTs: Date.now(),
						endTs: Date.now(),
						attendees: ["alice@example.com"],
					},
				]}
				hideAttendees={true}
			/>,
		);

		expect(container.textContent).not.toContain("Attendees:");
		expect(document.querySelector(".gcal-status-declined")).toBeInTheDocument();
		expect(container.textContent).toContain(" - ");
	});
});
