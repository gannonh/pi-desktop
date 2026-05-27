/**
 * Ported from @earendil-works/pi-web-ui src/utils/attachment-utils.ts
 */
import { parseAsync } from "docx-preview";
import JSZip from "jszip";
import type { PDFDocumentProxy } from "pdfjs-dist";
import * as XLSX from "xlsx";
import { COMPOSER_MAX_ATTACHMENT_BYTES, type Attachment } from "./attachment-types";

let pdfjsModulePromise: Promise<typeof import("pdfjs-dist")> | undefined;

const getPdfJs = async () => {
	if (!pdfjsModulePromise) {
		pdfjsModulePromise = import("pdfjs-dist").then((pdfjsLib) => {
			pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
				"pdfjs-dist/build/pdf.worker.min.mjs",
				import.meta.url,
			).toString();
			return pdfjsLib;
		});
	}
	return pdfjsModulePromise;
};

const arrayBufferToBase64 = (arrayBuffer: ArrayBuffer): string => {
	const uint8Array = new Uint8Array(arrayBuffer);
	let binary = "";
	const chunkSize = 0x8000;
	for (let i = 0; i < uint8Array.length; i += chunkSize) {
		const chunk = uint8Array.slice(i, i + chunkSize);
		binary += String.fromCharCode(...chunk);
	}
	return btoa(binary);
};

export async function loadAttachment(
	source: string | File | Blob | ArrayBuffer,
	fileName?: string,
): Promise<Attachment> {
	let arrayBuffer: ArrayBuffer;
	let detectedFileName = fileName || "unnamed";
	let mimeType = "application/octet-stream";
	let size = 0;

	if (typeof source === "string") {
		const response = await fetch(source);
		if (!response.ok) {
			throw new Error("Failed to fetch file");
		}
		arrayBuffer = await response.arrayBuffer();
		size = arrayBuffer.byteLength;
		mimeType = response.headers.get("content-type") || mimeType;
		if (!fileName) {
			const urlParts = source.split("/");
			detectedFileName = urlParts[urlParts.length - 1] || "document";
		}
	} else if (source instanceof File) {
		arrayBuffer = await source.arrayBuffer();
		size = source.size;
		mimeType = source.type || mimeType;
		detectedFileName = fileName || source.name;
	} else if (source instanceof Blob) {
		arrayBuffer = await source.arrayBuffer();
		size = source.size;
		mimeType = source.type || mimeType;
	} else if (source instanceof ArrayBuffer) {
		arrayBuffer = source;
		size = source.byteLength;
	} else {
		throw new Error("Invalid source type");
	}

	if (size > COMPOSER_MAX_ATTACHMENT_BYTES) {
		throw new Error(`Attachment exceeds ${Math.floor(COMPOSER_MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB limit.`);
	}

	const base64Content = arrayBufferToBase64(arrayBuffer);
	const id = `${detectedFileName}_${Date.now()}_${Math.random()}`;

	if (mimeType === "application/pdf" || detectedFileName.toLowerCase().endsWith(".pdf")) {
		const { extractedText, preview } = await processPdf(arrayBuffer, detectedFileName);
		return {
			id,
			type: "document",
			fileName: detectedFileName,
			mimeType: "application/pdf",
			size,
			content: base64Content,
			extractedText,
			preview,
		};
	}

	if (
		mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
		detectedFileName.toLowerCase().endsWith(".docx")
	) {
		const { extractedText } = await processDocx(arrayBuffer, detectedFileName);
		return {
			id,
			type: "document",
			fileName: detectedFileName,
			mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			size,
			content: base64Content,
			extractedText,
		};
	}

	if (
		mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
		detectedFileName.toLowerCase().endsWith(".pptx")
	) {
		const { extractedText } = await processPptx(arrayBuffer, detectedFileName);
		return {
			id,
			type: "document",
			fileName: detectedFileName,
			mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
			size,
			content: base64Content,
			extractedText,
		};
	}

	const excelMimeTypes = [
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-excel",
	];
	if (
		excelMimeTypes.includes(mimeType) ||
		detectedFileName.toLowerCase().endsWith(".xlsx") ||
		detectedFileName.toLowerCase().endsWith(".xls")
	) {
		const { extractedText } = await processExcel(arrayBuffer, detectedFileName);
		return {
			id,
			type: "document",
			fileName: detectedFileName,
			mimeType: mimeType.startsWith("application/vnd")
				? mimeType
				: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			size,
			content: base64Content,
			extractedText,
		};
	}

	if (mimeType.startsWith("image/")) {
		if (size === 0) {
			throw new Error("Image attachment is empty.");
		}
		return {
			id,
			type: "image",
			fileName: detectedFileName,
			mimeType,
			size,
			content: base64Content,
			preview: base64Content,
		};
	}

	const textExtensions = [
		".txt",
		".md",
		".json",
		".xml",
		".html",
		".css",
		".js",
		".ts",
		".jsx",
		".tsx",
		".yml",
		".yaml",
	];
	const isTextFile =
		mimeType.startsWith("text/") || textExtensions.some((ext) => detectedFileName.toLowerCase().endsWith(ext));

	if (isTextFile) {
		const decoder = new TextDecoder();
		const text = decoder.decode(arrayBuffer);
		return {
			id,
			type: "document",
			fileName: detectedFileName,
			mimeType: mimeType.startsWith("text/") ? mimeType : "text/plain",
			size,
			content: base64Content,
			extractedText: text,
		};
	}

	throw new Error(`Unsupported file type: ${mimeType}`);
}

