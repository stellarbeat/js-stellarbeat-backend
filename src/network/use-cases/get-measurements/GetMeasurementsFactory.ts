import { inject, injectable, named } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetMeasurements } from './GetMeasurements';
import { MeasuredEntityType } from '../../domain/MeasuredEntityType';
import { TYPES } from '../../infrastructure/di/di-types';
import { NodeMeasurementRepository } from '../../infrastructure/database/repositories/NodeMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../infrastructure/database/repositories/OrganizationMeasurementRepository';

@injectable()
export class GetMeasurementsFactory {
	constructor(
		@inject(TYPES.MeasurementRepository)
		@named(TYPES.TargetNode)
		private nodeMeasurementRepository: NodeMeasurementRepository,
		@inject(TYPES.MeasurementRepository)
		@named(TYPES.TargetOrganization)
		private organizationMeasurementsRepository: OrganizationMeasurementRepository,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	createFor(entityType: MeasuredEntityType): GetMeasurements {
		//todo: type safety with record
		switch (entityType) {
			case 'node':
				return new GetMeasurements(
					this.nodeMeasurementRepository,
					this.exceptionLogger
				);
			case 'organization':
				return new GetMeasurements(
					this.organizationMeasurementsRepository,
					this.exceptionLogger
				);
		}

		throw new Error('Invalid class parameter');
	}
}
