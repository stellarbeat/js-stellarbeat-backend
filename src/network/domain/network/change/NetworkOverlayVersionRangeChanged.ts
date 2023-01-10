import { ChildEntity } from 'typeorm';
import { NetworkChange } from './NetworkChange';
import { NetworkId } from '../NetworkId';
import { OverlayVersionRange } from '../OverlayVersionRange';

@ChildEntity()
export class NetworkOverlayVersionRangeChanged extends NetworkChange {
	constructor(
		networkId: NetworkId,
		time: Date,
		from: OverlayVersionRange,
		to: OverlayVersionRange
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
