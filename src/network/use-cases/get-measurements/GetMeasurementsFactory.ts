import { MeasurementService } from '../../infrastructure/services/MeasurementService';
import { inject, injectable, named } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import NodeMeasurementService from '../../infrastructure/services/NodeMeasurementService';
import { GetMeasurements } from './GetMeasurements';
import OrganizationMeasurementService from '../../infrastructure/services/OrganizationMeasurementService';
import { Measurement } from '../../infrastructure/database/entities/OrganizationMeasurement';
import { MeasuredEntityType } from '../../domain/MeasuredEntityType';

@injectable()
export class GetMeasurementsFactory {
	constructor(
		@inject('MeasurementService')
		@named('node')
		private nodeMeasurementService: NodeMeasurementService,
		@inject('MeasurementService')
		@named('organization')
		private organizationMeasurementService: OrganizationMeasurementService,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	createFor(entityType: MeasuredEntityType): GetMeasurements<Measurement> {
		//todo: type safety with record
		switch (entityType) {
			case 'node':
				return new GetMeasurements(
					this.nodeMeasurementService,
					this.exceptionLogger
				);
			case 'organization':
				return new GetMeasurements(
					this.organizationMeasurementService,
					this.exceptionLogger
				);
		}

		throw new Error('Invalid class parameter');
	}
}
