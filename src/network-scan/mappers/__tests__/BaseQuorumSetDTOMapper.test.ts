import { BaseQuorumSetDTOMapper } from '../BaseQuorumSetDTOMapper';
import { createDummyPublicKey } from '../../domain/node/__fixtures__/createDummyPublicKey';
import { NetworkQuorumSetConfiguration } from '../../domain/network/NetworkQuorumSetConfiguration';

describe('BaseQuorumSetDTOMapper', () => {
	test('fromNetworkQuorumSetConfiguration', () => {
		const publicKey1 = createDummyPublicKey();
		const publicKey2 = createDummyPublicKey();

		const innerInnerQuorumSet = new NetworkQuorumSetConfiguration(
			1,
			[publicKey2],
			[]
		);

		const innerQuorumSet = new NetworkQuorumSetConfiguration(
			2,
			[publicKey1],
			[innerInnerQuorumSet]
		);
		const networkQuorumSetConfiguration = new NetworkQuorumSetConfiguration(
			3,
			[publicKey1, publicKey2],
			[innerQuorumSet]
		);

		const baseQuorumSet =
			BaseQuorumSetDTOMapper.fromNetworkQuorumSetConfiguration(
				networkQuorumSetConfiguration
			);

		expect(baseQuorumSet.threshold).toBe(3);
		expect(baseQuorumSet.validators).toEqual([
			publicKey1.value,
			publicKey2.value
		]);
		expect(baseQuorumSet.innerQuorumSets).toHaveLength(1);
		expect(baseQuorumSet.innerQuorumSets[0].threshold).toBe(2);
		expect(baseQuorumSet.innerQuorumSets[0].validators).toEqual([
			publicKey1.value
		]);
		expect(baseQuorumSet.innerQuorumSets[0].innerQuorumSets).toHaveLength(1);
		expect(baseQuorumSet.innerQuorumSets[0].innerQuorumSets[0].threshold).toBe(
			1
		);
		expect(
			baseQuorumSet.innerQuorumSets[0].innerQuorumSets[0].validators
		).toEqual([publicKey2.value]);
		expect(
			baseQuorumSet.innerQuorumSets[0].innerQuorumSets[0].innerQuorumSets
		).toHaveLength(0);
	});
});
