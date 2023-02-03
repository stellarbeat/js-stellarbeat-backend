import { NodeAddressMapper } from '../NodeAddressMapper';

describe('NodeAddressMapper', () => {
	test('should map to node addresses', () => {
		const nodeAddressDTOs: [string, number][] = [
			['127.0.0.1', 1],
			['127.0.0.2', 2]
		];

		const result = NodeAddressMapper.mapToNodeAddresses(nodeAddressDTOs);
		expect(result.isOk()).toBe(true);
		if (result.isErr()) return;
		expect(result.value).toHaveLength(2);
		expect(result.value[0].ip).toBe('127.0.0.1');
		expect(result.value[0].port).toBe(1);
		expect(result.value[1].ip).toBe('127.0.0.2');
		expect(result.value[1].port).toBe(2);
	});

	test('should return error when node address is invalid', () => {
		const nodeAddressDTOs: [string, number][] = [
			['127.0.0.1', 1],
			['127.0.0.2', -2]
		];

		const result = NodeAddressMapper.mapToNodeAddresses(nodeAddressDTOs);
		expect(result.isErr()).toBe(true);
	});
});
