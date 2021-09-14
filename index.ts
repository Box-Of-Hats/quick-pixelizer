interface Point {
	x: number;
	y: number;
}

interface Rectangle extends Point {
	height: number;
	width: number;
}

interface Filter {
	min: number;
	max: number;
	step: number;
	label: string;
	input?: HTMLInputElement;
	getString: (value: string) => string;
	default: number;
}

interface UserSettings {
	/**
	 * Default values for filters
	 */
	defaultFilters: {
		[key in FilterType]?: number;
	};
}

type FilterType =
	| "blur"
	| "hue-rotate"
	| "invert"
	| "pixelate"
	| "greyscale"
	| "outline";

/**
 * An image editor component
 */
class ImageEditor {
	private selections: Rectangle[] = [];
	private parent: HTMLElement;
	private startMouse: Point | undefined;
	private canvas: HTMLCanvasElement;
	private canvasCtx: CanvasRenderingContext2D;

	/**
	 * Hidden canvas used to perform region modifications
	 */
	private workingCanvas: HTMLCanvasElement = document.createElement("canvas");

	private controlsParent: HTMLElement;

	private image?: File;

	private localStorageKey = "user-settings";

	private filters: { [key in FilterType]: Filter } = {
		blur: {
			min: 0,
			max: 20,
			step: 1,
			label: "Blur",
			default: 0,
			getString: (value) =>
				`blur(${value}px) blur(${parseInt(value) / 2}px)`,
		},
		greyscale: {
			min: 0,
			max: 1,
			step: 0.1,
			default: 0,
			label: "Greyscale",
			getString: (value) => `grayscale(${value})`,
		},
		invert: {
			min: 0,
			max: 100,
			step: 10,
			default: 0,
			label: "Invert",
			getString: (value) => `invert(${value}%)`,
		},
		"hue-rotate": {
			min: 0,
			max: 360,
			step: 10,
			default: 0,
			label: "Hue-rotate",
			getString: (value) => `hue-rotate(${value}deg)`,
		},
		pixelate: {
			min: 0,
			max: 25,
			step: 1,
			default: 10,
			label: "Pixelate",
			getString: (value) => "", //Pixelation happens elsewhere
		},
		outline: {
			default: 0,
			min: 0,
			max: 100,
			step: 25,
			getString: () => "",
			label: "Outline",
		},
	};

	constructor(parent: HTMLElement, controlsParent: HTMLElement) {
		this.parent = parent;

		const canvas = parent.querySelector<HTMLCanvasElement>("canvas");
		const ctx = canvas?.getContext("2d");

		if (!canvas || !ctx) {
			throw "Could not get canvas.";
		}

		this.canvas = canvas;
		this.canvasCtx = ctx;

		this.controlsParent = controlsParent;

		this.init();
	}

	/**
	 * Create the UI controls for the component
	 */
	private addControls() {
		const filtersContainer = document.createElement("div");
		filtersContainer.classList.add("image-editor__filters");
		this.controlsParent.append(filtersContainer);

		// Render a control for each of the filters
		for (const filterKey in this.filters) {
			const filter = this.filters[filterKey as FilterType];
			const filterId = `control--${filterKey}`;

			const filterInput = document.createElement("input");
			filterInput.type = "range";
			filterInput.min = filter.min.toString();
			filterInput.max = filter.max.toString();
			filterInput.step = filter.step.toString();
			filterInput.dataset.id = filterId;
			filterInput.value = filter.default.toString();
			filter.input = filterInput;

			const filterLabel = document.createElement("label");
			filterLabel.innerText = `${filter.label} ${filterInput.value}`;
			filterLabel.htmlFor = filterId;
			filterLabel.draggable = false;

			const filterContainer = document.createElement("li");
			filterContainer.appendChild(filterLabel);
			filterContainer.appendChild(filterInput);

			filtersContainer.appendChild(filterContainer);
			filterInput.addEventListener("change", (ev) => {
				this.reRender();
			});
			filterInput.addEventListener("mousemove", () => {
				filterLabel.innerText = `${filter.label} ${filterInput.value}`;
			});
		}

		const buttonContainer = document.createElement("div");
		buttonContainer.classList.add("image-editor__buttons");
		this.controlsParent.appendChild(buttonContainer);

		const undoButton = createMaterialButton("undo", "Undo", () =>
			this.undoSelection()
		);
		buttonContainer.appendChild(undoButton);

		const copyButton = createMaterialButton(
			"content_copy",
			"Copy to clipboard",
			(event) => {
				const successClass = "button--success";
				copyCanvasToClipboard(this.canvas);
				copyButton.innerText = "check_circle_outline";
				copyButton.classList.add(successClass);
				setTimeout(() => {
					copyButton.innerText = "content_copy";
					copyButton.classList.remove(successClass);
				}, 1500);
			}
		);
		buttonContainer.appendChild(copyButton);

		const saveDefaults = createMaterialButton(
			"save",
			"Save filters",
			(event) => {
				const successClass = "button--success";
				this.saveStateToLocalStorage();
				saveDefaults.innerText = "check_circle_outline";
				saveDefaults.classList.add(successClass);
				setTimeout(() => {
					saveDefaults.innerText = "save";
					saveDefaults.classList.remove(successClass);
				}, 1500);
			}
		);
		buttonContainer.appendChild(saveDefaults);
	}

