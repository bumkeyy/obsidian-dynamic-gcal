import { App, PluginSettingTab, Setting } from "obsidian";

import { parseCalendarSelectors } from "./core/parseCalendarSelectors";
import type DynamicGoogleCalendarPlugin from "./main";

export class DynamicGcalSettingTab extends PluginSettingTab {
	plugin: DynamicGoogleCalendarPlugin;

	constructor(app: App, plugin: DynamicGoogleCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Google OAuth client ID")
			.setDesc("Enter your Google OAuth 2.0 client ID for this plugin.")
			.addText((text) =>
				text
					.setPlaceholder("1234567890-abc.apps.googleusercontent.com")
					.setValue(this.plugin.settings.googleClientId)
					.onChange(async (value) => {
						this.plugin.settings.googleClientId = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Security warning")
			.setDesc(
				"OAuth tokens are stored in plain text using plugin data (saveData). Anyone with access to this vault or device can read them.",
			);

		new Setting(containerEl)
			.setName("Default calendars")
			.setDesc("Used when a gcal code block does not define a calendar list.")
			.addText((text) =>
				text
					.setPlaceholder("personal, work")
					.setValue(this.plugin.settings.defaultCalendarIds.join(", "))
					.onChange(async (value) => {
						this.plugin.settings.defaultCalendarIds = parseCalendarSelectors(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Hide attendees by default")
			.setDesc("Applied when a gcal code block does not include the hide attendees directive.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.defaultHideAttendees).onChange(async (value) => {
					this.plugin.settings.defaultHideAttendees = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Google account")
			.setDesc(this.plugin.settings.authState.message)
			.addButton((button) =>
				button.setButtonText("Login to Google").onClick(async () => {
					await this.plugin.startLoginFlow();
					this.display();
				}),
			)
			.addButton((button) =>
				button.setButtonText("Logout").onClick(async () => {
					await this.plugin.logout();
					this.display();
				}),
			);
	}
}
