export class ActiveIndex {
	static get(isActive30DaysPercentage: number): number {
		return isActive30DaysPercentage / 100;
	}
}
