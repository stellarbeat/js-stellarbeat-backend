import { inject, injectable } from 'inversify';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import { NodeMeasurementDayRepository } from '../node/NodeMeasurementDayRepository';
import { OrganizationMeasurementDayRepository } from '../organization/OrganizationMeasurementDayRepository';
import { NetworkMeasurementDayRepository } from '../network/NetworkMeasurementDayRepository';
import { NetworkMeasurementMonthRepository } from '../network/NetworkMeasurementMonthRepository';
import { MeasurementAggregation } from './MeasurementAggregation';
import NodeMeasurementDay from '../node/NodeMeasurementDay';
import OrganizationMeasurementDay from '../organization/OrganizationMeasurementDay';
import NetworkMeasurementDay from '../network/NetworkMeasurementDay';
import NetworkMeasurementMonth from '../network/NetworkMeasurementMonth';
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
