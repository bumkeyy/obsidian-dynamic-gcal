import { describe, expect, it, vi } from "vitest";

import { runCodeBlockRenderFlow } from "../main";

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
}

describe("codeblock render flow", () => {
	it("parses block + frontmatter and returns render model", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse(200, { items: [{ id: "primary", summary: "Personal", primary: true }] }))
			.mockResolvedValueOnce(
				jsonResponse(200, {
					items: [{ id: "e1", summary: "Plan", start: { dateTime: "2026-02-21T09:00:00Z" }, end: { dateTime: "2026-02-21T10:00:00Z" } }],
				}),
			);

		const result = await runCodeBlockRenderFlow({
			source: "date: frontmatter\nhide attendees",
			frontmatterDate: "2026-02-21",
			defaultCalendarIds: [],
			defaultHideAttendees: false,
			accessToken: "access-token",
			fetchFn: fetchFn as unknown as typeof fetch,
		});

		expect(result.query.targetDate).toBe("2026-02-21");
		expect(result.query.hideAttendees).toBe(true);
		expect(result.events).toHaveLength(1);
		expect(result.warnings).toEqual([]);
	});

	it("uses default calendar list when block calendar is omitted", async () => {
		const fetchFn = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse(200, {
					items: [
						{ id: "primary", summary: "Personal", primary: true },
						{ id: "work@group.calendar.google.com", summary: "Work" },
					],
				}),
			)
			.mockResolvedValueOnce(jsonResponse(200, { items: [] }));

		const result = await runCodeBlockRenderFlow({
			source: "date: 2026-02-21",
			frontmatterDate: undefined,
			defaultCalendarIds: ["Work"],
			defaultHideAttendees: true,
			accessToken: "access-token",
			fetchFn: fetchFn as unknown as typeof fetch,
		});

		expect(result.query.calendarSelectors).toEqual(["Work"]);
		expect(result.query.hideAttendees).toBe(true);
	});
});
