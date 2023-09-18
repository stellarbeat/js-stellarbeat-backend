import { NetworkRepository } from '../../../domain/network/NetworkRepository';
import { Network } from '../../../domain/network/Network';
import { injectable } from 'inversify';
import { Equal, Repository } from 'typeorm';
import { NetworkId } from '../../../domain/network/NetworkId';
import { Snapshot } from '../../../../core/domain/Snapshot';
import { NetworkSnapshot } from '../../../domain/network/NetworkSnapshot';

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
				networkId: {
					value: network.networkId.value
				}
			}
		});
		if (count === 0) {
			await this.networkRepository.save(network);
		}

		const orderedSnapshotsToSave = network.snapshots.sort(
			(a, b) => a.startDate.getTime() - b.startDate.getTime()
		);

		//we need the correct order to avoid unique key violation [network, endDate].
		// EndDate of the previous currentSnapshot needs to be changed first before adding a new snapshot with the max endDate
		//Typeorm ignores the order when persisting in one go
		//todo: transaction
		for (const snapshot of orderedSnapshotsToSave) {
			await this.networkRepository.manager.save(NetworkSnapshot, snapshot);
		}

		// manager is workaround for changes type not correctly persisted https://github.com/typeorm/typeorm/issues/7558
		await this.networkRepository.manager.save([...network.changes], {});

		return network;
	}

	async findActiveByNetworkId(networkId: NetworkId): Promise<Network | null> {
		return this.networkRepository
			.createQueryBuilder('network')
			.innerJoinAndSelect(
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

	async findAtDateByNetworkId(
		networkId: NetworkId,
		at: Date
	): Promise<Network | null> {
		return this.networkRepository
			.createQueryBuilder('network')
			.innerJoinAndSelect(
				'network._snapshots',
				'snapshots',
				'snapshots.networkId = network.id AND snapshots."startDate" <= :at AND snapshots."endDate" > :at',
				{ at: at }
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

	async findPassphraseByNetworkId(
		networkId: NetworkId
	): Promise<string | undefined> {
		return this.networkRepository
			.createQueryBuilder('network')
			.where({
				networkId: networkId
			})
			.getOne()
			.then((network) => network?.passphrase);
	}
}
