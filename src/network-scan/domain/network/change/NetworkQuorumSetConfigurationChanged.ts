import { ChildEntity } from 'typeorm';
import { NetworkChange } from './NetworkChange';
import { NetworkId } from '../NetworkId';
import { QuorumSet } from '../QuorumSet';

@ChildEntity()
export class NetworkQuorumSetConfigurationChanged extends NetworkChange {
	constructor(
		networkId: NetworkId,
		time: Date,
		from: QuorumSet,
		to: QuorumSet
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
