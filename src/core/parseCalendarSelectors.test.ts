import { describe, expect, it } from "vitest";

import { parseCalendarSelectors } from "./parseCalendarSelectors";

describe("parseCalendarSelectors", () => {
	it("splits comma separated values and trims whitespace", () => {
		expect(parseCalendarSelectors("personal, work,  family ")).toEqual([
			"personal",
			"work",
			"family",
		]);
	});

	it("returns unique values only", () => {
		expect(parseCalendarSelectors("work,work, personal")).toEqual(["work", "personal"]);
	});

	it("returns empty array for empty input", () => {
		expect(parseCalendarSelectors("   ")).toEqual([]);
		expect(parseCalendarSelectors(undefined)).toEqual([]);
	});
});
