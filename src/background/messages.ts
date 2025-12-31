import browser from "webextension-polyfill";
import { authClient } from "@/auth/auth-client";
import * as storage from "@/background/storage";
import { INSPO_SNAPS_DOMAIN } from "@/lib/config";
import type { AuthSession, Message, ServiceResponse } from "@/types/messages";

// ─────────────────────────────────────────────────────────────────────────────
// Session Cache
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_CACHE_KEY = "authSession";

// How long after updatedAt before the session should be refreshed (matches Better Auth updateAge)
// const SESSION_UPDATE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
const SESSION_UPDATE_AGE_MS = 15 * 1000; // 1 week in milliseconds

interface CachedSession {
	session: AuthSession | null;
	cachedAt: number;
}

/**
 * Check if a session is expired (past expiresAt)
 */
const isSessionExpired = (session: AuthSession | null): boolean => {
	if (!session) return true;
	const expiresAt = new Date(session.session.expiresAt).getTime();
	return Date.now() >= expiresAt;
};

/**
 * Check if a session needs refresh (past updatedAt + updateAge)
 */
const needsRefresh = (session: AuthSession | null): boolean => {
	if (!session?.session.updatedAt) return false;
	const updatedAt = new Date(session.session.updatedAt).getTime();
	const refreshAt = updatedAt + SESSION_UPDATE_AGE_MS;
	return Date.now() >= refreshAt;
};

/**
 * Get cached session from storage (returns null if expired)
 */
const getCachedSession = async (): Promise<CachedSession | null> => {
	const result = await browser.storage.session.get(SESSION_CACHE_KEY);
	const cached = result[SESSION_CACHE_KEY] as CachedSession | undefined;

	if (!cached) return null;

	// Return null if session is fully expired
	if (isSessionExpired(cached.session)) {
		await clearCachedSession();
		return null;
	}

	return cached;
};

/**
 * Cache session to storage
 */
const cacheSession = async (session: AuthSession | null): Promise<void> => {
	const cached: CachedSession = {
		session,
		cachedAt: Date.now(),
	};
	await browser.storage.session.set({ [SESSION_CACHE_KEY]: cached });
};

/**
 * Clear cached session from storage
 */
const clearCachedSession = async (): Promise<void> => {
	await browser.storage.session.remove(SESSION_CACHE_KEY);
};

/**
 * Convert Better Auth session response to our AuthSession type
 */
const toAuthSession = (data: {
	user: { id: string; name: string; email: string; image?: string | null };
	session: { id: string; expiresAt: Date; updatedAt: Date };
}): AuthSession => ({
	user: {
		id: data.user.id,
		name: data.user.name,
		email: data.user.email,
		image: data.user.image,
	},
	session: {
		id: data.session.id,
		expiresAt: data.session.expiresAt.toISOString(),
		updatedAt: data.session.updatedAt.toISOString(),
	},
});

/**
 * Fetch fresh session from server, cache it, and return
 */
const fetchAndCacheSession = async (): Promise<{
	session: AuthSession | null;
	error?: { message: string };
}> => {
	const { data, error } = await authClient.getSession();

	if (error) {
		await clearCachedSession();
		return {
			session: null,
			error: { message: error.message || "Failed to get session" },
		};
	}

	if (!data) {
		await clearCachedSession();
		return { session: null };
	}

	const session = toAuthSession(data);
	await cacheSession(session);
	return { session };
};

/**
 * Handle messages from content scripts and route to appropriate storage operations
 */
