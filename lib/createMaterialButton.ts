/**
 * Create a new material icon button
 *
 * @param iconName The name of the icon, corresponding to material icons
 * @param actionText User-facing text describing the button action
 * @param onClick
 * @returns
 */

export function createMaterialButton(
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
