import { ImageEditor } from "./lib";

// Calling the component
function init() {
	const controls = document.querySelector<HTMLElement>(
		".image-editor__controls"
	)!;
	const _ = new ImageEditor(document.body, controls);
}
("Here is something super secret that I dont want you to read");
init();
