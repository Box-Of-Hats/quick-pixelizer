/**
 * Copy the contents of a canvas to the clipboard
 * @param canvas
 */

export function copyCanvasToClipboard(canvas: HTMLCanvasElement) {
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
