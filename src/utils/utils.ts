export const normalizeTailwind = (css: string) => {
	return css
		.replace(/:root\b/g, ":host")
		.replaceAll("((-webkit-hyphens:none)) and ", "")
		.replaceAll("(-webkit-hyphens: none) and ", "");
};
