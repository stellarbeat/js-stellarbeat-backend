import { Container } from 'inversify';
import Kernel from '../../../../../core/infrastructure/Kernel';
import NodeMeasurement from '../../../../domain/node/NodeMeasurement';
import { ConfigMock } from '../../../../../core/config/__mocks__/configMock';
import { NodeMeasurementRepository } from '../../../../domain/node/NodeMeasurementRepository';
import { NETWORK_TYPES } from '../../../di/di-types';
import { createDummyNode } from '../../../../domain/node/__fixtures__/createDummyNode';
import { NodeRepository } from '../../../../domain/node/NodeRepository';
import Node from '../../../../domain/node/Node';
import NetworkScan from '../../../../domain/network/scan/NetworkScan';
import { NetworkScanRepository } from '../../../../domain/network/scan/NetworkScanRepository';
import NetworkMeasurement from '../../../../domain/network/NetworkMeasurement';

describe('test queries', () => {
	let container: Container;
	let kernel: Kernel;
	let nodeMeasurementRepository: NodeMeasurementRepository;
	let nodeRepository: NodeRepository;
	jest.setTimeout(60000); //slow integration tests

	beforeEach(async () => {
		kernel = await Kernel.getInstance(new ConfigMock());
		container = kernel.container;
		nodeMeasurementRepository = container.get<NodeMeasurementRepository>(
			NETWORK_TYPES.NodeMeasurementRepository
		);
		nodeRepository = container.get(NETWORK_TYPES.NodeRepository);
	});

	afterEach(async () => {
		await kernel.close();
	});

	test('findBetween', async () => {
		const result = await nodeMeasurementRepository.findBetween(
			'a',
			new Date(),
			new Date()
		);
		expect(result).toEqual([]);
	});

	test('findInactiveAt', async () => {
		const node = createDummyNode();
		const nodeActive = createDummyNode();
		const nodeOtherTime = createDummyNode();
		await nodeRepository.save([node], new Date('12/12/2020'));
		await nodeRepository.save(
			[nodeActive, nodeOtherTime],
			new Date('12/12/2020')
		);
		const time = new Date();
		const measurement = new NodeMeasurement(time, node);
		measurement.isActive = false;
		const measurementActive = new NodeMeasurement(time, nodeActive);
		measurementActive.isActive = true;
		const measurementOtherTime = new NodeMeasurement(
			new Date('12/12/2020'),
			nodeOtherTime
		);
		measurementOtherTime.isActive = false;
		await nodeMeasurementRepository.save([
			measurement,
			measurementActive,
			measurementOtherTime
		]);
		const measurements = await nodeMeasurementRepository.findInactiveAt(time);
		expect(measurements.length).toEqual(1);
		expect(measurements[0].nodeId).toEqual(1);
	});

	test('findBetween', async () => {
		const idA = createDummyNode();
		const idB = createDummyNode();
		await nodeRepository.save([idA, idB], new Date('12/12/2020'));
		await nodeMeasurementRepository.save([
			new NodeMeasurement(new Date('12/12/2020'), idA),
			new NodeMeasurement(new Date('12/12/2020'), idB),
			new NodeMeasurement(new Date('12/13/2020'), idA),
			new NodeMeasurement(new Date('12/13/2020'), idB)
		]);

		const measurements = await nodeMeasurementRepository.findBetween(
			idA.publicKey.value,
			new Date('12/12/2020'),
			new Date('12/13/2020')
		);
		expect(measurements.length).toEqual(2);
		expect(measurements[0].node.publicKey.value).toEqual(idA.publicKey.value);
	});

	function createNodeMeasurement(
		time: Date,
		node: Node,
		isActive: boolean,
		isValidating: boolean,
		isFullValidator: boolean,
		connectivityError: boolean,
		stellarCoreVersionBehind: boolean = false
	): NodeMeasurement {
		const measurement = new NodeMeasurement(time, node);
		measurement.isActive = isActive;
		measurement.isValidating = isValidating;
		measurement.isFullValidator = isFullValidator;
		measurement.connectivityError = connectivityError;
		measurement.stellarCoreVersionBehind = stellarCoreVersionBehind;
		return measurement;
	}

	test('findEventsForXNetworkScans', async () => {
		const networkScan1 = new NetworkScan(new Date('12/12/2020'));
		networkScan1.completed = true;
		networkScan1.measurement = new NetworkMeasurement(new Date('12/12/2020'));
		const networkScan2 = new NetworkScan(new Date('12/13/2020'));
		networkScan2.completed = true;
		networkScan2.measurement = new NetworkMeasurement(new Date('12/13/2020'));
		const networkScan3 = new NetworkScan(new Date('12/14/2020'));
		networkScan3.completed = true;
		networkScan3.measurement = new NetworkMeasurement(new Date('12/14/2020'));
		const networkScan4 = new NetworkScan(new Date('12/15/2020'));
		networkScan4.completed = true;
		networkScan4.measurement = new NetworkMeasurement(new Date('12/15/2020'));

		await container
			.get<NetworkScanRepository>(NETWORK_TYPES.NetworkScanRepository)
			.save([networkScan1, networkScan2, networkScan3, networkScan4]);

		const nodeANoIssues = createDummyNode();
		const nodeAMeasurement1 = createNodeMeasurement(
			new Date('12/12/2020'),
			nodeANoIssues,
			true,
			true,
			true,
			false
		);
		const nodeAMeasurement2 = createNodeMeasurement(
			new Date('12/13/2020'),
			nodeANoIssues,
			true,
			true,
			true,
			false
		);
		const nodeAMeasurement3 = createNodeMeasurement(
			new Date('12/14/2020'),
			nodeANoIssues,
			true,
			true,
			true,
			false
		);
		const nodeAMeasurement4 = createNodeMeasurement(
			new Date('12/15/2020'),
			nodeANoIssues,
			true,
			true,
			true,
			false
		);
		const nodeBAllIssues = createDummyNode();
		const nodeBMeasurement1 = createNodeMeasurement(
			new Date('12/12/2020'),
			nodeBAllIssues,
			true,
			true,
			true,
			false,
			false
		);
		const nodeBMeasurement2 = createNodeMeasurement(
			new Date('12/13/2020'),
			nodeBAllIssues,
			false,
			false,
			false,
			true,
			true
		);
		const nodeBMeasurement3 = createNodeMeasurement(
			new Date('12/14/2020'),
			nodeBAllIssues,
			false,
			false,
			false,
			true,
			true
		);
		const nodeBMeasurement4 = createNodeMeasurement(
			new Date('12/15/2020'),
			nodeBAllIssues,
			false,
			false,
			false,
			true,
			true
		);

		const nodeCIssuesJustStartedButNoEvent = createDummyNode();
		const nodeCMeasurement1 = createNodeMeasurement(
			new Date('12/12/2020'),
			nodeCIssuesJustStartedButNoEvent,
			true,
			true,
			true,
			false
		);
		const nodeCMeasurement2 = createNodeMeasurement(
			new Date('12/13/2020'),
			nodeCIssuesJustStartedButNoEvent,
			true,
			true,
			true,
			false
		);
		const nodeCMeasurement3 = createNodeMeasurement(
			new Date('12/14/2020'),
			nodeCIssuesJustStartedButNoEvent,
			true,
			true,
			true,
			false
		);
		const nodeCMeasurement4 = createNodeMeasurement(
			new Date('12/15/2020'),
			nodeCIssuesJustStartedButNoEvent,
			false,
			false,
			false,
			true,
			true
		);

		await nodeRepository.save(
			[nodeANoIssues, nodeBAllIssues, nodeCIssuesJustStartedButNoEvent],
			new Date('12/12/2020')
		);
		await nodeMeasurementRepository.save([
			nodeAMeasurement1,
			nodeAMeasurement2,
			nodeAMeasurement3,
			nodeAMeasurement4,
			nodeBMeasurement1,
			nodeBMeasurement2,
			nodeBMeasurement3,
			nodeBMeasurement4,
			nodeCMeasurement1,
			nodeCMeasurement2,
			nodeCMeasurement3,
			nodeCMeasurement4
		]);

		const events = await nodeMeasurementRepository.findEventsForXNetworkScans(
			3,
			new Date('12/15/2020')
		);
		expect(events.length).toEqual(1);
		expect(events[0].publicKey).toEqual(nodeBAllIssues.publicKey.value);
		expect(events[0].connectivityIssues).toEqual(true);
		expect(events[0].historyOutOfDate).toEqual(true);
		expect(events[0].inactive).toEqual(true);
		expect(events[0].notValidating).toEqual(true);
		expect(events[0].stellarCoreVersionBehindIssue).toEqual(true);
		expect(new Date(events[0].time).getTime()).toEqual(
			new Date('12/15/2020').getTime()
		);
	});

	test('create measurement with max lag', async () => {
		const node = createDummyNode();
		await nodeRepository.save([node], new Date());
		const nodeMeasurement = new NodeMeasurement(new Date(), node);
		nodeMeasurement.lag = 32768;
		await nodeMeasurementRepository.save([nodeMeasurement]);
		expect(nodeMeasurement.lag).toBe(32767);
	});
});
