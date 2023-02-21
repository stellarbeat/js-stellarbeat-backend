import Node from '../domain/node/Node';
import Organization from '../domain/organization/Organization';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../core/utilities/mapUnknownToError';
import { NodeMeasurementRepository } from '../domain/node/NodeMeasurementRepository';
import { NodeMeasurementDayRepository } from '../domain/node/NodeMeasurementDayRepository';
import { NETWORK_TYPES } from '../infrastructure/di/di-types';
import { inject, injectable } from 'inversify';
import { NodeV1DTOMapper } from '../mappers/NodeV1DTOMapper';
import { NodeV1 } from '@stellarbeat/js-stellarbeat-shared';

@injectable()
export class NodeDTOService {
	constructor(
		@inject(NETWORK_TYPES.NodeMeasurementRepository)
		private nodeMeasurementRepository: NodeMeasurementRepository,
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		private nodeMeasurementDayRepository: NodeMeasurementDayRepository,
		private nodeMapper: NodeV1DTOMapper
	) {}
	public async getNodeDTOs(
		time: Date,
		nodes: Node[],
		organizations: Organization[]
	): Promise<Result<NodeV1[], Error>> {
		try {
			const nodesToOrganizations = new Map<string, string>();
			organizations.forEach((organization) => {
				organization.validators.value.forEach((node) => {
					nodesToOrganizations.set(
						node.value,
						organization.organizationId.value
					);
				});
			});

			const measurement24HourAverages =
				await this.nodeMeasurementRepository.findXDaysAverageAt(time, 1); //24 hours can be calculated 'live' quickly

			const measurement24HourAveragesMap = new Map(
				measurement24HourAverages.map((avg) => {
					return [avg.publicKey, avg];
				})
			);

			const measurement30DayAverages =
				await this.nodeMeasurementDayRepository.findXDaysAverageAt(time, 30);
			const measurement30DayAveragesMap = new Map(
				measurement30DayAverages.map((avg) => {
					return [avg.publicKey, avg];
				})
			);

			return ok(
				nodes.map((node) => {
					return this.nodeMapper.toNodeV1DTO(
						time,
						node,
						measurement24HourAveragesMap.get(node.publicKey.value),
						measurement30DayAveragesMap.get(node.publicKey.value),
						nodesToOrganizations.get(node.publicKey.value)
					);
				})
			);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}
}
