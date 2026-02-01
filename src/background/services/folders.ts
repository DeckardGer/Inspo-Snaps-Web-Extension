import { getCurrentTier } from "@/background/session";
import * as storage from "@/background/storage";
import { INSPO_SNAPS_DOMAIN } from "@/lib/config";
import type { StoredFolder } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Service Interface
// ─────────────────────────────────────────────────────────────────────────────

interface FolderServiceImpl {
	getAll(organizationId?: string | null): Promise<StoredFolder[]>;
	create(
		name: string,
		parentId: string | null,
		organizationId?: string | null,
	): Promise<StoredFolder>;
	update(
		id: string,
		updates: Partial<Pick<StoredFolder, "name" | "parentId">>,
		organizationId?: string | null,
	): Promise<StoredFolder>;
	delete(id: string, organizationId?: string | null): Promise<void>;
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

const buildUrl = (
	path: string,
	params: Record<string, string | null | undefined>,
) => {
	const url = new URL(`${INSPO_SNAPS_DOMAIN}${path}`);
	for (const [key, value] of Object.entries(params)) {
		if (value) url.searchParams.set(key, value);
	}
	return url.toString();
};

const apiFolderService: FolderServiceImpl = {
	async getAll(organizationId) {
		const response = await fetch(
			buildUrl("/api/extension/folders", { organizationId }),
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

	async create(name, parentId, organizationId) {
		const response = await fetch(
			buildUrl("/api/extension/folders", { organizationId }),
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

	async update(id, updates, organizationId) {
		const response = await fetch(
			buildUrl("/api/extension/folders", { id, organizationId }),
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

	async delete(id, organizationId) {
		const response = await fetch(
			buildUrl("/api/extension/folders", { id, organizationId }),
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
	getAll: async (organizationId) => (await getImpl()).getAll(organizationId),
	create: async (name, parentId, organizationId) =>
		(await getImpl()).create(name, parentId, organizationId),
	update: async (id, updates, organizationId) =>
		(await getImpl()).update(id, updates, organizationId),
	delete: async (id, organizationId) =>
		(await getImpl()).delete(id, organizationId),
};
