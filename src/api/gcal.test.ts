import { describe, expect, it, vi } from "vitest";

import { fetchCalendarEvents } from "./gcal";

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

describe("fetchCalendarEvents", () => {
	it("fetches primary calendar by default", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse(200, {
					items: [{ id: "primary", summary: "Personal", primary: true, backgroundColor: "#3367d6" }],
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse(200, {
					items: [{ id: "e1", summary: "Breakfast", start: { dateTime: "2026-02-21T08:00:00Z" }, end: { dateTime: "2026-02-21T08:30:00Z" } }],
				}),
			);

		const result = await fetchCalendarEvents({
			accessToken: "token",
			targetDate: "2026-02-21",
			calendarSelectors: [],
			fetchFn: fetchFn as unknown as typeof fetch,
		});

		expect(result.events).toHaveLength(1);
		expect(result.events[0]?.summary).toBe("Breakfast");
		expect(result.events[0]?.calendarColor).toBe("#3367d6");
		expect(result.warnings).toEqual([]);
		expect(result.usedRefresh).toBe(false);
	});

	it("retries once on 401 by refreshing token", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 401 }))
			.mockResolvedValueOnce(jsonResponse(200, { items: [{ id: "primary", summary: "Personal", primary: true }] }))
			.mockResolvedValueOnce(jsonResponse(200, { items: [] }));

		const onUnauthorized = vi.fn().mockResolvedValue("new-token");
		const result = await fetchCalendarEvents({
			accessToken: "old-token",
			targetDate: "2026-02-21",
			calendarSelectors: [],
			fetchFn: fetchFn as unknown as typeof fetch,
			onUnauthorized,
		});

		expect(onUnauthorized).toHaveBeenCalledTimes(1);
		expect(result.usedRefresh).toBe(true);
	});

	it("collects unresolved calendar warning", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(200, { items: [{ id: "primary", summary: "Personal", primary: true }] }));

		const result = await fetchCalendarEvents({
			accessToken: "token",
			targetDate: "2026-02-21",
			calendarSelectors: ["missing"],
			fetchFn: fetchFn as unknown as typeof fetch,
		});

		expect(result.events).toEqual([]);
		expect(result.unresolvedCalendars).toEqual(["missing"]);
		expect(result.warnings[0]).toContain("Unresolved calendars");
	});
});
