import { APP_MODE } from "@/lib/config";
import { sendMessage } from "@/lib/messaging";
import { buildFolderTree } from "@/lib/transforms";
import type { Folder, StoredFolder } from "@/types";

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

// Helper: Convert StoredFolder to Folder (leaf node)
const storedToFolder = (stored: StoredFolder): Folder => ({
	id: stored.id,
	name: stored.name,
	folders: [],
});

// Local (Message-based) implementation
class LocalFolderService implements FolderService {
	async getFolders(): Promise<Folder[]> {
		try {
			const { folders } = await sendMessage<{ folders: StoredFolder[] }>({
				type: "GET_FOLDERS",
			});

			return buildFolderTree(folders);
		} catch (error) {
			console.error("[FolderService] getFolders failed:", error);
			throw error;
		}
	}

	async createFolder(name: string, parentId: string | null): Promise<Folder> {
		try {
			const { folder } = await sendMessage<{ folder: StoredFolder }>({
				type: "CREATE_FOLDER",
				payload: { name, parentId },
			});

			return storedToFolder(folder);
		} catch (error) {
			console.error("[FolderService] createFolder failed:", error);
			throw error;
		}
	}

	async updateFolder(
		id: string,
		updates: Partial<Pick<StoredFolder, "name" | "parentId">>,
	): Promise<Folder> {
		try {
			const { folder } = await sendMessage<{ folder: StoredFolder }>({
				type: "UPDATE_FOLDER",
				payload: { id, updates },
			});

			return storedToFolder(folder);
		} catch (error) {
			console.error("[FolderService] updateFolder failed:", error);
			throw error;
		}
	}

	async deleteFolder(id: string): Promise<void> {
		try {
			await sendMessage<void>({
				type: "DELETE_FOLDER",
				payload: { id },
			});
		} catch (error) {
			console.error("[FolderService] deleteFolder failed:", error);
			throw error;
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
