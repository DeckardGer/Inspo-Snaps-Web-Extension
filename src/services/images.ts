import browser from "webextension-polyfill";
import { APP_MODE } from "@/lib/config";
import type { StoredImage } from "@/types";
import { MessageType } from "@/types";

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
		const response = (await browser.runtime.sendMessage({
			type: MessageType.GET_IMAGES,
			payload: { folderId },
		})) as { success: boolean; images: StoredImage[] };

		if (!response.success) {
			throw new Error("Failed to get images");
		}

		return response.images;
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
		const response = (await browser.runtime.sendMessage({
			type: MessageType.SAVE_IMAGES,
			payload: { images },
		})) as { success: boolean; images: StoredImage[] };

		if (!response.success) {
			throw new Error("Failed to save images");
		}

		return response.images;
	}

	async deleteImage(id: string): Promise<void> {
		const response = (await browser.runtime.sendMessage({
			type: MessageType.DELETE_IMAGE,
			payload: { id },
		})) as { success: boolean };

		if (!response.success) {
			throw new Error("Failed to delete image");
		}
	}

	async moveImageToFolder(
		imageId: string,
		folderId: string | null,
	): Promise<StoredImage> {
		const response = (await browser.runtime.sendMessage({
			type: MessageType.MOVE_IMAGE,
			payload: { imageId, folderId },
		})) as { success: boolean; image: StoredImage };

		if (!response.success) {
			throw new Error("Failed to move image");
		}

		return response.image;
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
