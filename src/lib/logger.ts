const isDev = import.meta.env.MODE === "development";

function noop() {}

export const logger = {
	log: isDev ? console.log.bind(console) : noop,
	warn: isDev ? console.warn.bind(console) : noop,
	error: console.error.bind(console),
} as const;
