import { ValidatorDemoter } from '../ValidatorDemoter';
import { mock } from 'jest-mock-extended';
import { Logger } from '../../../../../core/services/PinoLogger';
import { NodeMeasurementDayRepository } from '../../NodeMeasurementDayRepository';
import { createDummyNode } from '../../__fixtures__/createDummyNode';
import NodeQuorumSet from '../../NodeQuorumSet';
import {
	Edge,
	QuorumSet,
	TrustGraph,
	Vertex
} from '@stellarbeat/js-stellarbeat-shared';
import { StronglyConnectedComponentsFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/strongly-connected-components-finder';
import { NetworkTransitiveQuorumSetFinder } from '@stellarbeat/js-stellarbeat-shared/lib/trust-graph/network-transitive-quorum-set-finder';
import { NodeScan } from '../../scan/NodeScan';
import NodeMeasurement from '../../NodeMeasurement';

describe('ValidatorDemoter', () => {
	function setupSUT() {
		const logger = mock<Logger>();
		const nodeMeasurementDayRepository = mock<NodeMeasurementDayRepository>();

		const demoter = new ValidatorDemoter(nodeMeasurementDayRepository, logger);
		const validator = createDummyNode();
		validator.updateQuorumSet(
			NodeQuorumSet.create('key', new QuorumSet(1, ['dummy'], [])),
			new Date()
		);
		const watcher = createDummyNode();
		const connectedValidator1 = createDummyNode();
		const connectedValidator2 = createDummyNode();
		connectedValidator1.updateQuorumSet(
			NodeQuorumSet.create(
				'key',
				new QuorumSet(1, [connectedValidator2.publicKey.value], [])
			),
			new Date()
		);
		connectedValidator2.updateQuorumSet(
			NodeQuorumSet.create(
				'key',
				new QuorumSet(1, [connectedValidator1.publicKey.value], [])
			),
			new Date()
		);

		const trustGraph = new TrustGraph(
			new StronglyConnectedComponentsFinder(),
			new NetworkTransitiveQuorumSetFinder()
		);

		const validatorVertex = new Vertex(
			validator.publicKey.value,
			'validator',
			0
		);
		const watcherVertex = new Vertex(watcher.publicKey.value, 'watcher', 0);
		const connectedValidator1Vertex = new Vertex(
			connectedValidator1.publicKey.value,
			'validator',
			0
		);
		const connectedValidator2Vertex = new Vertex(
			connectedValidator2.publicKey.value,
			'validator',
			0
		);
		trustGraph.addVertex(validatorVertex);
		trustGraph.addVertex(watcherVertex);
		trustGraph.addVertex(connectedValidator1Vertex);
		trustGraph.addVertex(connectedValidator2Vertex);

		trustGraph.addEdge(
			new Edge(connectedValidator1Vertex, connectedValidator2Vertex)
		);
		trustGraph.addEdge(
			new Edge(connectedValidator2Vertex, connectedValidator1Vertex)
		);

		nodeMeasurementDayRepository.findXDaysActiveButNotValidating.mockResolvedValue(
			[
				{
					publicKey: validator.publicKey.value
				},
				{
					publicKey: watcher.publicKey.value
				}
			]
		);
		const time = new Date();
		const nodeScan = new NodeScan(time, [
			validator,
			watcher,
			connectedValidator1,
			connectedValidator2
		]);

		return {
			nodeScan,
			demoter,
			logger,
			nodeMeasurementDayRepository,
			inactiveValidator: validator,
			watcher,
			trustGraph,
			validatorVertex,
			watcherVertex,
			connectedValidator1,
			connectedValidator2,
			connectedValidator1Vertex
		};
	}

	it('should not demote a validator that is historically inactive but not in the latest scan', async function () {
		const { demoter, inactiveValidator, nodeScan, trustGraph } = setupSUT();
		const inactiveValidatorMeasurement = new NodeMeasurement(
			nodeScan.time,
			inactiveValidator
		);
		inactiveValidatorMeasurement.isValidating = true;
		inactiveValidatorMeasurement.isActive = true;

		inactiveValidator.addMeasurement(inactiveValidatorMeasurement);

		await demoter.demote(nodeScan, trustGraph, 7);

		expect(inactiveValidator.quorumSet).not.toBeNull();
	});

	//write tests for demote function in ValidatorDemoter
	it('should demote non validating validator that is not trusted by other nodes', async () => {
		const {
			demoter,
			nodeMeasurementDayRepository,
			inactiveValidator,
			nodeScan,
			trustGraph,
			connectedValidator1,
			connectedValidator2
		} = setupSUT();
		const inactiveValidatorMeasurement = new NodeMeasurement(
			nodeScan.time,
			inactiveValidator
		);
		inactiveValidatorMeasurement.isValidating = false;
		inactiveValidatorMeasurement.isActive = true;
		inactiveValidator.addMeasurement(inactiveValidatorMeasurement);

		await demoter.demote(nodeScan, trustGraph, 7);

		expect(
			nodeMeasurementDayRepository.findXDaysActiveButNotValidating
		).toBeCalledWith(nodeScan.time, 7);

		expect(inactiveValidator.quorumSet).toBeNull();
		expect(connectedValidator1.quorumSet).not.toBeNull();
		expect(connectedValidator2.quorumSet).not.toBeNull();
	});

	it('should not demote a non-validating validator that is trusted by other nodes', async function () {
		const {
			demoter,
			trustGraph,
			inactiveValidator,
			validatorVertex,
			connectedValidator1Vertex,
			nodeScan
		} = setupSUT();
		const inactiveValidatorMeasurement = new NodeMeasurement(
			nodeScan.time,
			inactiveValidator
		);
		inactiveValidatorMeasurement.isValidating = false;
		inactiveValidatorMeasurement.isActive = true;

		inactiveValidator.addMeasurement(inactiveValidatorMeasurement);

		trustGraph.addEdge(new Edge(connectedValidator1Vertex, validatorVertex));

		await demoter.demote(nodeScan, trustGraph, 7);
		expect(inactiveValidator.quorumSet).not.toBeNull();
	});

	it('should demote a node with no vertex in the trust graph', async function () {
		const { demoter, nodeScan, inactiveValidator } = setupSUT();

		const trustGraph = new TrustGraph(
			new StronglyConnectedComponentsFinder(),
			new NetworkTransitiveQuorumSetFinder()
		);

		await demoter.demote(nodeScan, trustGraph, 7);
		expect(inactiveValidator.quorumSet).toBeNull();
	});
});
