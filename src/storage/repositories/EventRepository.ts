import { injectable } from 'inversify';
import { NodeMeasurementV2Repository } from './NodeMeasurementV2Repository';
import { OrganizationMeasurementRepository } from './OrganizationMeasurementRepository';
import {
	Event,
	EventType,
	FullValidatorXUpdatesHistoryArchiveOutOfDateEvent,
	MultipleUpdatesEventData,
	NodeXUpdatesInactiveEvent,
	OrganizationXUpdatesUnavailableEvent,
	SourceType,
	ValidatorXUpdatesNotValidatingEvent
} from '../../notifications/Event';

interface NodeMeasurementEventResult {
	time: string;
	publicKey: string;
	notValidating: boolean;
	inactive: boolean;
	historyOutOfDate: boolean;
}

export interface OrganizationMeasurementEventResult {
	time: string;
	organizationId: string;
	subQuorumUnavailable: boolean;
}

//repository that returns events that are detected by queries on node and organization measurements.
//events are (not yet?) stored thus not linked to a db entity
@injectable()
export class EventRepository {
	constructor(
		protected nodeMeasurementRepository: NodeMeasurementV2Repository,
		protected organizationMeasurementRepository: OrganizationMeasurementRepository
	) {
		this.organizationMeasurementRepository = organizationMeasurementRepository;
		this.nodeMeasurementRepository = nodeMeasurementRepository;
	}

	/**
	 * Event detection queries explanation:
	 * For example when x is 3 we look into a window of size 4. An event is returned if the fourth measurement is true, and the most recent three ar false.
	 * This indicates that is this the first time that there are three consecutive false records.
	 * first the network measurements sorted by time descending and adding a row number:
	 * 1 apr
	 * 2 mar
	 * 3 feb
	 * 4 jan
	 * Then we join with the measurements time column and count the number of true measurements and determine what the max row number where the measurement was active.
	 * When the count is 1 and the max is row 4, this means we have a window as described above
	 */

	async findNodeEventsInXLatestNetworkUpdates(
		x: number
	): Promise<Event<MultipleUpdatesEventData>[]> {
		const rawResults = await this.nodeMeasurementRepository.query(
			`select max(c."time") as   time,
					"node_public_key"."publicKey",
					case
						when count(case when "isValidating" = true then 1 end) = 1 and
							 max(case when "isValidating" = true then c.nr else 0 end) = $1 then true
						else false end "notValidating",
					case
						when count(case when "isActive" = true then 1 end) = 1 and
							 max(case when "isActive" = true then c.nr else 0 end) = $1 then true
						else false end "inactive",
					case
						when count(case when "isFullValidator" = true then 1 end) = 1 and
							 max(case when "isFullValidator" = true then c.nr else 0 end) = $1 then true
						else false end "historyOutOfDate"
			 from node_measurement_v2 nmv2
					  join lateral ( select row_number() over (order by time desc) as nr, time
									 from network_update
									 where completed = true
									 order by time desc
									 limit $1
				 ) c
						   on c.time = nmv2.time
					  join node_public_key on nmv2."nodePublicKeyStorageId" = node_public_key.id
			 group by node_public_key."publicKey"
			 having (count(case when "isValidating" = true then 1 end) = 1
				 and max(case when "isValidating" = true then c.nr else 0 end) = $1)
				 or (count(case when "isActive" = true then 1 end) = 1
				 and max(case when "isActive" = true then c.nr else 0 end) = $1)
				 or (count(case when "isFullValidator" = true then 1 end) = 1
				 and max(case when "isFullValidator" = true then c.nr else 0 end) = $1)`,
			[x + 1]
		);

		return this.mapNodeEvents(rawResults, x);
	}

	async findOrganizationMeasurementEventsInXLatestNetworkUpdates(
		x: number
	): Promise<Event<MultipleUpdatesEventData>[]> {
		const rawResults = await this.organizationMeasurementRepository.query(
			`select max(c."time") as   time, "oi"."organizationId",
					(case
						 when count(case when "isSubQuorumAvailable" = true then 1 end) = 1
							 and max(case when "isSubQuorumAvailable" = true then c.nr else 0 end) = $1
							 then true
						 else false end) "subQuorumUnavailable"
			 from organization_measurement om
					  join lateral ( select row_number() over (order by time desc) as nr, time
									 from network_update
									 where completed = true
									 order by time desc
									 limit $1
				 ) c
						   on c.time = om.time
					  join organization_id oi on om."organizationIdStorageId" = oi."id"
			 group by oi."organizationId"
			 having count(case when "isSubQuorumAvailable" = true then 1 end) = 1
				and max(case when "isSubQuorumAvailable" = true then c.nr else 0 end) = $1`,
			[x + 1]
		);

		return this.mapOrganizationEvents(rawResults, x);
	}

	protected mapNodeEvents(
		nodeMeasurementEventResults: NodeMeasurementEventResult[],
		x: number
	): Event<MultipleUpdatesEventData>[] {
		const events: Event<MultipleUpdatesEventData>[] = [];
		nodeMeasurementEventResults.forEach((rawEvent) => {
			if (rawEvent.inactive)
				events.push(
					new NodeXUpdatesInactiveEvent(
						new Date(rawEvent.time),
						rawEvent.publicKey,
						{
							numberOfUpdates: x
						}
					)
				);
			if (rawEvent.notValidating)
				events.push(
					new ValidatorXUpdatesNotValidatingEvent(
						new Date(rawEvent.time),
						rawEvent.publicKey,
						{ numberOfUpdates: x }
					)
				);
			if (rawEvent.historyOutOfDate)
				events.push(
					new FullValidatorXUpdatesHistoryArchiveOutOfDateEvent(
						new Date(rawEvent.time),
						rawEvent.publicKey,
						{ numberOfUpdates: x }
					)
				);
		});

		return events;
	}

	protected mapOrganizationEvents(
		organizationMeasurementEventResults: OrganizationMeasurementEventResult[],
		x: number
	): Event<MultipleUpdatesEventData>[] {
		return organizationMeasurementEventResults.map(
			(rawResult) =>
				new OrganizationXUpdatesUnavailableEvent(
					new Date(rawResult.time),
					rawResult.organizationId,
					{ numberOfUpdates: x }
				)
		);
	}
}
