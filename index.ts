import { ImageEditor } from "./lib";

// Calling the component
function init() {
	const body = document.querySelector<HTMLElement>("body")!;
	const controls = document.querySelector<HTMLElement>(
		".image-editor__controls"
	)!;
	const _ = new ImageEditor(body, controls);
}
init();
