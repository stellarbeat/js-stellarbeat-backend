import { NetworkQuorumSetConfiguration } from '../domain/network/NetworkQuorumSetConfiguration';
import { BaseQuorumSet } from '@stellarbeat/js-stellarbeat-shared';

export class BaseQuorumSetDTOMapper {
	static fromNetworkQuorumSetConfiguration(
		networkQuorumSetConfiguration: NetworkQuorumSetConfiguration
	): BaseQuorumSet {
		return {
			threshold: networkQuorumSetConfiguration.threshold,
			validators: networkQuorumSetConfiguration.validators.map(
				(validator) => validator.value
			),
			innerQuorumSets: networkQuorumSetConfiguration.innerQuorumSets.map(
				(innerQuorumSet) =>
					this.fromNetworkQuorumSetConfiguration(innerQuorumSet)
			)
		};
	}
}
