import { inject, injectable } from 'inversify';
import {
	Event,
	FullValidatorXUpdatesHistoryArchiveOutOfDateEvent,
	MultipleUpdatesEventData,
	NodeXUpdatesConnectivityErrorEvent,
	NodeXUpdatesInactiveEvent,
	NodeXUpdatesStellarCoreBehindEvent,
	OrganizationXUpdatesTomlErrorEvent,
	OrganizationXUpdatesUnavailableEvent,
	ValidatorXUpdatesNotValidatingEvent
} from '../../../domain/event/Event';
import { EventRepository } from '../../../domain/event/EventRepository';
import { OrganizationId, PublicKey } from '../../../domain/event/EventSourceId';
import { NodeMeasurementRepository } from '../../../../network-scan/domain/node/NodeMeasurementRepository';
import { OrganizationMeasurementRepository } from '../../../../network-scan/domain/organization/OrganizationMeasurementRepository';
import { NETWORK_TYPES } from '../../../../network-scan/infrastructure/di/di-types';
import { NodeMeasurementEvent } from '../../../../network-scan/domain/node/NodeMeasurementEvent';
import { OrganizationMeasurementEvent } from '../../../../network-scan/domain/organization/OrganizationMeasurementEvent';

//repository that returns events that are detected by queries on node and organization measurements.
//events are (not yet?) stored thus not linked to a db entity
@injectable()
export class TypeOrmEventRepository implements EventRepository {
	constructor(
		@inject(NETWORK_TYPES.NodeMeasurementRepository)
		protected nodeMeasurementRepository: NodeMeasurementRepository,
		@inject(NETWORK_TYPES.OrganizationMeasurementRepository)
		protected organizationMeasurementRepository: OrganizationMeasurementRepository
	) {
		this.organizationMeasurementRepository = organizationMeasurementRepository;
		this.nodeMeasurementRepository = nodeMeasurementRepository;
	}

	async findNodeEventsForXNetworkScans(
		x: number,
		at: Date
	): Promise<Event<MultipleUpdatesEventData, PublicKey>[]> {
		return this.mapNodeEvents(
			await this.nodeMeasurementRepository.findEventsForXNetworkScans(x, at),
			x
		);
	}

	async findOrganizationMeasurementEventsForXNetworkScans(
		x: number,
		at: Date
	): Promise<Event<MultipleUpdatesEventData, OrganizationId>[]> {
		return this.mapOrganizationEvents(
			await this.organizationMeasurementRepository.findEventsForXNetworkScans(
				x,
				at
			),
			x
		);
	}

	protected mapNodeEvents(
		nodeMeasurementEventResults: NodeMeasurementEvent[],
		x: number
	): Event<MultipleUpdatesEventData, PublicKey>[] {
		const events: Event<MultipleUpdatesEventData, PublicKey>[] = [];
		nodeMeasurementEventResults.forEach((rawEvent) => {
			const publicKeyResult = PublicKey.create(rawEvent.publicKey);
			if (!publicKeyResult.isOk()) return;
			if (rawEvent.inactive)
				events.push(
					new NodeXUpdatesInactiveEvent(
						new Date(rawEvent.time),
						publicKeyResult.value,
						{
							numberOfUpdates: x
						}
					)
				);
			if (rawEvent.notValidating)
				events.push(
					new ValidatorXUpdatesNotValidatingEvent(
						new Date(rawEvent.time),
						publicKeyResult.value,
						{ numberOfUpdates: x }
					)
				);
			if (rawEvent.historyOutOfDate)
				events.push(
					new FullValidatorXUpdatesHistoryArchiveOutOfDateEvent(
						new Date(rawEvent.time),
						publicKeyResult.value,
						{ numberOfUpdates: x }
					)
				);

			if (rawEvent.connectivityIssues)
				events.push(
					new NodeXUpdatesConnectivityErrorEvent(
						new Date(rawEvent.time),
						publicKeyResult.value,
						{ numberOfUpdates: x }
					)
				);

			if (rawEvent.stellarCoreVersionBehindIssue)
				events.push(
					new NodeXUpdatesStellarCoreBehindEvent(
						new Date(rawEvent.time),
						publicKeyResult.value,
						{ numberOfUpdates: x }
					)
				);
		});

		return events;
	}

	protected mapOrganizationEvents(
		organizationMeasurementEventResults: OrganizationMeasurementEvent[],
		x: number
	): Event<MultipleUpdatesEventData, OrganizationId>[] {
		const events: Event<MultipleUpdatesEventData, OrganizationId>[] = [];
		organizationMeasurementEventResults.forEach((rawResult) => {
			if (rawResult.subQuorumUnavailable)
				events.push(
					new OrganizationXUpdatesUnavailableEvent(
						new Date(rawResult.time),
						new OrganizationId(rawResult.organizationId),
						{ numberOfUpdates: x }
					)
				);

			if (rawResult.tomlIssue)
				events.push(
					new OrganizationXUpdatesTomlErrorEvent(
						new Date(rawResult.time),
						new OrganizationId(rawResult.organizationId),
						{ numberOfUpdates: x }
					)
				);
		});
		return events;
	}
}
