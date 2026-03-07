import type browser from "webextension-polyfill";
import { handleAuthUpdate } from "@/background/auth";
import { broadcast } from "@/background/broadcast";
import { folderService } from "@/background/services/folders";
import { imageService } from "@/background/services/images";
import { organizationService } from "@/background/services/organizations";
import {
	fetchAndCacheSession,
	getCachedSession,
	needsRefresh,
} from "@/background/session";
import type { Message, ServiceResponse } from "@/types/messages";

// Re-export for use in background/index.ts
export { handleExternalAuthMessage } from "@/background/auth";

/**
 * Handle messages from content scripts and route to appropriate operations.
 */
export const handleMessage = async (
	message: Message,
	sender: browser.Runtime.MessageSender,
): Promise<ServiceResponse<unknown>> => {
	try {
		const { type } = message;

		switch (type) {
			// ─────────────────────────────────────────────────────────────────────
			// Folder Operations
			// ─────────────────────────────────────────────────────────────────────

			case "GET_FOLDERS": {
				const organizationId = message.payload?.organizationId;
				const folders = await folderService.getAll(organizationId);
				return { success: true, data: { folders } };
			}

			case "CREATE_FOLDER": {
				const { name, parentId, organizationId } = message.payload;
				const folder = await folderService.create(
					name,
					parentId,
					organizationId,
				);
				await broadcast(
					{ type: "FOLDERS_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: { folder } };
			}

			case "UPDATE_FOLDER": {
				const { id, updates, organizationId } = message.payload;
				const folder = await folderService.update(id, updates, organizationId);
				await broadcast(
					{ type: "FOLDERS_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: { folder } };
			}

			case "DELETE_FOLDER": {
				const { id, organizationId } = message.payload;
				await folderService.delete(id, organizationId);
				await broadcast(
					{ type: "FOLDERS_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: undefined };
			}

			// ─────────────────────────────────────────────────────────────────────
			// Image Operations
			// ─────────────────────────────────────────────────────────────────────

			case "GET_IMAGES": {
				const { folderId, organizationId } = message.payload;
				const images = await imageService.getByFolder(folderId, organizationId);
				return { success: true, data: { images } };
			}

			case "SAVE_IMAGES": {
				const { images, organizationId } = message.payload;
				const savedImages = await imageService.saveMany(images, organizationId);
				await broadcast(
					{ type: "IMAGES_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: { images: savedImages } };
			}

			case "DELETE_IMAGE": {
				const { id, organizationId } = message.payload;
				await imageService.delete(id, organizationId);
				await broadcast(
					{ type: "IMAGES_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: undefined };
			}

			case "MOVE_IMAGE": {
				const { imageId, folderId, organizationId } = message.payload;
				const image = await imageService.moveToFolder(
					imageId,
					folderId,
					organizationId,
				);
				await broadcast(
					{ type: "IMAGES_CHANGED" },
					{ excludeTabId: sender.tab?.id },
				);
				return { success: true, data: { image } };
			}

			// ─────────────────────────────────────────────────────────────────────
			// Organization Operations
			// ─────────────────────────────────────────────────────────────────────

			case "GET_ORGANIZATIONS": {
				const result = await organizationService.getAll();
				return { success: true, data: result };
			}

			// ─────────────────────────────────────────────────────────────────────
			// Auth Operations
			// ─────────────────────────────────────────────────────────────────────

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

			case "AUTH_BRIDGE_UPDATE": {
				const { session } = message.payload;
				await handleAuthUpdate(session);
				return { success: true, data: undefined };
			}

			// ─────────────────────────────────────────────────────────────────────
			// Broadcast Events (handled elsewhere, no-op here)
			// ─────────────────────────────────────────────────────────────────────

			case "FOLDERS_CHANGED":
			case "IMAGES_CHANGED":
			case "SITE_STATE_UPDATED":
			case "SAVE_IMAGE":
			case "AUTH_SESSION_UPDATED":
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
