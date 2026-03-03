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

// ─────────────────────────────────────────────────────────────────────────────
// Exported Service (always uses backend API)
// ─────────────────────────────────────────────────────────────────────────────

export const folderService: FolderServiceImpl = {
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
