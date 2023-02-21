import {
	EventSourceId,
	OrganizationId,
	PublicKey
} from '../../domain/event/EventSourceId';
import { err, ok, Result } from 'neverthrow';
import { EventSourceService } from '../../domain/event/EventSourceService';
import { injectable } from 'inversify';
import { EventSource } from '../../domain/event/EventSource';
import { NetworkDTOService } from '../../../network-scan/services/NetworkDTOService';
import { NodeV1, OrganizationV1 } from '@stellarbeat/js-stellarbeat-shared';

@injectable()
export class EventSourceFromNetworkService implements EventSourceService {
	constructor(protected networkService: NetworkDTOService) {}

	async isEventSourceIdKnown(
		eventSourceId: EventSourceId,
		time: Date
	): Promise<Result<boolean, Error>> {
		const networkResult = await this.networkService.getNetworkDTOAt(time);
		if (networkResult.isErr()) {
			return err(networkResult.error);
		}

		if (networkResult.value === null)
			return err(new Error('No network found at ' + time));

		const network = networkResult.value;

		if (eventSourceId instanceof PublicKey)
			return ok(
				this.getNodeV1(network.nodes, eventSourceId.value) !== undefined
			);

		if (eventSourceId instanceof OrganizationId)
			return ok(
				this.getOrganizationV1(network.organizations, eventSourceId.value) !==
					undefined
			);

		return ok(eventSourceId.value === network.id);
	}

	async findEventSource(
		eventSourceId: EventSourceId,
		time: Date
	): Promise<Result<EventSource, Error>> {
		const networkResult = await this.networkService.getNetworkDTOAt(time);
		if (networkResult.isErr()) {
			return err(networkResult.error);
		}

		if (networkResult.value === null)
			return err(new Error('No network found at ' + time));

		const network = networkResult.value;

		if (eventSourceId instanceof PublicKey)
			return ok(
				new EventSource(
					eventSourceId,
					this.getNodeName(eventSourceId.value, network.nodes)
				)
			);

		if (eventSourceId instanceof OrganizationId)
			return ok(
				new EventSource(
					eventSourceId,
					this.findOrganizationName(eventSourceId.value, network.organizations)
				)
			);

		return ok(
			new EventSource(
				eventSourceId,
				network.name ? network.name : 'Stellar Public network'
			)
		);
	}

	private getNodeName(publicKey: string, nodes: NodeV1[]): string {
		return this.getNodeV1(nodes, publicKey)?.name ?? publicKey;
	}

	private getNodeV1(nodes: NodeV1[], publicKey: string) {
		return nodes.find((node) => node.publicKey === publicKey);
	}

	private findOrganizationName(
		organizationId: string,
		organizations: OrganizationV1[]
	): string {
		return (
			this.getOrganizationV1(organizations, organizationId)?.name ??
			organizationId
		);
	}

	private getOrganizationV1(
		organizations: OrganizationV1[],
		organizationId: string
	) {
		return organizations.find(
			(organization) => organization.id === organizationId
		);
	}
}
