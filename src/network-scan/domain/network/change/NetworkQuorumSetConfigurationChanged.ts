import { ChildEntity } from 'typeorm';
import { NetworkChange } from './NetworkChange';
import { NetworkId } from '../NetworkId';
import { NetworkQuorumSetConfiguration } from '../NetworkQuorumSetConfiguration';

@ChildEntity()
export class NetworkQuorumSetConfigurationChanged extends NetworkChange {
	constructor(
		networkId: NetworkId,
		time: Date,
		from: NetworkQuorumSetConfiguration,
		to: NetworkQuorumSetConfiguration
	) {
		super(
			networkId,
			time,
			{
				value: from
			},
			{
				value: to
			}
		);
	}
}
