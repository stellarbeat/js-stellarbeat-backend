import { inject, injectable } from 'inversify';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import { NodeMeasurementDayRepository } from './NodeMeasurementDayRepository';
import { OrganizationMeasurementDayRepository } from './OrganizationMeasurementDayRepository';
import { NetworkMeasurementDayRepository } from './NetworkMeasurementDayRepository';
import { NetworkMeasurementMonthRepository } from './NetworkMeasurementMonthRepository';
import { MeasurementAggregation } from './MeasurementAggregation';
import NodeMeasurementDay from './NodeMeasurementDay';
import OrganizationMeasurementDay from './OrganizationMeasurementDay';
import NetworkMeasurementDay from './NetworkMeasurementDay';
import NetworkMeasurementMonth from './NetworkMeasurementMonth';
import { MeasurementAggregationRepository } from './MeasurementAggregationRepository';

@injectable()
export class MeasurementAggregationRepositoryFactory {
	constructor(
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		private nodeMeasurementDayRepository: NodeMeasurementDayRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementDayRepository)
		private organizationMeasurementDayRepository: OrganizationMeasurementDayRepository,
		@inject(NETWORK_TYPES.NetworkMeasurementDayRepository)
		private networkMeasurementDayRepository: NetworkMeasurementDayRepository,
		@inject(NETWORK_TYPES.NetworkMeasurementMonthRepository)
		private networkMeasurementMonthRepository: NetworkMeasurementMonthRepository
	) {}

	createFor(aggregation: {
		new (...params: never): MeasurementAggregation;
	}): MeasurementAggregationRepository<MeasurementAggregation> {
		switch (aggregation) {
			case NodeMeasurementDay:
				return this.nodeMeasurementDayRepository;
			case OrganizationMeasurementDay:
				return this.organizationMeasurementDayRepository;
			case NetworkMeasurementDay:
				return this.networkMeasurementDayRepository;
			case NetworkMeasurementMonth:
				return this.networkMeasurementMonthRepository;
		}

		throw new Error(
			'unsupported MeasurementAggregation: ' + aggregation.toString()
		);
	}
}
