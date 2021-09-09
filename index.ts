interface Point {
	x: number;
	y: number;
}

interface Rectangle extends Point {
	height: number;
	width: number;
}

class ImageEditor {
	private selections: Rectangle[] = [];
	private parent: HTMLElement;
	private startMouse: Point | undefined;
	private canvas: HTMLCanvasElement;
	private canvasCtx: CanvasRenderingContext2D;
	private workingCanvas: HTMLCanvasElement = document.createElement("canvas");

	constructor(parent: HTMLElement) {
		this.parent = parent;

		const canvas = parent.querySelector<HTMLCanvasElement>("canvas");
		const ctx = canvas?.getContext("2d");

		if (!canvas || !ctx) {
			throw "Could not get canvas.";
		}
		this.canvas = canvas;
		this.canvasCtx = ctx;

		document.body.appendChild(this.workingCanvas);

		this.init();
	}

	loadImageIntoCanvas(canvas: HTMLCanvasElement, imageFile: File) {
		const img = new Image();
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw "Can't load context for canvas";
		}

		img.addEventListener("load", () => {
			canvas.height = img.height;
			canvas.width = img.width;
			ctx.drawImage(img, 0, 0);
		});

		img.src = URL.createObjectURL(imageFile);
	}

	init() {
		this.parent.addEventListener("paste", (ev) => {
			const imageFile = getImageFromClipboard(ev);
			if (!imageFile) {
				console.error("No image found in clipboard");
				return;
			}
			this.loadImageIntoCanvas(this.canvas, imageFile);
		});

		this.canvas.addEventListener("pointerdown", (ev) => {
			this.startMouse = {
				x: ev.offsetX,
				y: ev.offsetY,
			};
		});

		this.canvas.addEventListener("pointerup", (ev) => {
			if (!this.startMouse) return;

			const startX = Math.min(this.startMouse.x, ev.offsetX);
			const startY = Math.min(this.startMouse.y, ev.offsetY);

			const width = Math.abs(this.startMouse.x - ev.offsetX);
			const height = Math.abs(this.startMouse.y - ev.offsetY);

			const newRectangle = {
				x: startX,
				y: startY,
				height,
				width,
			};
			this.selections.push(newRectangle);

			this.canvasCtx.beginPath();
			this.canvasCtx.strokeStyle = "#F00";
			this.canvasCtx.strokeRect(startX, startY, width, height);
			this.startMouse = undefined;

			this.blurRegion(this.canvas, newRectangle);
		});
	}

	blurRegion = (canvas: HTMLCanvasElement, region: Rectangle) => {
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw "No context for canvas";
		}

		const regionData = ctx.getImageData(
			region.x,
			region.y,
			region.width,
			region.height
		);

		const image = new Image();
		image.src;

		const workingCtx = this.workingCanvas.getContext("2d");
		if (workingCtx === null) {
			throw "No context found for working canvas";
		}

		workingCtx.drawImage(canvas, 0, 0, region.width, region.height);

		// regionData.
	};
}

function getImageFromClipboard(ev: ClipboardEvent) {
	if (!ev.clipboardData?.items) return;

	for (let index = 0; index < ev.clipboardData.items.length; index++) {
		const clipboardItem = ev.clipboardData.items[index];

		if (clipboardItem.type.includes("image")) {
			return clipboardItem.getAsFile() || undefined;
		}
	}
}

function init() {
	const body = document.querySelector("body")!;
	const editor = new ImageEditor(body);
}

init();
