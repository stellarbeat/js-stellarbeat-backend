import { NodePublicKeyStorageRepository } from '../entities/NodePublicKeyStorage';
import { NodeMeasurementV2Repository } from '../repositories/NodeMeasurementV2Repository';
import { NodeMeasurementDayV2Repository } from '../repositories/NodeMeasurementDayV2Repository';
import { inject, injectable } from 'inversify';
import { PublicKey } from '@stellarbeat/js-stellar-domain';
import { Between } from 'typeorm';

@injectable()
export default class NodeMeasurementService {
	protected nodePublicKeyStorageRepository: NodePublicKeyStorageRepository;
	protected nodeMeasurementV2Repository: NodeMeasurementV2Repository;
	protected nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository;

	constructor(
		@inject('NodePublicKeyStorageRepository')
		nodePublicKeyStorageRepository: NodePublicKeyStorageRepository,
		nodeMeasurementV2Repository: NodeMeasurementV2Repository,
		nodeMeasurementDayV2Repository: NodeMeasurementDayV2Repository
	) {
		this.nodePublicKeyStorageRepository = nodePublicKeyStorageRepository;
		this.nodeMeasurementV2Repository = nodeMeasurementV2Repository;
		this.nodeMeasurementDayV2Repository = nodeMeasurementDayV2Repository;
	}

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

	async getNodeMeasurements(publicKey: PublicKey, from: Date, to: Date) {
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
