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
