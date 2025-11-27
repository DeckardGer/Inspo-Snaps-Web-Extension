import browser from "webextension-polyfill";
import type { Message, ServiceResponse } from "@/types/messages";

class MessageError extends Error {
	constructor(
		message: string,
		public code: string,
		public cause?: Error,
	) {
		super(message);
		this.name = "MessageError";
	}
}

/**
 * Send message to background script with type safety
 */
export const sendMessage = async <T>(message: Message): Promise<T> => {
	try {
		const response = (await browser.runtime.sendMessage(
			message,
		)) as ServiceResponse<T>;

		if (!response) {
			throw new MessageError(
				"No response from background script",
				"NO_RESPONSE",
			);
		}

		if (!response.success) {
			throw new MessageError(
				response.error.message || "Operation failed",
				response.error.code || "UNKNOWN_ERROR",
				response.error.cause,
			);
		}

		return response.data;
	} catch (error) {
		if (error instanceof MessageError) {
			throw error;
		}
		throw new MessageError(
			error instanceof Error ? error.message : "Unknown error",
			"SEND_ERROR",
			error instanceof Error ? error : undefined,
		);
	}
};

export { MessageError };
