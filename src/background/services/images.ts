import { getCurrentTier } from "@/background/session";
import * as storage from "@/background/storage";
import { INSPO_SNAPS_DOMAIN } from "@/lib/config";
import type { StoredImage } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Service Interface
// ─────────────────────────────────────────────────────────────────────────────

interface ImageServiceImpl {
	getByFolder(
		folderId: string | null,
		organizationId?: string | null,
	): Promise<StoredImage[]>;
	getAll(organizationId?: string | null): Promise<StoredImage[]>;
	save(
		image: Omit<StoredImage, "id" | "createdAt">,
		organizationId?: string | null,
	): Promise<StoredImage>;
	saveMany(
		images: Array<Omit<StoredImage, "id" | "createdAt">>,
		organizationId?: string | null,
	): Promise<StoredImage[]>;
	delete(id: string, organizationId?: string | null): Promise<void>;
	moveToFolder(
		imageId: string,
		folderId: string,
		organizationId?: string | null,
	): Promise<StoredImage>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Local Implementation (IndexedDB)
// ─────────────────────────────────────────────────────────────────────────────

const localImageService: ImageServiceImpl = {
	getByFolder: (folderId) => storage.getImagesByFolder(folderId),
	getAll: () => storage.getAllImages(),
	save: (image) => storage.saveImage(image),
	async saveMany(images) {
		if (images.some((img) => !img.folderId)) {
			throw new Error("Cannot save images without a folder");
		}
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

const apiImageService: ImageServiceImpl = {
	async getByFolder() {
		throw new Error("API route not implemented: getByFolder");
	},

	async getAll() {
		throw new Error("API route not implemented: getAll");
	},

	async save() {
		throw new Error("API route not implemented: save");
	},

	async saveMany(images, organizationId) {
		const folderId = images[0]?.folderId;
		if (!folderId || images.some((img) => !img.folderId)) {
			throw new Error("Cannot save images without a folder");
		}

		// Convert data URL src strings to Blobs for S3 upload
		const parsed = await Promise.all(
			images.map(async (img) => {
				const response = await fetch(img.src);
				const blob = await response.blob();
				const contentType = blob.type || "image/png";
				const extension = contentType.split("/")[1] ?? "png";
				const filename = `image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
				return { ...img, blob, contentType, filename };
			}),
		);

		console.log(
			buildUrl("/api/extension/images", {
				action: "upload-urls",
				organizationId,
			}),
		);

		// Step 1: Get presigned upload URLs
		const urlsResponse = await fetch(
			buildUrl("/api/extension/images", {
				action: "upload-urls",
				organizationId,
			}),
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					images: parsed.map((img) => ({
						filename: img.filename,
						contentType: img.contentType,
					})),
				}),
			},
		);

		if (!urlsResponse.ok) {
			throw new Error(`Failed to get upload URLs: ${urlsResponse.status}`);
		}

		const { images: uploadData } = await urlsResponse.json();

		// Step 2: Upload each image to S3
		await Promise.all(
			uploadData.map((data: { uploadUrl: string }, i: number) =>
				fetch(data.uploadUrl, {
					method: "PUT",
					body: parsed[i].blob,
					headers: { "Content-Type": parsed[i].contentType },
				}),
			),
		);

		// Step 3: Save metadata to database
		const saveResponse = await fetch(
			buildUrl("/api/extension/images", {
				action: "save",
				organizationId,
			}),
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					folderId,
					images: uploadData.map(
						(data: { filename: string; storageKey: string }, i: number) => ({
							filename: data.filename,
							storageKey: data.storageKey,
							mimeType: parsed[i].contentType,
							sizeBytes: parsed[i].blob.size,
							originUrl: parsed[i].metadata?.originalUrl,
						}),
					),
				}),
			},
		);

		if (!saveResponse.ok) {
			throw new Error(`Failed to save images: ${saveResponse.status}`);
		}

		return saveResponse.json();
	},

	async delete() {
		throw new Error("API route not implemented: delete");
	},

	async moveToFolder() {
		throw new Error("API route not implemented: moveToFolder");
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
	return apiImageService;
	// return tier === "free" ? localImageService : apiImageService;
};

// ─────────────────────────────────────────────────────────────────────────────
// Exported Service (delegates to appropriate implementation)
// ─────────────────────────────────────────────────────────────────────────────

export const imageService: ImageServiceImpl = {
	getByFolder: async (folderId, organizationId) =>
		(await getImpl()).getByFolder(folderId, organizationId),
	getAll: async (organizationId) => (await getImpl()).getAll(organizationId),
	save: async (image, organizationId) =>
		(await getImpl()).save(image, organizationId),
	saveMany: async (images, organizationId) =>
		(await getImpl()).saveMany(images, organizationId),
	delete: async (id, organizationId) =>
		(await getImpl()).delete(id, organizationId),
	moveToFolder: async (imageId, folderId, organizationId) =>
		(await getImpl()).moveToFolder(imageId, folderId, organizationId),
};
