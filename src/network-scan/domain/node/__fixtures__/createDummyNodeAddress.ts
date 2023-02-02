import { NodeAddress } from '../NodeAddress';

export function createDummyNodeAddress() {
	const nodeAddress = NodeAddress.create('127.0.0.1', 11625);
	if (nodeAddress.isErr()) {
		throw new Error('Invalid node address');
	}
	return nodeAddress.value;
}
