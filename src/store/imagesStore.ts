import { create } from "zustand";
import type { CapturedImage, FlyingImageData } from "@/types";

interface ImagesState {
	capturedImages: CapturedImage[];
	flyingImages: FlyingImageData[];
	isSavingImages: boolean;

	// Actions
	addCapturedImage: (image: CapturedImage) => void;
	removeCapturedImage: (id: string) => void;
	removeLatestImage: () => void;
	clearCapturedImages: () => void;

	addFlyingImage: (image: FlyingImageData) => void;
	removeFlyingImage: (id: string) => void;

	setIsSavingImages: (value: boolean) => void;
}

export const useImagesStore = create<ImagesState>((set) => ({
	capturedImages: [],
	flyingImages: [],
	isSavingImages: false,

	addCapturedImage: (image) =>
		set((state) => ({ capturedImages: [...state.capturedImages, image] })),

	removeCapturedImage: (id) =>
		set((state) => ({
			capturedImages: state.capturedImages.filter((img) => img.id !== id),
		})),

	removeLatestImage: () =>
		set((state) => ({ capturedImages: state.capturedImages.slice(0, -1) })),

	clearCapturedImages: () => set({ capturedImages: [] }),

	addFlyingImage: (image) =>
		set((state) => ({ flyingImages: [...state.flyingImages, image] })),

	removeFlyingImage: (id) =>
		set((state) => ({
			flyingImages: state.flyingImages.filter((img) => img.id !== id),
		})),

	setIsSavingImages: (value) => set({ isSavingImages: value }),
}));
