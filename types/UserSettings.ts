import { FilterType } from "./FilterType";

export interface UserSettings {
	/**
	 * Default values for filters
	 */
	defaultFilters: {
		[key in FilterType]?: number;
	};
}
