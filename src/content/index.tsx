import ReactDOM from "react-dom/client";
import browser from "webextension-polyfill";
import { Toolbar } from "@/content/toolbar/Toolbar";
import { ENABLED_SITES_KEY, TOOLBAR_CORNER_KEY } from "@/lib/constants";
import { normaliseTailwind } from "@/lib/utils";
import styles from "@/styles.css?inline";
import { type Corner, type Message, MessageType } from "@/types";

// Module state
let rootContainer: HTMLElement | null = null;
let root: ReactDOM.Root | null = null;

const getSiteState = async (): Promise<boolean> => {
	const hostname = window.location.hostname;
	const stored = await browser.storage.local.get(ENABLED_SITES_KEY);
	const sites = (stored[ENABLED_SITES_KEY] as Record<string, boolean>) || {};
	return sites[hostname] || false;
};

const loadToolbarCorner = async (): Promise<Corner> => {
	const stored = await browser.storage.local.get(TOOLBAR_CORNER_KEY);
	return (stored[TOOLBAR_CORNER_KEY] as Corner) || "bottom-right";
};

export const saveToolbarCorner = async (corner: Corner): Promise<void> => {
	await browser.storage.local.set({ [TOOLBAR_CORNER_KEY]: corner });
};

const showToolbar = async () => {
	if (rootContainer) return;

	const initialCorner = await loadToolbarCorner();

	// Create shadow host
	rootContainer = document.createElement("div");
	rootContainer.id = "inspo-snaps-toolbar-root";

	// Attach shadow DOM for style isolation
	const shadowRoot = rootContainer.attachShadow({ mode: "open" });

	// Inject Tailwind CSS
	const styleElement = document.createElement("style");
	styleElement.textContent = normaliseTailwind(styles);
	shadowRoot.appendChild(styleElement);

	// Create React mount point
	const mountPoint = document.createElement("div");
	mountPoint.id = "inspo-snaps-toolbar";
	shadowRoot.appendChild(mountPoint);

	document.documentElement.appendChild(rootContainer);

	// Mount React
	root = ReactDOM.createRoot(mountPoint);
	root.render(<Toolbar initialCorner={initialCorner} />);
};

const hideToolbar = () => {
	if (!rootContainer) return;

	if (root) {
		root.unmount();
		root = null;
	}

	rootContainer.remove();
	rootContainer = null;
};

const setupMessageListener = () => {
	browser.runtime.onMessage.addListener((message: Message) => {
		if (message.type === MessageType.SITE_STATE_UPDATED) {
			if (message.payload) {
				showToolbar();
			} else {
				hideToolbar();
			}
		}
	});
};

const init = async () => {
	const enabled = await getSiteState();
	setupMessageListener();
	if (enabled) showToolbar();
};

// Initialize
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}
