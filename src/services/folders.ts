import { sendMessage } from "@/lib/messaging";
import { buildFolderTree } from "@/lib/transforms";
import { useOrganizationsStore } from "@/store/organizationsStore";
import type { Folder, StoredFolder } from "@/types";

const getOrgId = () => useOrganizationsStore.getState().activeOrganizationId;

/**
 * Folder service - thin messaging layer for content scripts.
 * All business logic (local vs API) is handled in background.
 */
export const folderService = {
	async getFolders(): Promise<Folder[]> {
		const { folders } = await sendMessage<{ folders: StoredFolder[] }>({
			type: "GET_FOLDERS",
			payload: { organizationId: getOrgId() },
		});
		return buildFolderTree(folders);
	},

	async createFolder(name: string, parentId: string | null): Promise<Folder> {
		const { folder } = await sendMessage<{ folder: StoredFolder }>({
			type: "CREATE_FOLDER",
			payload: { name, parentId, organizationId: getOrgId() },
		});
		return { id: folder.id, name: folder.name, folders: [] };
	},

	async updateFolder(
		id: string,
		updates: Partial<Pick<StoredFolder, "name" | "parentId">>,
	): Promise<Folder> {
		const { folder } = await sendMessage<{ folder: StoredFolder }>({
			type: "UPDATE_FOLDER",
			payload: { id, updates, organizationId: getOrgId() },
		});
		return { id: folder.id, name: folder.name, folders: [] };
	},

	async deleteFolder(id: string): Promise<void> {
		await sendMessage<void>({
			type: "DELETE_FOLDER",
			payload: { id, organizationId: getOrgId() },
		});
	},
};
