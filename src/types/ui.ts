// UI-specific types
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface CapturedImage {
	id: string;
	src: string;
}

export interface ImageCaptureData {
	src: string;
	rect: DOMRect;
}

export interface FlyingImageData extends ImageCaptureData {
	id: string;
}
