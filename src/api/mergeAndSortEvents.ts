import type { NormalizedEvent } from "./normalizeGoogleEvent";

export function mergeAndSortEvents(input: NormalizedEvent[][]): NormalizedEvent[] {
	const merged = input.flat();
	return merged.sort((a, b) => {
		if (a.startTs !== b.startTs) {
			return a.startTs - b.startTs;
		}
		return a.summary.localeCompare(b.summary);
	});
}
