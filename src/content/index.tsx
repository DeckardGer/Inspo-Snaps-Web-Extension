import { HotkeysProvider } from "@tanstack/react-hotkeys";
import ReactDOM from "react-dom/client";
import browser from "webextension-polyfill";
import { Toolbar } from "@/content/toolbar/Toolbar";
import { ENABLED_SITES_KEY, INSPO_SNAPS_DOMAIN } from "@/lib/config";
import { logger } from "@/lib/logger";
import { extensionShort, TOOLBAR_CORNER_KEY } from "@/lib/constants";
import { normaliseTailwind } from "@/lib/utils";
import { initializeAuth, useAuthStore } from "@/store/authStore";
import { loadActiveOrganizationId } from "@/store/organizationsStore";
import { useToolbarStore } from "@/store/toolbarStore";
import styles from "@/styles.css?inline";
import type { Corner, Message } from "@/types";

// Module state
let rootContainer: HTMLElement | null = null;
let root: ReactDOM.Root | null = null;
let lastRightClickedElement: HTMLElement | null = null;

const getSiteState = async (): Promise<boolean> => {
	const hostname = window.location.hostname;
	const stored = await browser.storage.local.get(ENABLED_SITES_KEY);
	const sites = (stored[ENABLED_SITES_KEY] as Record<string, boolean>) || {};

	return sites[hostname] || false;
};

const loadToolbarCorner = async (): Promise<Corner> => {
	const stored = await browser.storage.local.get(TOOLBAR_CORNER_KEY);
	const corner = (stored[TOOLBAR_CORNER_KEY] as Corner) || "bottom-right";

	return corner;
};

export const saveToolbarCorner = async (corner: Corner): Promise<void> => {
	await browser.storage.local.set({ [TOOLBAR_CORNER_KEY]: corner });
};

const showToolbar = async () => {
	if (rootContainer) return;

	// Initialize auth BEFORE mounting toolbar
	await initializeAuth();

	const initialCorner = await loadToolbarCorner();
	await loadActiveOrganizationId();

	// Create shadow host
	rootContainer = document.createElement("div");
	rootContainer.id = `${extensionShort}-toolbar-root`;

	// Attach shadow DOM for style isolation
	const shadowRoot = rootContainer.attachShadow({ mode: "open" });

	// Inject @font-face for Inter
	const fontStyle = document.createElement("style");
	fontStyle.textContent = `@font-face {
	font-family: "Inter";
	font-style: normal;
	font-weight: 100 900;
	font-display: swap;
	src: url("${browser.runtime.getURL("fonts/InterVariable.woff2")}") format("woff2");
}`;
	shadowRoot.appendChild(fontStyle);

	// Inject Tailwind CSS
	const styleElement = document.createElement("style");
	styleElement.textContent = normaliseTailwind(styles);
	shadowRoot.appendChild(styleElement);

	// Create React mount point
	const mountPoint = document.createElement("div");
	mountPoint.id = `${extensionShort}-toolbar`;
	shadowRoot.appendChild(mountPoint);

	document.documentElement.appendChild(rootContainer);

	// Mount React
	root = ReactDOM.createRoot(mountPoint);
	root.render(
		<HotkeysProvider>
			<Toolbar initialCorner={initialCorner} />
		</HotkeysProvider>,
	);
};

const hideToolbar = () => {
	if (!rootContainer) return;

	// Reset toolbar state before unmounting
	useToolbarStore.getState().reset();

	if (root) {
		root.unmount();
		root = null;
	}

	rootContainer.remove();
	rootContainer = null;
};

const setupMessageListener = () => {
	browser.runtime.onMessage.addListener((message: Message) => {
		if (message.type === "SITE_STATE_UPDATED") {
			if (message.payload) {
				showToolbar();
			} else {
				hideToolbar();
			}
		} else if (message.type === "SAVE_IMAGE") {
			const srcUrl = message.payload as string;

			// Use the stored right-clicked element, or fall back to center of screen
			const rect =
				lastRightClickedElement?.getBoundingClientRect() ??
				new DOMRect(
					window.innerWidth / 2 - 50,
					window.innerHeight / 2 - 50,
					100,
					100,
				);

			// Dispatch custom event for Toolbar to handle
			window.dispatchEvent(
				new CustomEvent("inspo-save-image", {
					detail: { src: srcUrl, rect },
				}),
			);

			// Clear the stored element
			lastRightClickedElement = null;
		} else if (message.type === "AUTH_SESSION_UPDATED") {
			// Update auth store with broadcasted session
			useAuthStore.getState().setSession(message.payload.session);
		}
	});
};

const setupContextMenuTracker = () => {
	document.addEventListener("contextmenu", (e) => {
		lastRightClickedElement = e.target as HTMLElement;
	});
};

/**
 * Setup auth bridge for Firefox.
 * Firefox doesn't support externally_connectable, so the website uses postMessage
 * and this content script forwards to the background script.
 * Chrome uses externally_connectable directly (handled in background/index.ts).
 */
const setupAuthBridge = () => {
	window.addEventListener("message", async (event) => {
		// Only listen on auth domain
		if (event.origin !== INSPO_SNAPS_DOMAIN) return;

		// Validate message structure
		if (event.data?.type !== "INSPO_SNAPS_AUTH_UPDATE") return;

		logger.log("[Auth Bridge] Received auth update from website");

		try {
			// Forward to background script
			await browser.runtime.sendMessage({
				type: "AUTH_BRIDGE_UPDATE",
				payload: { session: event.data.payload?.session ?? null },
			});
		} catch (error) {
			logger.error("[Auth Bridge] Failed to forward auth update:", error);
		}
	});
};

const init = async () => {
	const enabled = await getSiteState();
	setupMessageListener();
	setupContextMenuTracker();
	setupAuthBridge();
	if (enabled) showToolbar();
};

// Initialize
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
