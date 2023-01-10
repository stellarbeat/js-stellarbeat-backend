export enum AggregationTarget { //FUTURE: should map result DTO. For example NodeMeasurementDayDTO.
	// For now a simple toJSON is returned, but when api changes we could have to support multiple versions of result DTOs
	NodeDay,
	OrganizationDay,
	NetworkDay,
	NetworkMonth
}

export interface GetMeasurementAggregationsDTO {
	aggregationTarget: AggregationTarget;
	id: string;
	from: Date;
	to: Date;
}
