const MAX_WIDTH = 2000;
const MAX_HEIGHT = 2000;
const MAX_BASE64_BYTES = 4.5 * 1024 * 1024;
const JPEG_QUALITY = 0.8;

type ImageBlock = { type: "image"; data: string; mimeType: string };

const base64ByteLength = (data: string) => new TextEncoder().encode(data).length;

const loadImageElement = (mimeType: string, data: string): Promise<HTMLImageElement> =>
	new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Failed to decode image."));
		image.src = `data:${mimeType};base64,${data}`;
	});

const canvasToJpegBase64 = (canvas: HTMLCanvasElement): string | null => {
	const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
	const commaIndex = dataUrl.indexOf(",");
	return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : null;
};

export const resizeComposerImages = async (images: ImageBlock[]): Promise<ImageBlock[]> => {
	const resized: ImageBlock[] = [];
	for (const image of images) {
		if (base64ByteLength(image.data) < MAX_BASE64_BYTES) {
			resized.push(image);
			continue;
		}

		try {
			const element = await loadImageElement(image.mimeType, image.data);
			let width = element.naturalWidth;
			let height = element.naturalHeight;
			const scale = Math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height);
			width = Math.max(1, Math.round(width * scale));
			height = Math.max(1, Math.round(height * scale));

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext("2d");
			if (!context) {
				resized.push(image);
				continue;
			}
			context.drawImage(element, 0, 0, width, height);
			const data = canvasToJpegBase64(canvas);
			if (!data || base64ByteLength(data) >= MAX_BASE64_BYTES) {
				resized.push(image);
				continue;
			}
			resized.push({ type: "image", data, mimeType: "image/jpeg" });
		} catch {
			resized.push(image);
		}
	}
	return resized;
};
