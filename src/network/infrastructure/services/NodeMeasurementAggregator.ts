import { NodeMeasurementDayV2Repository } from '../database/repositories/NodeMeasurementDayV2Repository';
import { inject, injectable } from 'inversify';
import { VersionedNodeRepository } from '../database/entities/VersionedNode';
import PublicKey from '../../domain/PublicKey';

@injectable()
export default class NodeMeasurementAggregator {
	constructor(
		@inject('NodePublicKeyStorageRepository')
		private versionedNodeRepository: VersionedNodeRepository,
		private nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository
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

		return await this.nodeMeasurementDayV2Repository.findBetween(
			node,
			from,
			to
		);
	}
}
