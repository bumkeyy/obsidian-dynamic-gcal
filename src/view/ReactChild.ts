import React from "react";
import { MarkdownRenderChild } from "obsidian";
import { createRoot, type Root } from "react-dom/client";

export class ReactChild extends MarkdownRenderChild {
	private root: Root | null = null;
	private renderView: () => React.ReactElement;

	constructor(containerEl: HTMLElement, renderView: () => React.ReactElement) {
		super(containerEl);
		this.renderView = renderView;
	}

	onload(): void {
		this.root = createRoot(this.containerEl);
		this.root.render(this.renderView());
	}

	update(renderView: () => React.ReactElement): void {
		this.renderView = renderView;
		if (this.root) {
			this.root.render(this.renderView());
		}
	}

	onunload(): void {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}
}
