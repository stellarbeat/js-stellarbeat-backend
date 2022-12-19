import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetMeasurements } from './GetMeasurements';
import { NodeMeasurementRepository } from '../../infrastructure/database/repositories/NodeMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../infrastructure/database/repositories/OrganizationMeasurementRepository';
import { Measurement } from '../../domain/measurement/Measurement';
import NodeMeasurement from '../../domain/measurement/NodeMeasurement';
import OrganizationMeasurement from '../../domain/measurement/OrganizationMeasurement';
import NetworkMeasurement from '../../domain/measurement/NetworkMeasurement';
import { NetworkMeasurementRepository } from '../../infrastructure/database/repositories/NetworkMeasurementRepository';

//todo: should be MeasurementRepositoryFactory, not GetMeasurementsFactory
@injectable()
export class GetMeasurementsFactory {
	constructor(
		private nodeMeasurementRepository: NodeMeasurementRepository,
		private networkMeasurementRepository: NetworkMeasurementRepository,
		private organizationMeasurementsRepository: OrganizationMeasurementRepository,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	createFor(measurement: {
		new (...params: any): Measurement;
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
