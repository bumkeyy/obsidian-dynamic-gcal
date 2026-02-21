import { describe, expect, it } from "vitest";

import { mergeAndSortEvents } from "./mergeAndSortEvents";

describe("mergeAndSortEvents", () => {
	it("merges multiple lists and sorts by start time", () => {
		const result = mergeAndSortEvents([
			[
				{ id: "2", summary: "B", calendarId: "a", calendarName: "A", isAllDay: false, startTs: 20, endTs: 21, attendees: [] },
			],
			[
				{ id: "1", summary: "A", calendarId: "b", calendarName: "B", isAllDay: false, startTs: 10, endTs: 11, attendees: [] },
			],
		]);

		expect(result.map((item) => item.id)).toEqual(["1", "2"]);
	});

	it("uses summary as secondary sort key", () => {
		const result = mergeAndSortEvents([
			[
				{ id: "2", summary: "Beta", calendarId: "a", calendarName: "A", isAllDay: false, startTs: 10, endTs: 11, attendees: [] },
				{ id: "1", summary: "Alpha", calendarId: "a", calendarName: "A", isAllDay: false, startTs: 10, endTs: 11, attendees: [] },
			],
		]);

		expect(result.map((item) => item.summary)).toEqual(["Alpha", "Beta"]);
	});
});
