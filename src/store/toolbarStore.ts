import { create } from "zustand";
import type { Corner } from "@/types";

export interface Notification {
	id: string;
	message: string;
	type: "error" | "success" | "info";
}

interface ToolbarState {
	// UI state
	isMinimised: boolean;
	corner: Corner;
	isInspecting: boolean;
	isPreviewOpen: boolean;
	notification: Notification | null;

	// Actions
	setIsMinimised: (value: boolean) => void;
	setCorner: (corner: Corner) => void;
	setIsInspecting: (value: boolean) => void;
	toggleIsInspecting: () => void;
	setIsPreviewOpen: (value: boolean) => void;
	showNotification: (message: string, type?: Notification["type"]) => void;
	dismissNotification: () => void;
	reset: () => void;
}

export const useToolbarStore = create<ToolbarState>((set) => ({
	isMinimised: true,
	corner: "bottom-right",
	isInspecting: false,
	isPreviewOpen: false,
	notification: null,

	setIsMinimised: (value) => set({ isMinimised: value }),
	setCorner: (corner) => set({ corner }),
	setIsInspecting: (value) => set({ isInspecting: value }),
	toggleIsInspecting: () =>
		set((state) => ({ isInspecting: !state.isInspecting })),
	setIsPreviewOpen: (value) => set({ isPreviewOpen: value }),
	showNotification: (message, type = "error") =>
		set({ notification: { id: Date.now().toString(), message, type } }),
	dismissNotification: () => set({ notification: null }),
	reset: () =>
		set({
			isMinimised: true,
			isInspecting: false,
			isPreviewOpen: false,
			notification: null,
		}),
}));