export const handleMessage = async (
	message: Message,
	sender: browser.Runtime.MessageSender,
): Promise<ServiceResponse<unknown>> => {
	try {
		const { type } = message;

		switch (type) {
			// Folder operations
			case "GET_FOLDERS": {
				const folders = await storage.getAllFolders();
				return { success: true, data: { folders } };
			}

			case "CREATE_FOLDER": {
				const { name, parentId } = message.payload;
				const folder = await storage.createFolder(name, parentId);
				await broadcast(
					{ type: "FOLDERS_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: { folder } };
			}

			case "UPDATE_FOLDER": {
				const { id, updates } = message.payload;
				const folder = await storage.updateFolder(id, updates);
				await broadcast(
					{ type: "FOLDERS_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: { folder } };
			}

			case "DELETE_FOLDER": {
				const { id } = message.payload;
				await storage.deleteFolder(id);
				await broadcast(
					{ type: "FOLDERS_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: undefined };
			}

			// Image operations
			case "GET_IMAGES": {
				const { folderId } = message.payload;
				const images = await storage.getImagesByFolder(folderId);
				return { success: true, data: { images } };
			}

			case "SAVE_IMAGES": {
				const { images } = message.payload;
				const savedImages = [];
				for (const image of images) {
					const saved = await storage.saveImage(image);
					savedImages.push(saved);
				}
				await broadcast(
					{ type: "IMAGES_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: { images: savedImages } };
			}

			case "DELETE_IMAGE": {
				const { id } = message.payload;
				await storage.deleteImage(id);
				await broadcast(
					{ type: "IMAGES_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: undefined };
			}

			case "MOVE_IMAGE": {
				const { imageId, folderId } = message.payload;
				const image = await storage.moveImageToFolder(imageId, folderId);
				await broadcast(
					{ type: "IMAGES_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: { image } };
			}

			// Auth operations (proxied through background to avoid CORS in content scripts)
			case "AUTH_GET_SESSION": {
				const forceRefresh = message.payload?.forceRefresh ?? false;

				// Check cache first (unless force refresh)
				if (!forceRefresh) {
					const cached = await getCachedSession();
					// Use cache only if it exists and doesn't need refresh
					if (cached && !needsRefresh(cached.session)) {
						return {
							success: true,
							data: { session: cached.session },
						};
					}
				}

				// Fetch from server if not cached, needs refresh, or force refresh
				const result = await fetchAndCacheSession();
				if (result.error) {
					return {
						success: false,
						error: {
							message: result.error.message,
							code: "AUTH_ERROR",
						},
					};
				}

				return {
					success: true,
					data: { session: result.session },
				};
			}

			case "AUTH_CLEAR_SESSION": {
				await clearCachedSession();
				return { success: true, data: undefined };
			}

			// Manual refresh triggered by user
			case "AUTH_REFRESH_SESSION": {
				const result = await fetchAndCacheSession();

				if (result.error) {
					await broadcast({
						type: "AUTH_SESSION_UPDATED",
						payload: { session: null },
					});
					return {
						success: false,
						error: {
							message: result.error.message,
							code: "AUTH_ERROR",
						},
					};
				}

				await broadcast({
					type: "AUTH_SESSION_UPDATED",
					payload: { session: result.session },
				});

				return { success: true, data: { session: result.session } };
			}

			// Auth bridge update (Firefox postMessage fallback via content script)
			case "AUTH_BRIDGE_UPDATE": {
				const { session } = message.payload;
				await handleAuthUpdate(session);
				return { success: true, data: undefined };
			}

			// API proxy (all API requests go through background to avoid CORS)
			case "API_REQUEST": {
				const { endpoint, method = "GET", body } = message.payload;

				try {
					const response = await fetch(`${INSPO_SNAPS_DOMAIN}${endpoint}`, {
						method,
						headers: {
							"Content-Type": "application/json",
						},
						credentials: "include", // Include cookies for auth
						body: body ? JSON.stringify(body) : undefined,
					});

					// Try to parse JSON, fall back to text
					let data: unknown;
					const contentType = response.headers.get("content-type");
					if (contentType?.includes("application/json")) {
						data = await response.json();
					} else {
						data = await response.text();
					}

					// Return error for non-2xx responses
					if (!response.ok) {
						return {
							success: false,
							error: {
								message:
									typeof data === "object" && data !== null && "message" in data
										? String((data as { message: string }).message)
										: `Request failed with status ${response.status}`,
								code: `HTTP_${response.status}`,
							},
						};
					}

					return {
						success: true,
						data: { data, status: response.status },
					};
				} catch (error) {
					return {
						success: false,
						error: {
							message: error instanceof Error ? error.message : "Network error",
							code: "NETWORK_ERROR",
						},
					};
				}
			}

			// Broadcast events (no response needed from content scripts)
			case "FOLDERS_CHANGED":
			case "IMAGES_CHANGED":
			case "SITE_STATE_UPDATED":
			case "SAVE_IMAGE":
			case "AUTH_SESSION_UPDATED":
				// These are handled elsewhere or don't need storage operations
				return { success: true, data: undefined };

			default: {
				return {
					success: false,
					error: {
						message: "Unknown message type",
						code: "UNKNOWN_MESSAGE",
					},
				};
			}
		}
	} catch (error) {
		console.error("[Background] Message handler error:", error);
		return {
			success: false,
			error: {
				message: error instanceof Error ? error.message : "Unknown error",
				code: "HANDLER_ERROR",
				cause: error instanceof Error ? error : undefined,
			},
		};
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast
// ─────────────────────────────────────────────────────────────────────────────

type BroadcastMessage =
	| { type: "FOLDERS_CHANGED" }
	| { type: "IMAGES_CHANGED" }
	| { type: "AUTH_SESSION_UPDATED"; payload: { session: AuthSession | null } };

interface BroadcastOptions {
	excludeTabId?: number;
}

/**
 * Broadcast a message to all content scripts.
 */
const broadcast = async (
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

/**
 * Handle auth session update from website.
 * Used by both Firefox (postMessage via content script) and Chrome (externally_connectable).
 */
const handleAuthUpdate = async (session: AuthSession | null) => {
	await cacheSession(session);
	await broadcast({ type: "AUTH_SESSION_UPDATED", payload: { session } });
};

// Expected message format from website
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
		console.warn("[Background] Rejected external message from:", origin);
		return { success: false };
	}

	// Validate message structure
	if (!isValidExternalAuthMessage(message)) {
		console.warn("[Background] Invalid external auth message:", message);
		return { success: false };
	}

	await handleAuthUpdate(message.payload.session);
	return { success: true };
};
