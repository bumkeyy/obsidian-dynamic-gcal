import { describe, expect, it } from "vitest";

import { buildEventQueryParams, buildEventQueryWindow } from "./buildEventQueryParams";

describe("buildEventQueryParams", () => {
	it("builds google event query params", () => {
		const params = buildEventQueryParams("2026-02-21");
		expect(params.get("singleEvents")).toBe("true");
		expect(params.get("orderBy")).toBe("startTime");
		const timeMin = params.get("timeMin");
		const timeMax = params.get("timeMax");
		expect(timeMin).toBeTruthy();
		expect(timeMax).toBeTruthy();
		expect(new Date(timeMax as string).getTime()).toBeGreaterThan(new Date(timeMin as string).getTime());
	});

	it("throws on invalid date", () => {
		expect(() => buildEventQueryWindow("2026/02/21")).toThrow("Invalid target date format");
	});
});
