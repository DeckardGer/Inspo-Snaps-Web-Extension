import { sendMessage } from "@/lib/messaging";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiRequestOptions<TBody = unknown> {
	method?: HttpMethod;
	body?: TBody;
}

interface ApiResponse<T> {
	data: T;
	status: number;
}

/**
 * Make an API request to the website backend via the background script.
 * This avoids CORS issues when running in content scripts.
 *
 * @example
 * // GET request
 * const folders = await api.get<Folder[]>("/api/folders");
 *
 * // POST request
 * const newFolder = await api.post<Folder>("/api/folders", {
 *   name: "My Folder",
 *   parentId: null,
 * });
 *
 * // Generic request
 * const result = await api.request<User>("/api/users/me", { method: "GET" });
 */
export const api = {
	/**
	 * Make a generic API request
	 */
	async request<TResponse, TBody = unknown>(
		endpoint: string,
		options: ApiRequestOptions<TBody> = {},
	): Promise<TResponse> {
		const { method = "GET", body } = options;

		const response = await sendMessage<ApiResponse<TResponse>>({
			type: "API_REQUEST",
			payload: { endpoint, method, body },
		});

		return response.data;
	},

	/**
	 * Make a GET request
	 */
	async get<TResponse>(endpoint: string): Promise<TResponse> {
		return this.request<TResponse>(endpoint, { method: "GET" });
	},

	/**
	 * Make a POST request
	 */
	async post<TResponse, TBody = unknown>(
		endpoint: string,
		body: TBody,
	): Promise<TResponse> {
		return this.request<TResponse, TBody>(endpoint, { method: "POST", body });
	},

	/**
	 * Make a PUT request
	 */
	async put<TResponse, TBody = unknown>(
		endpoint: string,
		body: TBody,
	): Promise<TResponse> {
		return this.request<TResponse, TBody>(endpoint, { method: "PUT", body });
	},

	/**
	 * Make a PATCH request
	 */
	async patch<TResponse, TBody = unknown>(
		endpoint: string,
		body: TBody,
	): Promise<TResponse> {
		return this.request<TResponse, TBody>(endpoint, { method: "PATCH", body });
	},

	/**
	 * Make a DELETE request
	 */
	async delete<TResponse = void>(endpoint: string): Promise<TResponse> {
		return this.request<TResponse>(endpoint, { method: "DELETE" });
	},
};
