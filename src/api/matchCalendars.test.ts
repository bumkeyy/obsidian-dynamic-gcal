import { describe, expect, it } from "vitest";

import { matchCalendars } from "./matchCalendars";

const calendars = [
	{ id: "primary", summary: "Personal", primary: true },
	{ id: "work@group.calendar.google.com", summary: "Work" },
];

describe("matchCalendars", () => {
	it("returns primary calendar by default", () => {
		const result = matchCalendars(calendars, []);
		expect(result.matched.map((item) => item.id)).toEqual(["primary"]);
		expect(result.unresolved).toEqual([]);
	});

	it("matches by id and summary", () => {
		const result = matchCalendars(calendars, ["Work", "primary"]);
		expect(result.matched.map((item) => item.id)).toEqual([
			"work@group.calendar.google.com",
			"primary",
		]);
	});

	it("returns unresolved selectors", () => {
		const result = matchCalendars(calendars, ["missing"]);
		expect(result.matched).toEqual([]);
		expect(result.unresolved).toEqual(["missing"]);
	});
});
