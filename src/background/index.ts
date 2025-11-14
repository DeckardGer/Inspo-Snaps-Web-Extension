import browser from "webextension-polyfill";
import { type ExtensionState, type Message, MessageType } from "@/types";

class BackgroundService {
	private state: ExtensionState = {
		sites: {},
	};

	constructor() {
		this.initialize();
	}

	private async initialize() {
		// Load saved state
		await this.loadState();

		// Setup listeners
		this.setupListeners();

		// Setup context menus
		this.setupContextMenus();
	}

	private async loadState() {
		const stored = await browser.storage.local.get("extensionState");

		if (stored.extensionState) {
			this.state = stored.extensionState as ExtensionState;
		}
	}

	private async saveState() {
		await browser.storage.local.set({ extensionState: this.state });
	}

	private setupListeners() {
		// Extension click listener
		browser.action.onClicked.addListener(this.handleExtensionClick.bind(this));

		// Message listener for communication with content scripts
		browser.runtime.onMessage.addListener(this.handleMessage.bind(this));

		// Tab update listener to inject/remove toolbar
		browser.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
	}

	private handleExtensionClick(tab: browser.Tabs.Tab) {
		// Toggles the extension state for a given site
		if (!tab.url) return;

		const hostname = new URL(tab.url).hostname;

		if (this.state.sites[hostname]) {
			delete this.state.sites[hostname];
		} else {
			this.state.sites[hostname] = true;
		}

		this.saveState();

		if (!tab?.id) return;

		browser.tabs.sendMessage(tab.id, {
			type: MessageType.SITE_STATE_UPDATED,
			payload: this.state.sites[hostname],
		});
	}

	private async handleMessage(message: unknown): Promise<unknown> {
		const msg = message as Message;

		switch (msg.type) {
			case MessageType.GET_SITE_STATE:
				return this.getSiteState(
					(msg.payload as { hostname: string }).hostname,
				);

			// TODO
			// case MessageType.DOWNLOAD_IMAGE:
			// 	return this.downloadImage(
			// 		msg.payload as { url: string; filename?: string },
			// 	);

			default:
				return null;
		}
	}

	private getSiteState(hostname: string): boolean | null {
		return this.state.sites[hostname] || null;
	}

	private async handleTabUpdate(
		tabId: number,
		changeInfo: browser.Tabs.OnUpdatedChangeInfoType,
		tab: browser.Tabs.Tab,
	) {
		if (changeInfo.status === "complete" && tab.url) {
			const hostname = new URL(tab.url).hostname;
			const siteState = this.getSiteState(hostname);

			if (siteState) {
				// Inject toolbar if enabled for this site
				browser.tabs.sendMessage(tabId, {
					type: MessageType.SITE_STATE_UPDATED,
					payload: siteState,
				});
			}
		}
	}

	private setupContextMenus() {
		browser.contextMenus.create({
			id: "save-image",
			title: "Save Image",
			contexts: ["image"],
		});
		browser.contextMenus.onClicked.addListener((info) => {
			if (info.menuItemId === "save-image" && info.srcUrl) {
				// this.downloadImage({ url: info.srcUrl });
			}
		});
	}

	// private async downloadImage(imageInfo: { url: string; filename?: string }) {
	// 	const filename = imageInfo.filename || this.generateFilename(imageInfo.url);

	// 	await browser.downloads.download({
	// 		url: imageInfo.url,
	// 		filename: filename,
	// 		saveAs: false,
	// 	});
	// }

	// private generateFilename(url: string): string {
	// 	const urlObj = new URL(url);
	// 	const pathname = urlObj.pathname;
	// 	const filename = pathname.substring(pathname.lastIndexOf("/") + 1);

	// 	if (filename && filename.includes(".")) {
	// 		return filename;
	// 	}

	// 	// Generate timestamp-based filename
	// 	const timestamp = Date.now();
	// 	return `image_${timestamp}.jpg`;
	// }
}

// Initialize background service
new BackgroundService();