async function processPdf(
	arrayBuffer: ArrayBuffer,
	fileName: string,
): Promise<{ extractedText: string; preview?: string }> {
	const pdfjsLib = await getPdfJs();
	let pdf: PDFDocumentProxy | null = null;
	try {
		pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

		let extractedText = `<pdf filename="${fileName}">`;
		for (let i = 1; i <= pdf.numPages; i++) {
			const page = await pdf.getPage(i);
			const textContent = await page.getTextContent();
			const pageText = textContent.items
				.map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
				.filter((str) => str.trim())
				.join(" ");
			extractedText += `\n<page number="${i}">\n${pageText}\n</page>`;
		}
		extractedText += "\n</pdf>";

		const preview = await generatePdfPreview(pdf);
		return { extractedText, preview };
	} catch (error) {
		console.error("Error processing PDF:", error);
		throw new Error(`Failed to process PDF: ${String(error)}`);
	} finally {
		if (pdf) {
			pdf.destroy();
		}
	}
}

async function generatePdfPreview(pdf: PDFDocumentProxy): Promise<string | undefined> {
	try {
		const page = await pdf.getPage(1);
		const viewport = page.getViewport({ scale: 1.0 });
		const scale = Math.min(160 / viewport.width, 160 / viewport.height);
		const scaledViewport = page.getViewport({ scale });

		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		if (!context) {
			return undefined;
		}

		canvas.height = scaledViewport.height;
		canvas.width = scaledViewport.width;

		await page.render({ canvasContext: context, viewport: scaledViewport, canvas }).promise;
		return canvas.toDataURL("image/png").split(",")[1];
	} catch (error) {
		console.error("Error generating PDF preview:", error);
		return undefined;
	}
}

async function processDocx(arrayBuffer: ArrayBuffer, fileName: string): Promise<{ extractedText: string }> {
	try {
		const wordDoc = await parseAsync(arrayBuffer);
		let extractedText = `<docx filename="${fileName}">\n<page number="1">\n`;

		const body = wordDoc.documentPart?.body;
		if (body?.children) {
			const texts: string[] = [];
			for (const element of body.children) {
				const text = extractTextFromElement(element);
				if (text) {
					texts.push(text);
				}
			}
			extractedText += texts.join("\n");
		}

		extractedText += `\n</page>\n</docx>`;
		return { extractedText };
	} catch (error) {
		console.error("Error processing DOCX:", error);
		throw new Error(`Failed to process DOCX: ${String(error)}`);
	}
}

const extractTextFromElement = (element: unknown): string => {
	if (!element || typeof element !== "object") {
		return "";
	}
	const record = element as Record<string, unknown>;
	let text = "";
	const elementType = typeof record.type === "string" ? record.type.toLowerCase() : "";

	if (elementType === "paragraph" && Array.isArray(record.children)) {
		for (const child of record.children) {
			const childRecord = child as Record<string, unknown>;
			const childType = typeof childRecord.type === "string" ? childRecord.type.toLowerCase() : "";
			if (childType === "run" && Array.isArray(childRecord.children)) {
				for (const textChild of childRecord.children) {
					const textRecord = textChild as Record<string, unknown>;
					const textType = typeof textRecord.type === "string" ? textRecord.type.toLowerCase() : "";
					if (textType === "text" && typeof textRecord.text === "string") {
						text += textRecord.text;
					}
				}
			} else if (childType === "text" && typeof childRecord.text === "string") {
				text += childRecord.text;
			}
		}
	} else if (elementType === "table" && Array.isArray(record.children)) {
		const tableTexts: string[] = [];
		for (const row of record.children) {
			const rowRecord = row as Record<string, unknown>;
			const rowType = typeof rowRecord.type === "string" ? rowRecord.type.toLowerCase() : "";
			if (rowType === "tablerow" && Array.isArray(rowRecord.children)) {
				const rowTexts: string[] = [];
				for (const cell of rowRecord.children) {
					const cellRecord = cell as Record<string, unknown>;
					const cellType = typeof cellRecord.type === "string" ? cellRecord.type.toLowerCase() : "";
					if (cellType === "tablecell" && Array.isArray(cellRecord.children)) {
						const cellTexts: string[] = [];
						for (const cellElement of cellRecord.children) {
							const cellText = extractTextFromElement(cellElement);
							if (cellText) {
								cellTexts.push(cellText);
							}
						}
						if (cellTexts.length > 0) {
							rowTexts.push(cellTexts.join(" "));
						}
					}
				}
				if (rowTexts.length > 0) {
					tableTexts.push(rowTexts.join(" | "));
				}
			}
		}
		if (tableTexts.length > 0) {
			text = `\n[Table]\n${tableTexts.join("\n")}\n[/Table]\n`;
		}
	} else if (Array.isArray(record.children)) {
		const childTexts: string[] = [];
		for (const child of record.children) {
			const childText = extractTextFromElement(child);
			if (childText) {
				childTexts.push(childText);
			}
		}
		text = childTexts.join(" ");
	}

	return text.trim();
};

