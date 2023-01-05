import {
	EventSourceId,
	NetworkId,
	OrganizationId,
	PublicKey
} from './EventSourceId';
import { err, ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
import { EventSourceService } from './EventSourceService';
import 'reflect-metadata';
import { TYPES } from '../../infrastructure/di/di-types';

@injectable()
export class EventSourceIdFactory {
	constructor(
		@inject(TYPES.EventSourceService)
		protected readonly eventSourceService: EventSourceService
	) {}

	async create(
		type: 'node' | 'organization' | 'network',
		id: string,
		time: Date
	): Promise<Result<EventSourceId, Error>> {
		switch (type) {
			case 'node': {
				const publicKeyResult = PublicKey.create(id);
				if (publicKeyResult.isErr()) return err(publicKeyResult.error);
				if (await this.isKnown(publicKeyResult.value, time))
					return ok(publicKeyResult.value);
				return err(new Error(`unknown public key: ${publicKeyResult.value}`));
			}
			case 'organization': {
				const organizationId = new OrganizationId(id);
				if (await this.isKnown(organizationId, time))
					return ok(new OrganizationId(id));
				return err(new Error('Unknown organization id'));
			}
			case 'network': {
				const networkId = new NetworkId(id);

				if (await this.isKnown(networkId, time)) return ok(new NetworkId(id));

				return err(new Error(`Unknown network id ${networkId.value}`));
			}
			default:
				return err(new Error(`Unknown type: ${type}`));
		}
	}

	protected async isKnown(
		eventSourceId: EventSourceId,
		time: Date
	): Promise<Result<boolean, Error>> {
		const publicKeyActiveResult =
			await this.eventSourceService.isEventSourceIdKnown(eventSourceId, time);
		if (publicKeyActiveResult.isErr() || !publicKeyActiveResult.value)
			return ok(false);
		return ok(true);
	}
}
