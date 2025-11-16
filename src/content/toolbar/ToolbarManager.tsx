import ReactDOM from "react-dom/client";
import { Toolbar } from "@/content/toolbar/Toolbar";
import { normaliseTailwind } from "@/lib/utils";
import styles from "@/styles.css?inline";

export class ToolbarManager {
	private rootContainer: HTMLElement | null = null;
	private mountPoint: HTMLElement | null = null;
	private root: ReactDOM.Root | null = null;
	private isVisible = false;
	private onAction: (action: string) => void;

	constructor(onAction: (action: string) => void) {
		this.onAction = onAction;
	}

	show() {
		if (this.isVisible) return;

		this.createContainer();
		this.render();
		this.isVisible = true;
	}

	hide() {
		if (!this.isVisible) return;

		if (this.root) {
			this.root.unmount();
			this.root = null;
		}

		if (this.rootContainer) {
			this.rootContainer.remove();
			this.rootContainer = null;
		}

		this.mountPoint = null;
		this.isVisible = false;
	}

	private createContainer() {
		// Create shadow host
		this.rootContainer = document.createElement("div");
		this.rootContainer.id = "inspo-snaps-toolbar-root";

		// Attach shadow DOM for style isolation
		const shadowRoot = this.rootContainer.attachShadow({ mode: "open" });

		// Inject Tailwind CSS
		const styleElement = document.createElement("style");
		styleElement.textContent = normaliseTailwind(styles);
		shadowRoot.appendChild(styleElement);

		// Create React mount point
		this.mountPoint = document.createElement("div");
		this.mountPoint.id = "inspo-snaps-toolbar";
		shadowRoot.appendChild(this.mountPoint);

		document.documentElement.appendChild(this.rootContainer);
	}

	private render() {
		if (!this.mountPoint) return;

		this.root = ReactDOM.createRoot(this.mountPoint);
		this.root.render(<Toolbar onAction={this.onAction} />);
	}
}