async function processPptx(arrayBuffer: ArrayBuffer, fileName: string): Promise<{ extractedText: string }> {
	try {
		const zip = await JSZip.loadAsync(arrayBuffer);
		let extractedText = `<pptx filename="${fileName}">`;

		const slideFiles = Object.keys(zip.files)
			.filter((name) => name.match(/ppt\/slides\/slide\d+\.xml$/))
			.sort((a, b) => {
				const numA = Number.parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || "0", 10);
				const numB = Number.parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || "0", 10);
				return numA - numB;
			});

		for (let i = 0; i < slideFiles.length; i++) {
			const slideFile = zip.file(slideFiles[i]);
			if (slideFile) {
				const slideXml = await slideFile.async("text");
				const textMatches = slideXml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);

				if (textMatches) {
					extractedText += `\n<slide number="${i + 1}">`;
					const slideTexts = textMatches
						.map((match) => {
							const textMatch = match.match(/<a:t[^>]*>([^<]+)<\/a:t>/);
							return textMatch ? textMatch[1] : "";
						})
						.filter((t) => t.trim());

					if (slideTexts.length > 0) {
						extractedText += `\n${slideTexts.join("\n")}`;
					}
					extractedText += "\n</slide>";
				}
			}
		}

		const notesFiles = Object.keys(zip.files)
			.filter((name) => name.match(/ppt\/notesSlides\/notesSlide\d+\.xml$/))
			.sort((a, b) => {
				const numA = Number.parseInt(a.match(/notesSlide(\d+)\.xml$/)?.[1] || "0", 10);
				const numB = Number.parseInt(b.match(/notesSlide(\d+)\.xml$/)?.[1] || "0", 10);
				return numA - numB;
			});

		if (notesFiles.length > 0) {
			extractedText += "\n<notes>";
			for (const noteFile of notesFiles) {
				const file = zip.file(noteFile);
				if (file) {
					const noteXml = await file.async("text");
					const textMatches = noteXml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
					if (textMatches) {
						const noteTexts = textMatches
							.map((match) => {
								const textMatch = match.match(/<a:t[^>]*>([^<]+)<\/a:t>/);
								return textMatch ? textMatch[1] : "";
							})
							.filter((t) => t.trim());

						if (noteTexts.length > 0) {
							const slideNum = noteFile.match(/notesSlide(\d+)\.xml$/)?.[1];
							extractedText += `\n[Slide ${slideNum} notes]: ${noteTexts.join(" ")}`;
						}
					}
				}
			}
			extractedText += "\n</notes>";
		}

		extractedText += "\n</pptx>";
		return { extractedText };
	} catch (error) {
		console.error("Error processing PPTX:", error);
		throw new Error(`Failed to process PPTX: ${String(error)}`);
	}
}

async function processExcel(arrayBuffer: ArrayBuffer, fileName: string): Promise<{ extractedText: string }> {
	try {
		const workbook = XLSX.read(arrayBuffer, { type: "array" });
		let extractedText = `<excel filename="${fileName}">`;

		for (const [index, sheetName] of workbook.SheetNames.entries()) {
			const worksheet = workbook.Sheets[sheetName];
			const csvText = XLSX.utils.sheet_to_csv(worksheet);
			extractedText += `\n<sheet name="${sheetName}" index="${index + 1}">\n${csvText}\n</sheet>`;
		}

		extractedText += "\n</excel>";
		return { extractedText };
	} catch (error) {
		console.error("Error processing Excel:", error);
		throw new Error(`Failed to process Excel: ${String(error)}`);
	}
}
