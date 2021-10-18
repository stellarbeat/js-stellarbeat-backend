import { Event } from './Event';
import { Network } from '@stellarbeat/js-stellar-domain';

export interface EventDetectionStrategy {
	detect(network: Network): Promise<Event[]>;
}
