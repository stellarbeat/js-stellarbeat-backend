import { NetworkRepository } from '../../../domain/network/NetworkRepository';
import { Network } from '../../../domain/network/Network';
import { injectable } from 'inversify';
import { Repository } from 'typeorm';
import { NetworkId } from '../../../domain/network/NetworkId';
import { Snapshot } from '../../../../core/domain/Snapshot';

@injectable()
export class TypeOrmNetworkRepository implements NetworkRepository {
	constructor(private networkRepository: Repository<Network>) {}

	async save(network: Network): Promise<Network> {
		//because we don't load all the snapshots and changes when fetching from the db,
		//we cannot save the network entity itself when updating. Otherwise, TYPEOrm would delete
		// the snapshots not present in the array. Not updating the network is not an issue because it is immutable.
		network.changes.forEach((change) => (change.network = network));
		network.snapshots.forEach((snapshot) => (snapshot.network = network));
		const count = await this.networkRepository.count({
			where: {
				networkId: network.networkId
			}
		});
		if (count === 0) {
			await this.networkRepository.save(network);
		}

		// manager is workaround for changes type not correctly persisted https://github.com/typeorm/typeorm/issues/7558
		await this.networkRepository.manager.save(
			[...network.snapshots, ...network.changes],
			{}
		);

		return network;
	}

	async findActiveByNetworkId(
		networkId: NetworkId
	): Promise<Network | undefined> {
		return this.networkRepository
			.createQueryBuilder('network')
			.leftJoinAndSelect(
				'network._snapshots',
				'snapshots',
				'snapshots.networkId = network.id AND snapshots.endDate = :endDate',
				{ endDate: Snapshot.MAX_DATE }
			)
			.leftJoinAndSelect(
				'network._changes',
				'changes',
				'changes.networkId = network.id',
				{
					limit: 10
				}
			)
			.where({
				networkId: networkId
			})
			.getOne();
	}
}
