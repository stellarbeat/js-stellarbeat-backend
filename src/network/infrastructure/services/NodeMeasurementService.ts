import { NodePublicKeyStorageRepository } from '../database/entities/NodePublicKeyStorage';
import { NodeMeasurementV2Repository } from '../database/repositories/NodeMeasurementV2Repository';
import { inject, injectable } from 'inversify';
import { Between } from 'typeorm';

@injectable()
export default class NodeMeasurementService {
	constructor(
		@inject('NodePublicKeyStorageRepository')
		private nodePublicKeyStorageRepository: NodePublicKeyStorageRepository,
		private nodeMeasurementV2Repository: NodeMeasurementV2Repository
	) {}

	async getNodeMeasurements(publicKey: string, from: Date, to: Date) {
		const nodePublicKey = await this.nodePublicKeyStorageRepository.findOne({
			where: {
				publicKey: publicKey
			}
		});

		if (!nodePublicKey) {
			return [];
		}

		//@ts-ignore
		return await this.nodeMeasurementV2Repository.find({
			where: [
				{
					nodePublicKeyStorage: nodePublicKey,
					time: Between(from, to)
				}
			],
			order: {
				time: 'ASC'
			}
		});
	}
}
