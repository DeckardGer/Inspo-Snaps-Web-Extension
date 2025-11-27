import { APP_MODE } from "@/lib/config";
import { sendMessage } from "@/lib/messaging";
import type { StoredImage } from "@/types";

// Service interface
export interface ImageService {
	getImagesByFolder(folderId: string | null): Promise<StoredImage[]>;
	getAllImages(): Promise<StoredImage[]>;
	saveImage(image: Omit<StoredImage, "id" | "createdAt">): Promise<StoredImage>;
	saveImages(
		images: Array<Omit<StoredImage, "id" | "createdAt">>,
	): Promise<StoredImage[]>;
	deleteImage(id: string): Promise<void>;
	moveImageToFolder(
		imageId: string,
		folderId: string | null,
	): Promise<StoredImage>;
}

// Local (Message-based) implementation
class LocalImageService implements ImageService {
	async getImagesByFolder(folderId: string | null): Promise<StoredImage[]> {
		try {
			const { images } = await sendMessage<{ images: StoredImage[] }>({
				type: "GET_IMAGES",
				payload: { folderId },
			});

			return images;
		} catch (error) {
			console.error("[ImageService] getImagesByFolder failed:", error);
			throw error;
		}
	}

	async getAllImages(): Promise<StoredImage[]> {
		return this.getImagesByFolder(null);
	}

	async saveImage(
		image: Omit<StoredImage, "id" | "createdAt">,
	): Promise<StoredImage> {
		return (await this.saveImages([image]))[0];
	}

	async saveImages(
		images: Array<Omit<StoredImage, "id" | "createdAt">>,
	): Promise<StoredImage[]> {
		try {
			const { images: savedImages } = await sendMessage<{
				images: StoredImage[];
			}>({
				type: "SAVE_IMAGES",
				payload: { images },
			});

			return savedImages;
		} catch (error) {
			console.error("[ImageService] saveImages failed:", error);
			throw error;
		}
	}

	async deleteImage(id: string): Promise<void> {
		try {
			await sendMessage<void>({
				type: "DELETE_IMAGE",
				payload: { id },
			});
		} catch (error) {
			console.error("[ImageService] deleteImage failed:", error);
			throw error;
		}
	}

	async moveImageToFolder(
		imageId: string,
		folderId: string | null,
	): Promise<StoredImage> {
		try {
			const { image } = await sendMessage<{ image: StoredImage }>({
				type: "MOVE_IMAGE",
				payload: { imageId, folderId },
			});

			return image;
		} catch (error) {
			console.error("[ImageService] moveImageToFolder failed:", error);
			throw error;
		}
	}
}

// API (paid mode) implementation
class ApiImageService implements ImageService {
	async getImagesByFolder(_folderId: string | null): Promise<StoredImage[]> {
		throw new Error(
			"API image service not implemented. Authentication required.",
		);
	}

	async getAllImages(): Promise<StoredImage[]> {
		throw new Error(
			"API image service not implemented. Authentication required.",
		);
	}

	async saveImage(
		_image: Omit<StoredImage, "id" | "createdAt">,
	): Promise<StoredImage> {
		throw new Error(
			"API image service not implemented. Authentication required.",
		);
	}

	async saveImages(
		_images: Array<Omit<StoredImage, "id" | "createdAt">>,
	): Promise<StoredImage[]> {
		throw new Error(
			"API image service not implemented. Authentication required.",
		);
	}

	async deleteImage(_id: string): Promise<void> {
		throw new Error(
			"API image service not implemented. Authentication required.",
		);
	}

	async moveImageToFolder(
		_imageId: string,
		_folderId: string | null,
	): Promise<StoredImage> {
		throw new Error(
			"API image service not implemented. Authentication required.",
		);
	}
}

// Service factory
let imageServiceInstance: ImageService | null = null;

export const getImageService = (): ImageService => {
	if (!imageServiceInstance) {
		imageServiceInstance =
			APP_MODE === "free" ? new LocalImageService() : new ApiImageService();
	}
	return imageServiceInstance;
};
