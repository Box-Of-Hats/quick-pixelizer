/**
 * Retrieve an image from the clipboard
 *
 * @param ev
 * @returns
 */

export function getImageFromClipboard(ev: ClipboardEvent): File | undefined {
	if (!ev.clipboardData?.items) return;

	for (let index = 0; index < ev.clipboardData.items.length; index++) {
		const clipboardItem = ev.clipboardData.items[index];

		if (clipboardItem.type.includes("image")) {
			return clipboardItem.getAsFile() || undefined;
		}
	}
}
