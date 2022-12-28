import { inject, injectable } from 'inversify';
import { VersionedNodeRepository } from '../../domain/VersionedNode';
import PublicKey from '../../domain/PublicKey';
import { NodeMeasurementDayRepository } from '../../domain/measurement/NodeMeasurementDayRepository';
import { NETWORK_TYPES } from '../di/di-types';
import 'reflect-metadata';
@injectable()
export default class NodeMeasurementAggregator {
	constructor(
		@inject('NodePublicKeyStorageRepository')
		private versionedNodeRepository: VersionedNodeRepository,
		@inject(NETWORK_TYPES.NodeMeasurementDayRepository)
		private nodeMeasurementDayRepository: NodeMeasurementDayRepository
	) {}

	async getNodeDayMeasurements(publicKey: PublicKey, from: Date, to: Date) {
		const node = await this.versionedNodeRepository.findOne({
			where: {
				publicKey: publicKey
			}
		});

		if (!node) {
			return [];
		}

		return await this.nodeMeasurementDayRepository.findBetween(node, from, to);
	}
}
