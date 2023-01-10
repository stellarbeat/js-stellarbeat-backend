export interface Change {
	readonly time: Date;
	readonly from: Record<string, unknown>;
	readonly to: Record<string, unknown>;
}
