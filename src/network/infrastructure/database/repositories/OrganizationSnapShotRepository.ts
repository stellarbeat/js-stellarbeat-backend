import {
	EntityRepository,
	LessThanOrEqual,
	MoreThan,
	Repository
} from 'typeorm';
import OrganizationSnapShot from '../../../domain/OrganizationSnapShot';
import NodeSnapShot, { SnapShot } from '../../../domain/NodeSnapShot';
import { injectable } from 'inversify';
import VersionedOrganization from '../../../domain/VersionedOrganization';

export interface SnapShotRepository {
	findActive(): Promise<SnapShot[]>;
}

@injectable()
@EntityRepository(OrganizationSnapShot)
export default class OrganizationSnapShotRepository
	extends Repository<OrganizationSnapShot>
	implements SnapShotRepository
{
	/**
	 * Organization SnapShots that are active (not archived).
	 */
	async findActive(): Promise<OrganizationSnapShot[]> {
		return await this.find({ where: { endDate: NodeSnapShot.MAX_DATE } });
	}

	async findActiveAtTime(time: Date) {
		return await this.find({
			where: {
				startDate: LessThanOrEqual(time),
				endDate: MoreThan(time)
			}
		});
	}

	async findLatestByOrganization(
		organization: VersionedOrganization,
		at: Date = new Date()
	) {
		return await this.find({
			where: [
				{
					_organization: organization,
					startDate: LessThanOrEqual(at)
				}
			],
			take: 10,
			order: {
				endDate: 'DESC'
			}
		});
	}

	async findLatest(at: Date = new Date()) {
		return await this.find({
			where: {
				startDate: LessThanOrEqual(at)
			},
			take: 10,
			order: {
				startDate: 'DESC'
			}
		});
	}
}
