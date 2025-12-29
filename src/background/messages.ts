import browser from "webextension-polyfill";
import { authClient } from "@/auth/auth-client";
import * as storage from "@/background/storage";
import { MessageType } from "@/types";
import type { AuthSession, Message, ServiceResponse } from "@/types/messages";

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
				await broadcastFoldersChanged(sender.tab?.id);
				return { success: true, data: { folder } };
			}

			case "UPDATE_FOLDER": {
				const { id, updates } = message.payload;
				const folder = await storage.updateFolder(id, updates);
				await broadcastFoldersChanged(sender.tab?.id);
				return { success: true, data: { folder } };
			}

			case "DELETE_FOLDER": {
				const { id } = message.payload;
				await storage.deleteFolder(id);
				await broadcastFoldersChanged(sender.tab?.id);
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
				await broadcastImagesChanged(sender.tab?.id);
				return { success: true, data: { images: savedImages } };
			}

			case "DELETE_IMAGE": {
				const { id } = message.payload;
				await storage.deleteImage(id);
				await broadcastImagesChanged(sender.tab?.id);
				return { success: true, data: undefined };
			}

			case "MOVE_IMAGE": {
				const { imageId, folderId } = message.payload;
				const image = await storage.moveImageToFolder(imageId, folderId);
				await broadcastImagesChanged(sender.tab?.id);
				return { success: true, data: { image } };
			}

			// Auth operations (proxied through background to avoid CORS in content scripts)
			case "AUTH_GET_SESSION": {
				const { data, error } = await authClient.getSession();
				if (error) {
					return {
						success: false,
						error: {
							message: error.message || "Failed to get session",
							code: "AUTH_ERROR",
						},
					};
				}
				return {
					success: true,
					data: { session: data as AuthSession | null },
				};
			}

			// API proxy (all API requests go through background to avoid CORS)
			case "API_REQUEST": {
				const { endpoint, method = "GET", body } = message.payload;
				const baseUrl = "http://localhost:3000";

				try {
					const response = await fetch(`${baseUrl}${endpoint}`, {
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
				// These are handled elsewhere or don't need storage operations
				return { success: true, data: undefined };

			default: {
				// TypeScript ensures exhaustiveness
				const _exhaustive: never = type;
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

/**
 * Broadcast folders changed event to all content scripts (except sender)
 */
const broadcastFoldersChanged = async (senderTabId?: number) => {
	const tabs = await browser.tabs.query({});
	const errors: Array<{ tabId: number; error: unknown }> = [];

	for (const tab of tabs) {
		// Skip the tab that sent the original message
		if (tab.id && tab.id !== senderTabId) {
			try {
				await browser.tabs.sendMessage(tab.id, {
					type: MessageType.FOLDERS_CHANGED,
				});
			} catch (error) {
				// Distinguish expected vs unexpected errors
				if (
					error instanceof Error &&
					error.message.includes("receiving end does not exist")
				) {
					// Expected: tab has no content script
					continue;
				}

				// Unexpected error - log it
				console.warn(
					`[Background] Failed to broadcast to tab ${tab.id}:`,
					error,
				);
				errors.push({ tabId: tab.id, error });
			}
		}
	}

	if (errors.length > 0) {
		console.error("[Background] Broadcast errors:", errors);
	}
};

/**
 * Broadcast images changed event to all content scripts (except sender)
 */
const broadcastImagesChanged = async (senderTabId?: number) => {
	const tabs = await browser.tabs.query({});
	const errors: Array<{ tabId: number; error: unknown }> = [];

	for (const tab of tabs) {
		// Skip the tab that sent the original message
		if (tab.id && tab.id !== senderTabId) {
			try {
				await browser.tabs.sendMessage(tab.id, {
					type: MessageType.IMAGES_CHANGED,
				});
			} catch (error) {
				// Distinguish expected vs unexpected errors
				if (
					error instanceof Error &&
					error.message.includes("receiving end does not exist")
				) {
					// Expected: tab has no content script
					continue;
				}

				// Unexpected error - log it
				console.warn(
					`[Background] Failed to broadcast to tab ${tab.id}:`,
					error,
				);
				errors.push({ tabId: tab.id, error });
			}
		}
	}

	if (errors.length > 0) {
		console.error("[Background] Broadcast errors:", errors);
	}
};
