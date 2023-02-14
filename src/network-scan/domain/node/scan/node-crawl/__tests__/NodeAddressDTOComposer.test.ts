import { createDummyNode } from '../../../__fixtures__/createDummyNode';
import { createDummyNodeAddress } from '../../../__fixtures__/createDummyNodeAddress';
import { NetworkQuorumSetConfiguration } from '../../../../network/NetworkQuorumSetConfiguration';
import { NodeAddressDTOComposer } from '../NodeAddressDTOComposer';

describe('NodeAddressDTOComposer', () => {
	test('compose', () => {
		const node1 = createDummyNode();
		const node2 = createDummyNode();
		const node3 = createDummyNode();
		const node4 = createDummyNode();

		const bootstrapNodeAddress = createDummyNodeAddress();

		const networkQuorumSet = new NetworkQuorumSetConfiguration(
			1,
			[node1.publicKey],
			[]
		);

		const nodes = [node3, node4, node2, node1];

		const nodeAddressDTOs = NodeAddressDTOComposer.compose(
			nodes,
			[bootstrapNodeAddress],
			networkQuorumSet
		);

		expect(nodeAddressDTOs.length).toBe(5);
		assertNodeInNetworkQuorumSetIsFirst();
		assertBootstrappedAddressIsLast(4);

		function assertNodeInNetworkQuorumSetIsFirst() {
			expect(nodeAddressDTOs[0][0]).toBe(node1.ip);
			expect(nodeAddressDTOs[0][1]).toBe(node1.port);
		}
		function assertBootstrappedAddressIsLast(lastIndex: number) {
			expect(nodeAddressDTOs[lastIndex][0]).toBe(bootstrapNodeAddress.ip);
			expect(nodeAddressDTOs[lastIndex][1]).toBe(bootstrapNodeAddress.port);
		}
	});
});
