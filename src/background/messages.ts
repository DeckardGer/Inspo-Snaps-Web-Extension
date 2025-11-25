import browser from "webextension-polyfill";
import * as storage from "@/background/storage";
import type { Message, StoredFolder, StoredImage } from "@/types";
import { MessageType } from "@/types";

/**
 * Handle messages from content scripts and route to appropriate storage operations
 */
export const handleMessage = async (
	message: Message,
	sender: browser.Runtime.MessageSender,
): Promise<unknown> => {
	const { type, payload } = message;

	switch (type) {
		// Folder operations
		case MessageType.GET_FOLDERS: {
			const folders = await storage.getAllFolders();
			return { success: true, folders };
		}

		case MessageType.CREATE_FOLDER: {
			const { name, parentId } = payload as {
				name: string;
				parentId: string | null;
			};
			const folder = await storage.createFolder(name, parentId);
			broadcastFoldersChanged(sender.tab?.id);
			return { success: true, folder };
		}

		case MessageType.UPDATE_FOLDER: {
			const { id, updates } = payload as {
				id: string;
				updates: Partial<Pick<StoredFolder, "name" | "parentId">>;
			};
			const folder = await storage.updateFolder(id, updates);
			broadcastFoldersChanged(sender.tab?.id);
			return { success: true, folder };
		}

		case MessageType.DELETE_FOLDER: {
			const { id } = payload as { id: string };
			await storage.deleteFolder(id);
			broadcastFoldersChanged(sender.tab?.id);
			return { success: true };
		}

		// Image operations
		case MessageType.GET_IMAGES: {
			const { folderId } = payload as { folderId: string | null };
			const images = await storage.getImagesByFolder(folderId);
			return { success: true, images };
		}

		case MessageType.SAVE_IMAGES: {
			const { images } = payload as {
				images: Array<Omit<StoredImage, "id" | "createdAt">>;
			};
			const savedImages: StoredImage[] = [];
			for (const image of images) {
				const saved = await storage.saveImage(image);
				savedImages.push(saved);
			}
			broadcastImagesChanged(sender.tab?.id);
			return { success: true, images: savedImages };
		}

		case MessageType.DELETE_IMAGE: {
			const { id } = payload as { id: string };
			await storage.deleteImage(id);
			broadcastImagesChanged(sender.tab?.id);
			return { success: true };
		}

		case MessageType.MOVE_IMAGE: {
			const { imageId, folderId } = payload as {
				imageId: string;
				folderId: string | null;
			};
			const image = await storage.moveImageToFolder(imageId, folderId);
			broadcastImagesChanged(sender.tab?.id);
			return { success: true, image };
		}

		default:
			return { success: false, error: "Unknown message type" };
	}
};

/**
 * Broadcast folders changed event to all content scripts (except sender)
 */
const broadcastFoldersChanged = async (senderTabId?: number) => {
	const tabs = await browser.tabs.query({});
	for (const tab of tabs) {
		// Skip the tab that sent the original message
		if (tab.id && tab.id !== senderTabId) {
			try {
				await browser.tabs.sendMessage(tab.id, {
					type: MessageType.FOLDERS_CHANGED,
				});
			} catch (_error) {
				// Tab might not have content script injected, ignore
			}
		}
	}
};

/**
 * Broadcast images changed event to all content scripts (except sender)
 */
const broadcastImagesChanged = async (senderTabId?: number) => {
	const tabs = await browser.tabs.query({});
	for (const tab of tabs) {
		// Skip the tab that sent the original message
		if (tab.id && tab.id !== senderTabId) {
			try {
				await browser.tabs.sendMessage(tab.id, {
					type: MessageType.IMAGES_CHANGED,
				});
			} catch (_error) {
				// Tab might not have content script injected, ignore
			}
		}
	}
};
