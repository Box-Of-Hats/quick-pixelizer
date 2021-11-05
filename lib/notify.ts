export function notify(
	parent: HTMLElement,
	message: string,
	state: "success" | "fail"
) {
	(state === "success" ? console.log : console.error)(message);
	const notification = document.createElement("div");
	notification.innerText = message;
	notification.classList.add("notification");
	notification.classList.add(`notification--${state}`);

	parent.append(notification);

	setTimeout(() => {
		parent.removeChild(notification);
	}, 2000);
}
