export class TFile {
	path: string;

	constructor(path: string) {
		this.path = path;
	}
}

export class App {
	metadataCache: {
		getFileCache: (file: TFile) => { frontmatter?: Record<string, unknown> } | null;
	};
	vault: {
		getAbstractFileByPath: (path: string) => TFile | null;
	};

	constructor() {
		this.metadataCache = {
			getFileCache: () => null,
		};
		this.vault = {
			getAbstractFileByPath: (path: string) => new TFile(path),
		};
	}
}

export class Notice {
	message: string;
	static notices: string[] = [];

	constructor(message: string) {
		this.message = message;
		Notice.notices.push(message);
	}
}

export class MarkdownRenderChild {
	containerEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}

	onload(): void {}
	onunload(): void {}
}

export interface MarkdownPostProcessorContext {
	sourcePath: string;
	addChild: (child: MarkdownRenderChild) => void;
}

export class Plugin {
	app: App;

	constructor(app = new App()) {
		this.app = app;
	}

	async loadData(): Promise<unknown> {
		return {};
	}

	async saveData(_data: unknown): Promise<void> {}
	addSettingTab(_tab: PluginSettingTab): void {}
	addCommand(_command: unknown): void {}
	registerObsidianProtocolHandler(_action: string, _handler: (params: Record<string, string>) => void): void {}
	registerMarkdownCodeBlockProcessor(
		_language: string,
		_processor: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void,
	): void {}
}

export class PluginSettingTab {
	app: App;
	plugin: Plugin;
	containerEl: HTMLElement;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement("div");
	}

	display(): void {}
}

export class Setting {
	constructor(_containerEl: HTMLElement) {}

	setName(_value: string): this {
		return this;
	}

	setDesc(_value: string): this {
		return this;
	}

	addText(cb: (component: {
		inputEl: HTMLInputElement;
		setPlaceholder: (value: string) => unknown;
		setValue: (value: string) => unknown;
		onChange: (handler: (value: string) => void | Promise<void>) => unknown;
	}) => void): this {
		const component = {
			inputEl: document.createElement("input"),
			setPlaceholder: () => component,
			setValue: () => component,
			onChange: () => component,
		};
		cb(component);
		return this;
	}

	addToggle(cb: (component: {
		setValue: (value: boolean) => unknown;
		onChange: (handler: (value: boolean) => void | Promise<void>) => unknown;
	}) => void): this {
		const component = {
			setValue: () => component,
			onChange: () => component,
		};
		cb(component);
		return this;
	}

	addButton(cb: (component: { setButtonText: (value: string) => unknown; onClick: (handler: () => void | Promise<void>) => unknown }) => void): this {
		const component = {
			setButtonText: () => component,
			onClick: () => component,
		};
		cb(component);
		return this;
	}
}
