/**
 * Index for node type (full validator, basic validator or watcher node)
 */
export class TypeIndex {
	static get(hasUpToDateHistoryArchive: boolean, isValidator: boolean): number {
		if (hasUpToDateHistoryArchive) {
			return 1;
		}
		if (isValidator) {
			return 0.7;
		}

		return 0.3;
	}
}
