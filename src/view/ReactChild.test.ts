import React from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	const renderMock = vi.fn();
	const unmountMock = vi.fn();
	const createRootMock = vi.fn(() => ({
		render: renderMock,
		unmount: unmountMock,
	}));
	return { renderMock, unmountMock, createRootMock };
});

vi.mock("react-dom/client", () => ({
	createRoot: mocks.createRootMock,
}));

import { ReactChild } from "./ReactChild";

describe("ReactChild", () => {
	it("creates root on load and unmounts on unload", () => {
		const container = document.createElement("div");
		const child = new ReactChild(container, () => React.createElement("div", null, "Hello"));

		child.onload();
		expect(mocks.createRootMock).toHaveBeenCalledWith(container);
		expect(mocks.renderMock).toHaveBeenCalledTimes(1);

		child.onunload();
		expect(mocks.unmountMock).toHaveBeenCalledTimes(1);
	});
});
