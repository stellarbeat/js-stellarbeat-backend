import { CrawlerDTOMapper } from '../CrawlerDTOMapper';
import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellarbeat-shared';
import { createDummyNode } from '../../../__fixtures__/createDummyNode';
import { createDummyNodeAddress } from '../../../__fixtures__/createDummyNodeAddress';
import NodeQuorumSet from '../../../NodeQuorumSet';

describe('CrawlerMapper', () => {
	test('mapNodeAddressesToNodeAddressDTOs', () => {
		const nodeAddress1 = createDummyNodeAddress();
		const nodeAddress2 = createDummyNodeAddress();

		const nodeAddressDTOs = CrawlerDTOMapper.mapNodeAddressesToNodeAddressDTOs([
			nodeAddress1,
			nodeAddress2
		]);

		expect(nodeAddressDTOs).toHaveLength(2);
		expect(nodeAddressDTOs[0][0]).toEqual(nodeAddress1.ip);
		expect(nodeAddressDTOs[0][1]).toEqual(nodeAddress1.port);
		expect(nodeAddressDTOs[1][0]).toEqual(nodeAddress2.ip);
		expect(nodeAddressDTOs[1][1]).toEqual(nodeAddress2.port);
	});

	test('mapNodeToNodeAddressDTOs', () => {
		const node1 = createDummyNode();
		const node2 = createDummyNode();

		const nodeAddressDTOs = CrawlerDTOMapper.mapNodeToNodeAddressDTOs([
			node1,
			node2
		]);

		expect(nodeAddressDTOs).toHaveLength(2);
		expect(nodeAddressDTOs[0][0]).toEqual(node1.ip);
		expect(nodeAddressDTOs[0][1]).toEqual(node1.port);
		expect(nodeAddressDTOs[1][0]).toEqual(node2.ip);
		expect(nodeAddressDTOs[1][1]).toEqual(node2.port);
	});

	test('createQuorumSetDTOMap', () => {
		const time = new Date();
		const node1 = createDummyNode();
		const quorumSet1 = new QuorumSetDTO(2, ['a', 'b']);
		node1.updateQuorumSet(NodeQuorumSet.create('key1', quorumSet1), time);
		const node2 = createDummyNode();
		const quorumSet2 = new QuorumSetDTO(2, ['c', 'd']);
		node2.updateQuorumSet(NodeQuorumSet.create('key2', quorumSet2), time);

		const quorumSetDTOMap = CrawlerDTOMapper.createQuorumSetDTOMap([
			node1,
			node2
		]);

		expect(quorumSetDTOMap.size).toEqual(2);
		expect(quorumSetDTOMap.get('key1')).toEqual(quorumSet1);
		expect(quorumSetDTOMap.get('key2')).toEqual(quorumSet2);
	});

	describe('toLedgerDTO', () => {
		it('should map to LedgerDTO', function () {
			const ledger = BigInt(1);
			const closeTime = new Date();

			const ledgerDTO = CrawlerDTOMapper.toLedgerDTO(ledger, closeTime);

			expect(ledgerDTO?.sequence).toEqual(ledger);
			expect(ledgerDTO?.closeTime).toEqual(closeTime);
		});

		it('should return undefined if ledger is null', function () {
			const ledger = null;
			const closeTime = new Date();

			const ledgerDTO = CrawlerDTOMapper.toLedgerDTO(ledger, closeTime);

			expect(ledgerDTO).toBeUndefined();
		});

		it('should return undefined if closeTime is null', function () {
			const ledger = BigInt(1);
			const closeTime = null;

			const ledgerDTO = CrawlerDTOMapper.toLedgerDTO(ledger, closeTime);

			expect(ledgerDTO).toBeUndefined();
		});
	});
});
