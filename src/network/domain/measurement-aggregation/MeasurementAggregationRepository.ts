export interface MeasurementAggregationRepository {
	rollup(fromCrawlId: number, toCrawlId: number): Promise<void>;
}