	/**
	 * Load an image onto the canvas
	 *
	 * @param canvas
	 * @param imageFile
	 */
	async loadImageIntoCanvas(canvas: HTMLCanvasElement, imageFile: File) {
		return new Promise<void>((res, rej) => {
			const img = new Image();
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				rej("Can't load context for canvas");
				return;
			}

			img.src = URL.createObjectURL(imageFile);

			img.addEventListener("load", () => {
				canvas.height = img.height;
				canvas.width = img.width;
				ctx.drawImage(img, 0, 0);
				res();
			});
		});
	}

	/**
	 * Re-render the edited image in the canvas
	 *
	 * @returns
	 */
	private async reRender() {
		if (!this.image) {
			console.error("No image loaded");
			return;
		}
		await this.loadImageIntoCanvas(this.canvas, this.image);

		this.selections.forEach(async (selection, index) => {
			await this.applyFiltersToRegion(this.canvas, selection);
		});
	}

	/**
	 * Initialize state and event listeners
	 */
	init() {
		this.loadStateFromLocalStorage();
		this.addControls();
		this.parent.addEventListener("paste", async (ev) => {
			const imageFile = getImageFromClipboard(ev);
			if (!imageFile) {
				console.error("No image found in clipboard");
				return;
			}
			this.selections = [];
			this.image = imageFile;
			await this.loadImageIntoCanvas(this.canvas, imageFile);
		});

		this.canvas.addEventListener("pointerdown", (ev) => {
			this.startMouse = {
				x: ev.offsetX,
				y: ev.offsetY,
			};

			// Add starting indicator to canvas
			this.canvasCtx.beginPath();
			this.canvasCtx.arc(ev.offsetX, ev.offsetY, 6, 0, 2 * Math.PI);
			this.canvasCtx.fillStyle = "orange";
			this.canvasCtx.strokeStyle = "black";
			this.canvasCtx.fill();
			this.canvasCtx.stroke();
		});

		this.canvas.addEventListener("pointerup", (ev) => {
			if (!this.startMouse || !this.image) return;

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

			this.startMouse = undefined;

			this.reRender();
		});

		this.parent.addEventListener("keydown", (keyEvent) => {
			this.handleKeyPress(keyEvent);
		});

		this.canvasCtx.font = "18pt Arial";
		this.canvasCtx.textAlign = "center";
		this.canvasCtx.stroke;
		this.canvasCtx.fillText(
			"Paste an image to begin",
			this.canvas.width / 2,
			this.canvas.height / 2
		);
	}

	/**
	 * Handle a keypress event from a user
	 *
	 * @param event
	 */
	private async handleKeyPress(event: KeyboardEvent) {
		if (event.ctrlKey && event.key === "z") {
			event.preventDefault();
			this.undoSelection();
		}

		if (event.ctrlKey && event.key === "c") {
			event.preventDefault();
			this.copyToClipboard();
		}
	}

	/**
	 * Undo the most recent selection
	 */
	private async undoSelection() {
		console.log("Undo");
		this.selections.pop();
		await this.reRender();
	}

	/**
	 * Copy the canvas to the clipboard
	 */
	private async copyToClipboard() {
		copyCanvasToClipboard(this.canvas);
		console.log("Copied to clipboard");
	}

	/**
	 * Apply filters to a region on the canvas
	 *
	 * @param canvas
	 * @param region
	 */
	applyFiltersToRegion = async (
		canvas: HTMLCanvasElement,
		region: Rectangle
	) => {
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw "No context for canvas";
		}

		// Paint the selected region to the working canvas
		const workingCtx = this.workingCanvas.getContext("2d");
		this.workingCanvas.height = region.height;
		this.workingCanvas.width = region.width;

		if (workingCtx === null) {
			throw "No context found for working canvas";
		}

		// Apply filters to selection on working canvas
		let filterString = ``;
		for (const filterKey in this.filters) {
			const filter = this.filters[filterKey as FilterType];
			if (filter.input?.value) {
				const stringForFilter = filter.getString(filter.input.value);
				filterString = `${filterString} ${stringForFilter}`;
			}
		}

		const pixelateValue = parseInt(
			this.filters.pixelate.input?.value ?? "0"
		);
		if (pixelateValue > 0) {
			// Pixelate the region
			const scaleFactor = 1 / pixelateValue;
			workingCtx.scale(scaleFactor, scaleFactor);
			workingCtx.drawImage(
				canvas,
				region.x,
				region.y,
				region.width,
				region.height,
				0,
				0,
				region.width,
				region.height
			);

			workingCtx.resetTransform();
			workingCtx.scale(pixelateValue, pixelateValue);
			workingCtx.filter = filterString;

			workingCtx.drawImage(
				this.workingCanvas,
				0,
				0,
				this.workingCanvas.width,
				this.workingCanvas.height
			);
		} else {
			// Draw the region normally
			workingCtx.filter = filterString;
			workingCtx.drawImage(
				canvas,
				region.x,
				region.y,
				region.width,
				region.height,
				0,
				0,
				region.width,
				region.height
			);
		}

		// Add feint outline around selection
		const outlineValue = parseInt(
			this.filters.outline?.input?.value ?? "0"
		);
		if (outlineValue > 0) {
			this.canvasCtx.strokeStyle = `#000000${outlineValue}`;
			this.canvasCtx.strokeRect(
				region.x,
				region.y,
				region.width,
				region.height
			);
		}

		// Copy the contents of the working canvas back to the main canvas
		this.canvasCtx.drawImage(this.workingCanvas, region.x, region.y);
	};

	private saveStateToLocalStorage() {
		const userSettings: UserSettings = {
			defaultFilters: {},
		};

		for (const filterKey in this.filters) {
			const filterType = filterKey as FilterType;
			const filter = this.filters[filterType];

			userSettings.defaultFilters[filterType] = parseInt(
				filter.input?.value ?? "0"
			);
		}

		window.localStorage.setItem(
			this.localStorageKey,
			JSON.stringify(userSettings)
		);
	}

	private loadStateFromLocalStorage() {
		const userSettings = JSON.parse(
			window.localStorage.getItem(this.localStorageKey) ?? "0"
		) as UserSettings | undefined;

		if (!userSettings?.defaultFilters) {
			console.info("No defaults saved for user");
			return;
		}
		console.info("Loading default values for user", userSettings);

		for (const filterKey in this.filters) {
			const filterType = filterKey as FilterType;
			const filter = this.filters[filterType];

			filter.default =
				userSettings.defaultFilters[filterType] ?? filter.default;
		}
	}
}

