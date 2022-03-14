import { EntityRepository, Repository } from 'typeorm';
import NetworkUpdate from '../../../../network-update/domain/NetworkUpdate';
import { injectable } from 'inversify';

@injectable()
@EntityRepository(NetworkUpdate)
export class NetworkUpdateRepository extends Repository<NetworkUpdate> {
	async findLatest(): Promise<NetworkUpdate | undefined> {
		return await this.findOne({
			where: {
				completed: true
			}
		});
	}
}
