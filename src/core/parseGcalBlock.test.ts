import { describe, expect, it } from "vitest";

import { parseGcalBlock } from "./parseGcalBlock";

describe("parseGcalBlock", () => {
	it("parses frontmatter date, calendars, and hide attendees flag", () => {
		const parsed = parseGcalBlock("date: frontmatter\ncalendar: personal, work\nhide attendees");
		expect(parsed.dateMode).toBe("frontmatter");
		expect(parsed.dateLiteral).toBeUndefined();
		expect(parsed.calendarSelectors).toEqual(["personal", "work"]);
		expect(parsed.hideAttendees).toBe(true);
		expect(parsed.warnings).toEqual([]);
	});

	it("parses literal date", () => {
		const parsed = parseGcalBlock("date: 2026-02-21");
		expect(parsed.dateMode).toBe("literal");
		expect(parsed.dateLiteral).toBe("2026-02-21");
	});

	it("adds warning for unsupported date format", () => {
		const parsed = parseGcalBlock("date: tomorrow");
		expect(parsed.dateMode).toBe("unset");
		expect(parsed.warnings).toEqual(["Unsupported date format: tomorrow"]);
	});
});
