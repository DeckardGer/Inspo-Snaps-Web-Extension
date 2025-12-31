import { getCurrentTier } from "@/background/session";
import * as storage from "@/background/storage";
import { INSPO_SNAPS_DOMAIN } from "@/lib/config";
import type { StoredImage } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Service Interface
// ─────────────────────────────────────────────────────────────────────────────

interface ImageServiceImpl {
	getByFolder(folderId: string | null): Promise<StoredImage[]>;
	getAll(): Promise<StoredImage[]>;
	save(image: Omit<StoredImage, "id" | "createdAt">): Promise<StoredImage>;
	saveMany(
		images: Array<Omit<StoredImage, "id" | "createdAt">>,
	): Promise<StoredImage[]>;
	delete(id: string): Promise<void>;
	moveToFolder(imageId: string, folderId: string | null): Promise<StoredImage>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Implementation (IndexedDB)
// ─────────────────────────────────────────────────────────────────────────────

const localImageService: ImageServiceImpl = {
	getByFolder: (folderId) => storage.getImagesByFolder(folderId),
	getAll: () => storage.getAllImages(),
	save: (image) => storage.saveImage(image),
	async saveMany(images) {
		const savedImages: StoredImage[] = [];
		for (const image of images) {
			const saved = await storage.saveImage(image);
			savedImages.push(saved);
		}
		return savedImages;
	},
	delete: (id) => storage.deleteImage(id),
	moveToFolder: (imageId, folderId) =>
		storage.moveImageToFolder(imageId, folderId),
};

// ─────────────────────────────────────────────────────────────────────────────
// API Implementation (Backend)
// ─────────────────────────────────────────────────────────────────────────────

const apiImageService: ImageServiceImpl = {
	async getByFolder(folderId) {
		const params = folderId ? `?folderId=${folderId}` : "";
		const response = await fetch(`${INSPO_SNAPS_DOMAIN}/api/images${params}`, {
			credentials: "include",
		});
		if (!response.ok) {
			throw new Error(`Failed to fetch images: ${response.status}`);
		}
		return response.json();
	},

	async getAll() {
		const response = await fetch(`${INSPO_SNAPS_DOMAIN}/api/images`, {
			credentials: "include",
		});
		if (!response.ok) {
			throw new Error(`Failed to fetch images: ${response.status}`);
		}
		return response.json();
	},

	async save(image) {
		const response = await fetch(`${INSPO_SNAPS_DOMAIN}/api/images`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(image),
		});
		if (!response.ok) {
			throw new Error(`Failed to save image: ${response.status}`);
		}
		return response.json();
	},

	async saveMany(images) {
		const response = await fetch(`${INSPO_SNAPS_DOMAIN}/api/images/batch`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ images }),
		});
		if (!response.ok) {
			throw new Error(`Failed to save images: ${response.status}`);
		}
		return response.json();
	},

	async delete(id) {
		const response = await fetch(`${INSPO_SNAPS_DOMAIN}/api/images/${id}`, {
			method: "DELETE",
			credentials: "include",
		});
		if (!response.ok) {
			throw new Error(`Failed to delete image: ${response.status}`);
		}
	},

	async moveToFolder(imageId, folderId) {
		const response = await fetch(
			`${INSPO_SNAPS_DOMAIN}/api/images/${imageId}/move`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ folderId }),
			},
		);
		if (!response.ok) {
			throw new Error(`Failed to move image: ${response.status}`);
		}
		return response.json();
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
const getImpl = async (): Promise<ImageServiceImpl> => {
	const tier = await getCurrentTier();
	return tier === "free" ? localImageService : apiImageService;
};

// ─────────────────────────────────────────────────────────────────────────────
// Exported Service (delegates to appropriate implementation)
// ─────────────────────────────────────────────────────────────────────────────

export const imageService: ImageServiceImpl = {
	getByFolder: async (folderId) => (await getImpl()).getByFolder(folderId),
	getAll: async () => (await getImpl()).getAll(),
	save: async (image) => (await getImpl()).save(image),
	saveMany: async (images) => (await getImpl()).saveMany(images),
	delete: async (id) => (await getImpl()).delete(id),
	moveToFolder: async (imageId, folderId) =>
		(await getImpl()).moveToFolder(imageId, folderId),
};
