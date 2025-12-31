import browser from "webextension-polyfill";
import type { AuthSession } from "@/types/messages";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BroadcastMessage =
	| { type: "FOLDERS_CHANGED" }
	| { type: "IMAGES_CHANGED" }
	| { type: "AUTH_SESSION_UPDATED"; payload: { session: AuthSession | null } };

export interface BroadcastOptions {
	excludeTabId?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Broadcast a message to all content scripts.
 */
export const broadcast = async (
	message: BroadcastMessage,
	options?: BroadcastOptions,
) => {
	const tabs = await browser.tabs.query({});

	for (const tab of tabs) {
		if (!tab.id) continue;
		if (options?.excludeTabId && tab.id === options.excludeTabId) continue;

		try {
			await browser.tabs.sendMessage(tab.id, message);
		} catch (error) {
			// Expected: tab has no content script
			if (
				error instanceof Error &&
				error.message.includes("receiving end does not exist")
			) {
				continue;
			}
			console.warn(`[Background] Failed to broadcast to tab ${tab.id}:`, error);
		}
	}
};
