import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const normaliseTailwind = (css: string) => {
	return css
		.replace(/:root\b/g, ":host")
		.replaceAll("((-webkit-hyphens:none)) and ", "")
		.replaceAll("(-webkit-hyphens: none) and ", "");
};
