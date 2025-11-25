import browser from "webextension-polyfill";
import { APP_MODE } from "@/lib/config";
import type { Folder, StoredFolder } from "@/types";
import { MessageType } from "@/types";

// Service interface
export interface FolderService {
	getFolders(): Promise<Folder[]>;
	createFolder(name: string, parentId: string | null): Promise<Folder>;
	updateFolder(
		id: string,
		updates: Partial<Pick<StoredFolder, "name" | "parentId">>,
	): Promise<Folder>;
	deleteFolder(id: string): Promise<void>;
}

// Helper: Convert flat StoredFolder[] to nested Folder[]
export const buildFolderTree = (flatFolders: StoredFolder[]): Folder[] => {
	const folderMap = new Map<string, Folder>();

	// Create Folder objects (without children first)
	for (const stored of flatFolders) {
		folderMap.set(stored.id, {
			id: stored.id,
			name: stored.name,
			folders: [],
		});
	}

	// Build tree structure
	const rootFolders: Folder[] = [];

	for (const stored of flatFolders) {
		const folder = folderMap.get(stored.id);
		if (!folder) continue;

		if (stored.parentId === null) {
			rootFolders.push(folder);
		} else {
			const parent = folderMap.get(stored.parentId);
			if (parent) {
				parent.folders.push(folder);
			} else {
				// Parent not found, treat as root
				rootFolders.push(folder);
			}
		}
	}

	// Sort folders alphabetically at each level
	const sortFolders = (folders: Folder[]): Folder[] => {
		folders.sort((a, b) => a.name.localeCompare(b.name));
		for (const folder of folders) {
			sortFolders(folder.folders);
		}
		return folders;
	};

	return sortFolders(rootFolders);
};

// Helper: Convert StoredFolder to Folder (leaf node)
const storedToFolder = (stored: StoredFolder): Folder => ({
	id: stored.id,
	name: stored.name,
	folders: [],
});

// Local (Message-based) implementation
class LocalFolderService implements FolderService {
	async getFolders(): Promise<Folder[]> {
		const response = (await browser.runtime.sendMessage({
			type: MessageType.GET_FOLDERS,
		})) as { success: boolean; folders: StoredFolder[] };

		if (!response.success) {
			throw new Error("Failed to get folders");
		}

		return buildFolderTree(response.folders);
	}

	async createFolder(name: string, parentId: string | null): Promise<Folder> {
		const response = (await browser.runtime.sendMessage({
			type: MessageType.CREATE_FOLDER,
			payload: { name, parentId },
		})) as { success: boolean; folder: StoredFolder };

		if (!response.success) {
			throw new Error("Failed to create folder");
		}

		return storedToFolder(response.folder);
	}

	async updateFolder(
		id: string,
		updates: Partial<Pick<StoredFolder, "name" | "parentId">>,
	): Promise<Folder> {
		const response = (await browser.runtime.sendMessage({
			type: MessageType.UPDATE_FOLDER,
			payload: { id, updates },
		})) as { success: boolean; folder: StoredFolder };

		if (!response.success) {
			throw new Error("Failed to update folder");
		}

		return storedToFolder(response.folder);
	}

	async deleteFolder(id: string): Promise<void> {
		const response = (await browser.runtime.sendMessage({
			type: MessageType.DELETE_FOLDER,
			payload: { id },
		})) as { success: boolean };

		if (!response.success) {
			throw new Error("Failed to delete folder");
		}
	}
}

// API (paid mode) implementation
class ApiFolderService implements FolderService {
	async getFolders(): Promise<Folder[]> {
		throw new Error(
			"API folder service not implemented. Authentication required.",
		);
	}

	async createFolder(_name: string, _parentId: string | null): Promise<Folder> {
		throw new Error(
			"API folder service not implemented. Authentication required.",
		);
	}

	async updateFolder(
		_id: string,
		_updates: Partial<Pick<StoredFolder, "name" | "parentId">>,
	): Promise<Folder> {
		throw new Error(
			"API folder service not implemented. Authentication required.",
		);
	}

	async deleteFolder(_id: string): Promise<void> {
		throw new Error(
			"API folder service not implemented. Authentication required.",
		);
	}
}

// Service factory
let folderServiceInstance: FolderService | null = null;

export const getFolderService = (): FolderService => {
	if (!folderServiceInstance) {
		folderServiceInstance =
			APP_MODE === "free" ? new LocalFolderService() : new ApiFolderService();
	}
	return folderServiceInstance;
};
