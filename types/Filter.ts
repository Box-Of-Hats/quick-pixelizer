export interface Filter {
	min: number;
	max: number;
	step: number;
	label: string;
	input?: HTMLInputElement;
	getString: (value: string) => string;
	default: number;
	icon: string;
}
