import { ValidatorDemoter } from '../ValidatorDemoter';
import { mock } from 'jest-mock-extended';
import { NodeRepository } from '../../NodeRepository';
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

describe('ValidatorDemoter', () => {
	function setupSUT() {
		const nodeRepository = mock<NodeRepository>();
		const logger = mock<Logger>();
		const nodeMeasurementDayRepository = mock<NodeMeasurementDayRepository>();

		const demoter = new ValidatorDemoter(
			nodeMeasurementDayRepository,
			nodeRepository,
			logger
		);
		const validator = createDummyNode();
		validator.updateQuorumSet(
			NodeQuorumSet.create('key', new QuorumSet(1, ['dummy'], [])),
			new Date()
		);
		const watcher = createDummyNode();
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
		trustGraph.addVertex(validatorVertex);
		trustGraph.addVertex(watcherVertex);

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

		nodeRepository.findActiveByPublicKey.mockResolvedValue([
			validator,
			watcher
		]);

		return {
			demoter,
			nodeRepository,
			logger,
			nodeMeasurementDayRepository,
			validator,
			watcher,
			trustGraph,
			validatorVertex,
			watcherVertex
		};
	}

	//write tests for demote function in ValidatorDemoter
	it('should demote non validating validator that is not trusted by other nodes', async () => {
		const {
			demoter,
			nodeRepository,
			nodeMeasurementDayRepository,
			validator,
			watcher,
			trustGraph
		} = setupSUT();

		const time = new Date();
		await demoter.demote(time, trustGraph, 7);

		expect(
			nodeMeasurementDayRepository.findXDaysActiveButNotValidating
		).toBeCalledWith(time, 7);

		expect(nodeRepository.findActiveByPublicKey).toBeCalledWith([
			validator.publicKey.value,
			watcher.publicKey.value
		]);

		expect(nodeRepository.save).toBeCalledWith([validator], time);
		expect(validator.quorumSet).toBeNull();
	});

	it('should not demote a non-validating validator that is trusted by other nodes', async function () {
		const {
			demoter,
			nodeRepository,
			trustGraph,
			validatorVertex,
			watcherVertex
		} = setupSUT();

		trustGraph.addEdge(new Edge(watcherVertex, validatorVertex));

		await demoter.demote(new Date(), trustGraph, 7);
		expect(nodeRepository.save).toBeCalledTimes(0);
	});

	it('should not demote a validator with no vertex in the trust graph', async function () {
		const { demoter, nodeRepository } = setupSUT();

		const trustGraph = new TrustGraph(
			new StronglyConnectedComponentsFinder(),
			new NetworkTransitiveQuorumSetFinder()
		);

		await demoter.demote(new Date(), trustGraph, 7);
		expect(nodeRepository.save).toBeCalledTimes(0);
	});
});
