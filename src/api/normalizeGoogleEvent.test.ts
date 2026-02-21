import { describe, expect, it } from "vitest";

import { normalizeGoogleEvent } from "./normalizeGoogleEvent";

describe("normalizeGoogleEvent", () => {
	it("normalizes timed event", () => {
		const normalized = normalizeGoogleEvent(
			{
				id: "1",
				summary: "Standup",
				start: { dateTime: "2026-02-21T10:00:00Z" },
				end: { dateTime: "2026-02-21T10:30:00Z" },
				attendees: [{ email: "a@example.com", self: true, responseStatus: "accepted" }, { displayName: "B" }],
			},
			"work",
			"Work",
			"#00AAFF",
		);

		expect(normalized.summary).toBe("Standup");
		expect(normalized.isAllDay).toBe(false);
		expect(normalized.attendees).toEqual(["a@example.com", "B"]);
		expect(normalized.responseStatus).toBe("accepted");
		expect(normalized.calendarColor).toBe("#00AAFF");
	});

	it("normalizes all-day event and untitled summary", () => {
		const normalized = normalizeGoogleEvent(
			{
				start: { date: "2026-02-21" },
				end: { date: "2026-02-22" },
			},
			"personal",
			"Personal",
		);

		expect(normalized.isAllDay).toBe(true);
		expect(normalized.summary).toBe("(Untitled)");
		expect(normalized.responseStatus).toBe("unknown");
	});

	it("throws for missing start", () => {
		expect(() => normalizeGoogleEvent({}, "id", "name")).toThrow("Google event is missing start date/dateTime.");
	});
});
