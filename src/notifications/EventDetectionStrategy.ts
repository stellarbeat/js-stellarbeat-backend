import NetworkUpdate from '../storage/entities/NetworkUpdate';
import { Event } from './Event';

export interface EventDetectionStrategy {
	detect(networkUpdate: NetworkUpdate): Promise<Event[]>;
}
