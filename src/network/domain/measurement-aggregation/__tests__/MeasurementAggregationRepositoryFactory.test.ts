import { MeasurementAggregationRepositoryFactory } from '../MeasurementAggregationRepositoryFactory';
import NodeMeasurementDay from '../NodeMeasurementDay';
import { mock } from 'jest-mock-extended';
import { NodeMeasurementDayRepository } from '../NodeMeasurementDayRepository';
import { OrganizationMeasurementDayRepository } from '../OrganizationMeasurementDayRepository';
import { NetworkMeasurementDayRepository } from '../NetworkMeasurementDayRepository';
import { NetworkMeasurementMonthRepository } from '../NetworkMeasurementMonthRepository';
import OrganizationMeasurementDay from '../OrganizationMeasurementDay';
import NetworkMeasurementDay from '../NetworkMeasurementDay';
import NetworkMeasurementMonth from '../NetworkMeasurementMonth';

it('should create correct repo', function () {
	const nodeMeasurementRepo = mock<NodeMeasurementDayRepository>();
	const organizationMeasurementRepo =
		mock<OrganizationMeasurementDayRepository>();
	const networkMeasurementDayRepo = mock<NetworkMeasurementDayRepository>();
	const networkMeasurementMonthRepo = mock<NetworkMeasurementMonthRepository>();
	const repositoryFactory = new MeasurementAggregationRepositoryFactory(
		nodeMeasurementRepo,
		organizationMeasurementRepo,
		networkMeasurementDayRepo,
		networkMeasurementMonthRepo
	);

	const nodeMeasurementDayResult =
		repositoryFactory.createFor(NodeMeasurementDay);
	expect(nodeMeasurementDayResult).toEqual(nodeMeasurementRepo);
	const organizationMeasurementDayResult = repositoryFactory.createFor(
		OrganizationMeasurementDay
	);
	expect(organizationMeasurementDayResult).toEqual(organizationMeasurementRepo);
	const networkMeasurementDayResult = repositoryFactory.createFor(
		NetworkMeasurementDay
	);
	expect(networkMeasurementDayResult).toEqual(networkMeasurementDayRepo);
	const networkMeasurementMonthResult = repositoryFactory.createFor(
		NetworkMeasurementMonth
	);
	expect(networkMeasurementMonthResult).toEqual(networkMeasurementMonthRepo);
});
