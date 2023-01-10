import { ChildEntity } from 'typeorm';
import { NetworkChange } from './NetworkChange';
import { NetworkId } from '../NetworkId';
import { StellarCoreVersion } from '../StellarCoreVersion';

@ChildEntity()
export class NetworkStellarCoreVersionChanged extends NetworkChange {
	constructor(
		networkId: NetworkId,
		time: Date,
		from: StellarCoreVersion,
		to: StellarCoreVersion
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
