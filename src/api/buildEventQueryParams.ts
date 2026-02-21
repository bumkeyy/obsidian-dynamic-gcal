export interface EventQueryWindow {
	timeMin: string;
	timeMax: string;
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function buildEventQueryWindow(targetDate: string): EventQueryWindow {
	if (!DATE_ONLY_REGEX.test(targetDate)) {
		throw new Error(`Invalid target date format: ${targetDate}`);
	}

	const start = new Date(`${targetDate}T00:00:00`);
	if (Number.isNaN(start.getTime())) {
		throw new Error(`Unable to parse target date: ${targetDate}`);
	}
	const end = new Date(start.getTime());
	end.setHours(23, 59, 59, 999);

	return {
		timeMin: start.toISOString(),
		timeMax: end.toISOString(),
	};
}

export function buildEventQueryParams(targetDate: string): URLSearchParams {
	const { timeMin, timeMax } = buildEventQueryWindow(targetDate);
	const query = new URLSearchParams();
	query.set("singleEvents", "true");
	query.set("orderBy", "startTime");
	query.set("timeMin", timeMin);
	query.set("timeMax", timeMax);
	return query;
}
