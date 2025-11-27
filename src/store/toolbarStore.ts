import { create } from "zustand";
import type { Corner } from "@/types";

interface ToolbarState {
	// UI state
	isMinimised: boolean;
	corner: Corner;
	isInspecting: boolean;
	isPreviewOpen: boolean;

	// Actions
	setIsMinimised: (value: boolean) => void;
	setCorner: (corner: Corner) => void;
	setIsInspecting: (value: boolean) => void;
	toggleIsInspecting: () => void;
	setIsPreviewOpen: (value: boolean) => void;
}

export const useToolbarStore = create<ToolbarState>((set) => ({
	isMinimised: true,
	corner: "bottom-right",
	isInspecting: false,
	isPreviewOpen: false,

	setIsMinimised: (value) => set({ isMinimised: value }),
	setCorner: (corner) => set({ corner }),
	setIsInspecting: (value) => set({ isInspecting: value }),
	toggleIsInspecting: () =>
		set((state) => ({ isInspecting: !state.isInspecting })),
	setIsPreviewOpen: (value) => set({ isPreviewOpen: value }),
}));
