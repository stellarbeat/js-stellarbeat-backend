import {
	EntityRepository,
	LessThanOrEqual,
	MoreThan,
	Repository
} from 'typeorm';
import OrganizationSnapShot from '../../../domain/organization/OrganizationSnapShot';
import { injectable } from 'inversify';
import Organization from '../../../domain/organization/Organization';
import { OrganizationSnapShotRepository } from '../../../domain/organization/snapshotting/OrganizationSnapShotRepository';
import { Snapshot } from '../../../../core/domain/Snapshot';

@injectable()
@EntityRepository(OrganizationSnapShot)
export default class TypeOrmOrganizationSnapShotRepository
	implements OrganizationSnapShotRepository
{
	constructor(private baseRepository: Repository<OrganizationSnapShot>) {}

	//@deprecated just for testing
	async find() {
		return await this.baseRepository.find();
	}

	async save(
		organizationSnapShots: OrganizationSnapShot[]
	): Promise<OrganizationSnapShot[]> {
		//temporary solution until we switch to Organization as aggregate root
		for (const snapshot of organizationSnapShots) {
			const count = await this.baseRepository.manager.count(Organization, {
				where: {
					organizationId: snapshot.organization.organizationId
				}
			});

			if (count === 0) {
				await this.baseRepository.manager.save(snapshot.organization);
			}
			await this.baseRepository.save(snapshot);
		}

		return organizationSnapShots;
	}
	/**
	 * Organization SnapShots that are active (not archived).
	 */
	async findActive(): Promise<OrganizationSnapShot[]> {
		return await this.baseRepository.find({
			where: { endDate: Snapshot.MAX_DATE }
		});
	}

	async findActiveAtTime(time: Date) {
		return await this.baseRepository.find({
			where: {
				startDate: LessThanOrEqual(time),
				endDate: MoreThan(time)
			}
		});
	}

	async findLatestByOrganization(
		organization: Organization,
		at: Date = new Date()
	) {
		return await this.baseRepository.find({
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
		return await this.baseRepository.find({
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
