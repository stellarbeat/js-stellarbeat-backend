import { ChildEntity } from 'typeorm';
import { NetworkId } from '../NetworkId';
import { NetworkChange } from './NetworkChange';

@ChildEntity()
export class NetworkNameChanged extends NetworkChange {
	constructor(networkId: NetworkId, time: Date, from: string, to: string) {
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
