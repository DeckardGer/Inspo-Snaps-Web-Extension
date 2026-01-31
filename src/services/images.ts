import { sendMessage } from "@/lib/messaging";
import { useOrganizationsStore } from "@/store/organizationsStore";
import type { StoredImage } from "@/types";

const getOrgId = () => useOrganizationsStore.getState().activeOrganizationId;

/**
 * Image service - thin messaging layer for content scripts.
 * All business logic (local vs API) is handled in background.
 */
export const imageService = {
	async getImagesByFolder(folderId: string | null): Promise<StoredImage[]> {
		const { images } = await sendMessage<{ images: StoredImage[] }>({
			type: "GET_IMAGES",
			payload: { folderId, organizationId: getOrgId() },
		});
		return images;
	},

	async getAllImages(): Promise<StoredImage[]> {
		return this.getImagesByFolder(null);
	},

	async saveImage(
		image: Omit<StoredImage, "id" | "createdAt">,
	): Promise<StoredImage> {
		const result = await this.saveImages([image]);
		return result[0];
	},

	async saveImages(
		images: Array<Omit<StoredImage, "id" | "createdAt">>,
	): Promise<StoredImage[]> {
		const { images: savedImages } = await sendMessage<{
			images: StoredImage[];
		}>({
			type: "SAVE_IMAGES",
			payload: { images, organizationId: getOrgId() },
		});
		return savedImages;
	},

	async deleteImage(id: string): Promise<void> {
		await sendMessage<void>({
			type: "DELETE_IMAGE",
			payload: { id, organizationId: getOrgId() },
		});
	},

	async moveImageToFolder(
		imageId: string,
		folderId: string,
	): Promise<StoredImage> {
		const { image } = await sendMessage<{ image: StoredImage }>({
			type: "MOVE_IMAGE",
			payload: { imageId, folderId, organizationId: getOrgId() },
		});
		return image;
	},
};
