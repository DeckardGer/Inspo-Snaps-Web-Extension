import { getCurrentTier } from "@/background/session";
import * as storage from "@/background/storage";
import { INSPO_SNAPS_DOMAIN } from "@/lib/config";
import type { StoredFolder } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Service Interface
// ─────────────────────────────────────────────────────────────────────────────

interface FolderServiceImpl {
	getAll(): Promise<StoredFolder[]>;
	create(name: string, parentId: string | null): Promise<StoredFolder>;
	update(
		id: string,
		updates: Partial<Pick<StoredFolder, "name" | "parentId">>,
	): Promise<StoredFolder>;
	delete(id: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Implementation (IndexedDB)
// ─────────────────────────────────────────────────────────────────────────────

const localFolderService: FolderServiceImpl = {
	getAll: () => storage.getAllFolders(),
	create: (name, parentId) => storage.createFolder(name, parentId),
	update: (id, updates) => storage.updateFolder(id, updates),
	delete: (id) => storage.deleteFolder(id),
};

// ─────────────────────────────────────────────────────────────────────────────
// API Implementation (Backend)
// ─────────────────────────────────────────────────────────────────────────────

const apiFolderService: FolderServiceImpl = {
	async getAll() {
		const response = await fetch(
			`${INSPO_SNAPS_DOMAIN}/api/extension/folders`,
			{
				credentials: "include",
			},
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch folders: ${response.status}`);
		}

		const data = await response.json();
		return data.folders;
	},

	async create(name, parentId) {
		const response = await fetch(
			`${INSPO_SNAPS_DOMAIN}/api/extension/folders`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ name, parentId }),
			},
		);
		if (!response.ok) {
			throw new Error(`Failed to create folder: ${response.status}`);
		}

		const data = await response.json();
		return data.folder;
	},

	// TODO: Add support for moving folders into other folders
	async update(id, updates) {
		const response = await fetch(
			`${INSPO_SNAPS_DOMAIN}/api/extension/folders?id=${id}`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify(updates),
			},
		);
		if (!response.ok) {
			throw new Error(`Failed to update folder: ${response.status}`);
		}

		const data = await response.json();
		return data.folder;
	},

	async delete(id) {
		const response = await fetch(
			`${INSPO_SNAPS_DOMAIN}/api/extension/folders?id=${id}`,
			{
				method: "DELETE",
				credentials: "include",
			},
		);
		if (!response.ok) {
			throw new Error(`Failed to delete folder: ${response.status}`);
		}
	},
};

// ─────────────────────────────────────────────────────────────────────────────
// Implementation Selector
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the appropriate service implementation based on user's subscription tier.
 * - "free" → local IndexedDB storage
 * - "pro" or "team" → backend API
 */
const getImpl = async (): Promise<FolderServiceImpl> => {
	const tier = await getCurrentTier();
	return apiFolderService;
	// return tier === "free" ? localFolderService : apiFolderService;
};

// ─────────────────────────────────────────────────────────────────────────────
// Exported Service (delegates to appropriate implementation)
// ─────────────────────────────────────────────────────────────────────────────

export const folderService: FolderServiceImpl = {
	getAll: async () => (await getImpl()).getAll(),
	create: async (name, parentId) => (await getImpl()).create(name, parentId),
	update: async (id, updates) => (await getImpl()).update(id, updates),
	delete: async (id) => (await getImpl()).delete(id),
};
