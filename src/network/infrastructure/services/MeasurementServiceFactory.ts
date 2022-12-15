import { MeasurementService } from './MeasurementService';
import { Measurement } from '../database/entities/OrganizationMeasurement';
import NodeMeasurementService from './NodeMeasurementService';
import OrganizationMeasurementService from './OrganizationMeasurementService';
import { inject, injectable, named } from 'inversify';

@injectable()
export class MeasurementServiceFactory {
	constructor(
		@inject('MeasurementService')
		@named('node')
		private nodeMeasurementService: NodeMeasurementService,
		@inject('MeasurementService')
		@named('organization')
		private organizationMeasurementService: OrganizationMeasurementService
	) {}
	create(
		classParameter: new (...args: any[]) => MeasurementService<Measurement>
	): MeasurementService<Measurement> {
		switch (classParameter) {
			case NodeMeasurementService:
				return this.nodeMeasurementService;
			case OrganizationMeasurementService:
				return this.organizationMeasurementService;
		}

		throw new Error('Invalid class parameter');
	}
}
