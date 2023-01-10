import { ChildEntity } from 'typeorm';
import { NetworkChange } from './NetworkChange';
import { NetworkId } from '../NetworkId';

@ChildEntity()
export class NetworkMaxLedgerVersionChanged extends NetworkChange {
	constructor(networkId: NetworkId, time: Date, from: number, to: number) {
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
