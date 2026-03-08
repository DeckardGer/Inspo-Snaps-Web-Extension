import { useHotkey } from "@tanstack/react-hotkeys";
import { useImagesStore } from "@/store/imagesStore";
import { useToolbarStore } from "@/store/toolbarStore";

interface UseToolbarHotkeysOptions {
	toggleFolderPanel: () => void;
	onSaveImages: (clearAfterSave: boolean) => void;
}

export function useToolbarHotkeys({
	toggleFolderPanel,
	onSaveImages,
}: UseToolbarHotkeysOptions) {
	const { isMinimised } = useToolbarStore();
	const { capturedImages } = useImagesStore();

	const hasImages = capturedImages.length > 0;

	// Mod+Shift+C — Toggle capture/inspector mode
	useHotkey(
		"Mod+Shift+C",
		() => {
			useToolbarStore.getState().toggleIsInspecting();
		},
		{ preventDefault: true },
	);

	// Mod+Shift+F — Toggle folder panel
	useHotkey(
		"Mod+Shift+F",
		() => {
			toggleFolderPanel();
		},
		{ preventDefault: true },
	);

	// Mod+Shift+S — Save images to folder (keep images)
	useHotkey(
		"Mod+Shift+S",
		() => {
			onSaveImages(false);
		},
		{ preventDefault: true, enabled: hasImages && !isMinimised },
	);

	// Mod+S — Save & clear images
	useHotkey(
		"Mod+S",
		() => {
			onSaveImages(true);
		},
		{ preventDefault: true, enabled: hasImages && !isMinimised },
	);
}
