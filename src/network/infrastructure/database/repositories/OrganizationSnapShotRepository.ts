import {
	EntityRepository,
	In,
	LessThanOrEqual,
	MoreThan,
	Repository
} from 'typeorm';
import { IsNull } from 'typeorm';
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

	async findOrganizationsWithoutActiveValidators(): Promise<
		OrganizationSnapShot[]
	> {
		return this.createQueryBuilder('OrganizationSnapShot')
			.innerJoin(
				'organization_snap_shot_validators_node_public_key',
				'OrgRelNode',
				'"OrganizationSnapShot"."id" = "OrgRelNode"."organizationSnapShotId"'
			)
			.leftJoin(
				'node_snap_shot',
				'NodeSnapShot',
				'"NodeSnapShot"."NodeId" = "OrgRelNode"."nodeId" ' +
					'AND "NodeSnapShot"."EndCrawlId" is null ' + //active snapshot
					'AND "NodeSnapShot"."QuorumSetId" is not null'
			) //validator has quorumSet
			.where({ _endCrawl: IsNull() })
			.having('"NodeSnapShot"."NodeId" is null')
			.getRawMany();
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
