import type browser from "webextension-polyfill";
import { broadcast } from "@/background/broadcast";
import { cacheSession } from "@/background/session";
import { INSPO_SNAPS_DOMAIN } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { AuthSession } from "@/types/messages";

// ─────────────────────────────────────────────────────────────────────────────
// Auth Update Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle auth session update from website.
 * Used by both Firefox (postMessage via content script) and Chrome (externally_connectable).
 */
export const handleAuthUpdate = async (session: AuthSession | null) => {
	await cacheSession(session);
	await broadcast({ type: "AUTH_SESSION_UPDATED", payload: { session } });
};

// ─────────────────────────────────────────────────────────────────────────────
// External Auth Messages (Chrome externally_connectable)
// ─────────────────────────────────────────────────────────────────────────────

interface ExternalAuthMessage {
	type: "INSPO_SNAPS_AUTH_UPDATE";
	payload: {
		session: AuthSession | null;
	};
}

const isValidExternalAuthMessage = (
	data: unknown,
): data is ExternalAuthMessage => {
	if (typeof data !== "object" || data === null) return false;
	const msg = data as Record<string, unknown>;
	return msg.type === "INSPO_SNAPS_AUTH_UPDATE" && "payload" in msg;
};

/**
 * Handle external messages from website (via externally_connectable).
 * Chrome only - Firefox doesn't support externally_connectable.
 */
export const handleExternalAuthMessage = async (
	message: unknown,
	sender: browser.Runtime.MessageSender,
): Promise<{ success: boolean }> => {
	// Validate origin
	const origin = sender.url ? new URL(sender.url).origin : null;
	if (origin !== INSPO_SNAPS_DOMAIN) {
		logger.warn("[Background] Rejected external message from:", origin);
		return { success: false };
	}

	// Validate message structure
	if (!isValidExternalAuthMessage(message)) {
		logger.warn("[Background] Invalid external auth message:", message);
		return { success: false };
	}

	await handleAuthUpdate(message.payload.session);
	return { success: true };
};
