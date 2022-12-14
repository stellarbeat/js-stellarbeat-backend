import { NodePublicKeyStorageRepository } from '../database/entities/NodePublicKeyStorage';
import { NodeMeasurementDayV2Repository } from '../database/repositories/NodeMeasurementDayV2Repository';
import { inject, injectable } from 'inversify';

@injectable()
export default class NodeMeasurementAggregator {
	constructor(
		@inject('NodePublicKeyStorageRepository')
		private nodePublicKeyStorageRepository: NodePublicKeyStorageRepository,
		private nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository
	) {}

	async getNodeDayMeasurements(publicKey: string, from: Date, to: Date) {
		const nodePublicKey = await this.nodePublicKeyStorageRepository.findOne({
			where: {
				publicKey: publicKey
			}
		});

		if (!nodePublicKey) {
			return [];
		}

		return await this.nodeMeasurementDayV2Repository.findBetween(
			nodePublicKey,
			from,
			to
		);
	}
}
