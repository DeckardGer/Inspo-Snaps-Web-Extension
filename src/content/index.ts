// import React from "react";
// import ReactDOM from "react-dom/client";
// import type { ToolbarManager } from "./toolbar/ToolbarManager";
// import "./styles/content.css";
// import type { ImagePickerManager } from "./picker/ImagePickerManager";

import browser from "webextension-polyfill";
import { type Message, MessageType } from "@/types";
import { extensionName } from "@/utils/config";

class ContentScriptManager {
	private hostname: string;
	private enabled = false;
	// private toolbarManager: ToolbarManager;
	// private pickerManager: ImagePickerManager;
	private initialized = false;

	constructor() {
		this.hostname = window.location.hostname;
		// this.toolbarManager = new ToolbarManager(
		// 	this.handleToolbarAction.bind(this),
		// );
		// this.pickerManager = new ImagePickerManager(
		// 	this.handleImageClick.bind(this),
		// );

		this.initialize();
	}

	private async initialize() {
		// Prevent double initialization
		if (this.initialized) return;
		this.initialized = true;

		// Get initial state
		await this.fetchSiteState();

		// Setup message listener
		this.setupMessageListener();

		// // Apply initial state
		// this.applyState();
	}

	private async fetchSiteState() {
		try {
			const response: boolean | null = await browser.runtime.sendMessage({
				type: MessageType.GET_SITE_STATE,
				payload: { hostname: this.hostname },
			});

			this.enabled = response || false;
			console.log(
				`${extensionName} - Fetched initial site state:`,
				this.enabled,
			);
		} catch (error) {
			console.error(`${extensionName} - Failed to fetch site state:`, error);
		}
	}

	private setupMessageListener() {
		browser.runtime.onMessage.addListener((message: Message) => {
			if (message.type === MessageType.SITE_STATE_UPDATED) {
				this.enabled = message.payload as boolean;
				this.applyState();
			}
		});
	}

	private applyState() {
		if (this.enabled) {
			console.log("Enabled");
			// this.toolbarManager.show();
		} else {
			console.log("Disabled");
			// this.toolbarManager.hide();
			// this.pickerManager.deactivate();
		}
	}

	// private handleToolbarAction(action: string) {
	// 	switch (action) {
	// 		case "activate-picker":
	// 			this.pickerManager.activate();
	// 			break;
	// 		case "deactivate-picker":
	// 			this.pickerManager.deactivate();
	// 			break;
	// 	}
	// }

	// private async handleImageClick(imageInfo: {
	// 	url: string;
	// 	element: HTMLElement;
	// }) {
	// 	// Send download request to background
	// 	await browser.runtime.sendMessage({
	// 		type: MessageType.DOWNLOAD_IMAGE,
	// 		payload: {
	// 			url: imageInfo.url,
	// 			filename: this.extractFilename(imageInfo.url),
	// 		},
	// 	});

	// 	// Show success feedback
	// 	this.showDownloadFeedback(imageInfo.element);
	// }

	// private extractFilename(url: string): string {
	// 	try {
	// 		const urlObj = new URL(url, window.location.href);
	// 		const pathname = urlObj.pathname;
	// 		const filename = pathname.substring(pathname.lastIndexOf("/") + 1);
	// 		return filename || `image_${Date.now()}.jpg`;
	// 	} catch {
	// 		return `image_${Date.now()}.jpg`;
	// 	}
	// }

	// private showDownloadFeedback(element: HTMLElement) {
	// 	// Create feedback element
	// 	const feedback = document.createElement("div");
	// 	feedback.className = "image-download-feedback";
	// 	feedback.textContent = "✓ Downloaded";

	// 	// Position feedback
	// 	const rect = element.getBoundingClientRect();
	// 	feedback.style.cssText = `
	//     position: fixed;
	//     top: ${rect.top + rect.height / 2}px;
	//     left: ${rect.left + rect.width / 2}px;
	//     transform: translate(-50%, -50%);
	//     background: #10b981;
	//     color: white;
	//     padding: 8px 16px;
	//     border-radius: 6px;
	//     font-size: 14px;
	//     z-index: 2147483647;
	//     animation: fadeInOut 2s ease-out;
	//   `;

	// 	document.body.appendChild(feedback);

	// 	// Remove after animation
	// 	setTimeout(() => {
	// 		feedback.remove();
	// 	}, 2000);
	// }
}

// Initialize content script
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		new ContentScriptManager();
	});
} else {
	new ContentScriptManager();
}