/**
 * Retrieve an image from the clipboard
 *
 * @param ev
 * @returns
 */
function getImageFromClipboard(ev: ClipboardEvent): File | undefined {
	if (!ev.clipboardData?.items) return;

	for (let index = 0; index < ev.clipboardData.items.length; index++) {
		const clipboardItem = ev.clipboardData.items[index];

		if (clipboardItem.type.includes("image")) {
			return clipboardItem.getAsFile() || undefined;
		}
	}
}

/**
 * Copy the contents of a canvas to the clipboard
 * @param canvas
 */
function copyCanvasToClipboard(canvas: HTMLCanvasElement) {
	canvas.toBlob(function (blob) {
		if (!blob) {
			return;
		}
		//@ts-ignore
		const item = new ClipboardItem({ "image/png": blob });
		//@ts-ignore
		navigator.clipboard.write([item]);
	});
}

/**
 * Create a new material icon button
 *
 * @param iconName The name of the icon, corresponding to material icons
 * @param actionText User-facing text describing the button action
 * @param onClick
 * @returns
 */
function createMaterialButton(
	iconName: string,
	actionText: string,
	onClick: (ev: MouseEvent) => void
): HTMLElement {
	const button = document.createElement("button");
	button.classList.add("material-icons");
	button.classList.add("button--small");
	button.title = actionText;
	button.addEventListener("click", (ev) => onClick(ev));
	button.innerText = iconName;
	return button;
}

// Calling the component
function init() {
	const body = document.querySelector<HTMLElement>("body")!;
	const controls = document.querySelector<HTMLElement>(
		".image-editor__controls"
	)!;
	const _ = new ImageEditor(body, controls);

	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("/service-worker.js");
	}
}
init();
