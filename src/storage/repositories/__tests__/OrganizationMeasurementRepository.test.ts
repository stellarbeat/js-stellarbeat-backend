import { Container } from 'inversify';
import Kernel from '../../../Kernel';
import { NetworkUpdateRepository } from '../NetworkUpdateRepository';
import { ConfigMock } from '../../../__mocks__/configMock';
import { Connection } from 'typeorm';
import { OrganizationMeasurementRepository } from '../OrganizationMeasurementRepository';
import OrganizationIdStorage, {
	OrganizationIdStorageRepository
} from '../../entities/OrganizationIdStorage';
import NetworkUpdate from '../../entities/NetworkUpdate';
import OrganizationMeasurement from '../../entities/OrganizationMeasurement';

let container: Container;
const kernel = new Kernel();
let networkUpdateRepository: NetworkUpdateRepository;
let organizationMeasurementRepository: OrganizationMeasurementRepository;
let organizationIdStorageRepository: OrganizationIdStorageRepository;
jest.setTimeout(60000); //slow integration tests

beforeEach(async () => {
	await kernel.initializeContainer(new ConfigMock());
	container = kernel.container;
	organizationMeasurementRepository = container.get(
		OrganizationMeasurementRepository
	);
	organizationIdStorageRepository = container.get(
		'OrganizationIdStorageRepository'
	);
	networkUpdateRepository = container.get(NetworkUpdateRepository);
});

afterEach(async () => {
	await container.get(Connection).close();
});
it('should return the correct events', async function () {
	const NetworkUpdate1 = new NetworkUpdate(new Date('01-01-2020'));
	NetworkUpdate1.completed = true;
	const NetworkUpdate2 = new NetworkUpdate(new Date('02-01-2020'));
	NetworkUpdate2.completed = true;
	const NetworkUpdate3 = new NetworkUpdate(new Date('03-01-2020'));
	NetworkUpdate3.completed = true;
	await networkUpdateRepository.save([
		NetworkUpdate1,
		NetworkUpdate3,
		NetworkUpdate2
	]);

	const organizationIdStorage = new OrganizationIdStorage('A');
	await organizationIdStorageRepository.save([organizationIdStorage]);

	const mA1 = new OrganizationMeasurement(
		NetworkUpdate1.time,
		organizationIdStorage
	);
	mA1.isSubQuorumAvailable = true;

	const mA2 = new OrganizationMeasurement(
		NetworkUpdate2.time,
		organizationIdStorage
	);
	mA1.isSubQuorumAvailable = true;
	const mA3 = new OrganizationMeasurement(
		NetworkUpdate3.time,
		organizationIdStorage
	);
	mA1.isSubQuorumAvailable = true;

	await organizationMeasurementRepository.save([mA1, mA2, mA3]);
	const events =
		await organizationMeasurementRepository.findOrganizationMeasurementEventsInXLatestNetworkUpdates(
			2
		);
	expect(events).toHaveLength(1);
	expect(events.filter((event) => event.organizationId === 'A')).toHaveLength(
		1
	);
});
