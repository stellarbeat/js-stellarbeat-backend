import { MeasurementAggregationRepositoryFactory } from '../MeasurementAggregationRepositoryFactory';
import NodeMeasurementDay from '../../node/NodeMeasurementDay';
import { mock } from 'jest-mock-extended';
import { NodeMeasurementDayRepository } from '../../node/NodeMeasurementDayRepository';
import { OrganizationMeasurementDayRepository } from '../../organization/OrganizationMeasurementDayRepository';
import { NetworkMeasurementDayRepository } from '../../network/NetworkMeasurementDayRepository';
import { NetworkMeasurementMonthRepository } from '../../network/NetworkMeasurementMonthRepository';
import OrganizationMeasurementDay from '../../organization/OrganizationMeasurementDay';
import NetworkMeasurementDay from '../../network/NetworkMeasurementDay';
import NetworkMeasurementMonth from '../../network/NetworkMeasurementMonth';

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
