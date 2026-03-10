import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function generateManifest() {
	const manifest = readJsonFile("src/manifest.json");
	const pkg = readJsonFile("package.json");
	return {
		name: "InspoSnaps",
		description: pkg.description,
		version: pkg.version,
		...manifest,
	};
}

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		webExtension({
			manifest: generateManifest,
		}),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	build: {
		rollupOptions: {
			onwarn(warning, warn) {
				// Suppress annotation warnings from @hugeicons packages
				if (
					warning.code === "INVALID_ANNOTATION" &&
					warning.message.includes("@hugeicons")
				) {
					return;
				}
				warn(warning);
			},
		},
	},
});
