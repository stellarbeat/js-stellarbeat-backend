export interface MeasurementRollupRepository {
	rollup(fromCrawlId: number, toCrawlId: number): Promise<void>;
}
