import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetMeasurements } from './GetMeasurements';
import { Measurement } from '../../domain/measurement/Measurement';
import NodeMeasurement from '../../domain/node/NodeMeasurement';
import OrganizationMeasurement from '../../domain/organization/OrganizationMeasurement';
import NetworkMeasurement from '../../domain/network/NetworkMeasurement';
import { NodeMeasurementRepository } from '../../domain/node/NodeMeasurementRepository';
import { NetworkMeasurementRepository } from '../../domain/network/NetworkMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../domain/organization/OrganizationMeasurementRepository';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';

//todo: should be MeasurementRepositoryFactory, not GetMeasurementsFactory, and should be moved to domain
@injectable()
export class GetMeasurementsFactory {
	constructor(
		@inject(NETWORK_TYPES.NodeMeasurementRepository)
		private nodeMeasurementRepository: NodeMeasurementRepository,
		@inject(NETWORK_TYPES.NetworkMeasurementRepository)
		private networkMeasurementRepository: NetworkMeasurementRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementRepository)
		private organizationMeasurementsRepository: OrganizationMeasurementRepository,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	createFor(measurement: {
		new (...params: never): Measurement;
	}): GetMeasurements {
		//todo: type safety with record
		switch (measurement) {
			case NodeMeasurement:
				return new GetMeasurements(
					this.nodeMeasurementRepository,
					this.exceptionLogger
				);
			case OrganizationMeasurement:
				return new GetMeasurements(
					this.organizationMeasurementsRepository,
					this.exceptionLogger
				);
			case NetworkMeasurement:
				return new GetMeasurements(
					this.networkMeasurementRepository,
					this.exceptionLogger
				);
		}

		throw new Error('Invalid class parameter');
	}
}
