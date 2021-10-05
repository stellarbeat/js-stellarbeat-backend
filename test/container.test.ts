import { NodeMeasurementV2Repository } from '../src/repositories/NodeMeasurementV2Repository';
import { Connection, Repository } from 'typeorm';
import NodeSnapShotter from '../src/services/SnapShotting/NodeSnapShotter';
import OrganizationSnapShotter from '../src/services/SnapShotting/OrganizationSnapShotter';
import { CrawlResultProcessor } from '../src/services/CrawlResultProcessor';
import CrawlV2Service from '../src/services/CrawlV2Service';
import Kernel from '../src/Kernel';
import { ConfigMock } from './configMock';

test('container', async () => {
	jest.setTimeout(10000); //slow and long integration test
	const kernel = new Kernel();
	await kernel.initializeContainer(new ConfigMock());
	const container = kernel.container;
	expect(container.get(NodeMeasurementV2Repository)).toBeInstanceOf(
		NodeMeasurementV2Repository
	);
	expect(container.get(Connection)).toBeInstanceOf(Connection);
	expect(container.get('OrganizationIdStorageRepository')).toBeInstanceOf(
		Repository
	);
	expect(container.get(NodeSnapShotter)).toBeInstanceOf(NodeSnapShotter);
	expect(container.get(OrganizationSnapShotter)).toBeInstanceOf(
		OrganizationSnapShotter
	);
	expect(container.get(CrawlResultProcessor)).toBeInstanceOf(
		CrawlResultProcessor
	);
	expect(container.get(CrawlV2Service)).toBeInstanceOf(CrawlV2Service);

	await container.get(Connection).close();
});
