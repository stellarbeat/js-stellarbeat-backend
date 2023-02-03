import { NodeAddress } from '../../domain/node/NodeAddress';
import { Result } from 'neverthrow';

export class NodeAddressMapper {
	static mapToNodeAddresses(
		nodeAddressDTOs: [string, number][]
	): Result<NodeAddress[], Error> {
		return Result.combine(
			nodeAddressDTOs.map((peer) => {
				return NodeAddress.create(peer[0], peer[1]);
			})
		);
	}
}
