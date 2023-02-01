import { injectable } from 'inversify';
import {
	EntityManager,
	EntityRepository,
	Repository,
	SelectQueryBuilder
} from 'typeorm';
import Organization from '../../../domain/organization/Organization';
import { OrganizationRepository } from '../../../domain/organization/OrganizationRepository';
import { OrganizationId } from '../../../domain/organization/OrganizationId';
import OrganizationMeasurement from '../../../domain/organization/OrganizationMeasurement';
import { Snapshot } from '../../../../core/domain/Snapshot';

@injectable()
export class TypeOrmOrganizationRepository implements OrganizationRepository {
	constructor(private baseRepository: Repository<Organization>) {}

	async findByOrganizationId(
		organizationId: OrganizationId
	): Promise<Organization | undefined> {
		const organization = await this.getOrganizationBaseQuery()
			.where('organization.organizationIdValue = :organizationIdValue', {
				organizationIdValue: organizationId.value
			})
			.getOne();

		if (organization) {
			organization.currentSnapshot().organization = organization;
		}

		return organization;
	}

	async findByHomeDomains(homeDomains: string[]): Promise<Organization[]> {
		if (homeDomains.length === 0) return [];

		const organizations = await this.getOrganizationBaseQuery()
			.where('organization.homeDomain in (:...homeDomains)', {
				homeDomains
			})
			.getMany();

		organizations.forEach((organization) => {
			//temporary until we use it as aggregate root
			organization.currentSnapshot().organization = organization;
		});

		return organizations;
	}

	async findActive(at: Date): Promise<Organization[]> {
		return await this.baseRepository
			.createQueryBuilder('organization')
			.innerJoinAndSelect(
				'organization._snapshots',
				'snapshots',
				'snapshots."OrganizationId" = organization.id AND snapshots."startDate" <= :at AND snapshots."endDate" > :at',
				{ at }
			)
			.leftJoinAndSelect(
				'organization._measurements',
				'measurements',
				'measurements."organizationId"= organization.id and measurements."time" = :at',
				{ at }
			)
			.getMany();
	}

	private getOrganizationBaseQuery(): SelectQueryBuilder<Organization> {
		return this.baseRepository
			.createQueryBuilder('organization')
			.innerJoinAndSelect(
				'organization._snapshots',
				'snapshots',
				'snapshots."OrganizationId" = organization.id ' +
					'and snapshots."endDate" = (select max(snapshots2."endDate") ' +
					'from "organization_snap_shot" snapshots2 ' +
					'where snapshots2."OrganizationId" = organization.id)'
			)
			.leftJoinAndSelect(
				'organization._measurements',
				'measurements',
				'measurements."organizationId"= organization.id ' +
					'and measurements."time" = (select max(measurements2."time") ' +
					'from "organization_measurement" measurements2 ' +
					'where measurements2."organizationId" = organization.id)'
			);
	}

	async saveOne(
		organization: Organization,
		from: Date,
		transactionalEntityManager?: EntityManager
	): Promise<Organization> {
		const baseRepo = transactionalEntityManager
			? transactionalEntityManager
			: this.baseRepository.manager;

		organization.snapshots.forEach((snapshot) => {
			snapshot.organization = organization;
		});

		const count = await baseRepo.count(Organization, {
			where: {
				organizationId: organization.organizationId
			}
		});

		if (count === 0) {
			await baseRepo.insert(Organization, organization);
		}

		const snapshotsToSave = organization.snapshots.filter((snapshot) => {
			return (
				snapshot.startDate.getTime() >= from.getTime() ||
				(snapshot.endDate.getTime() >= from.getTime() &&
					snapshot.endDate.getTime() < Snapshot.MAX_DATE.getTime())
			);
		});

		// manager is workaround for changes type not correctly persisted https://github.com/typeorm/typeorm/issues/7558
		await baseRepo.save([...snapshotsToSave], {});

		const measurement = organization.latestMeasurement();
		if (measurement && measurement.time.getTime() >= from.getTime()) {
			await baseRepo.insert(OrganizationMeasurement, measurement);
		}

		return organization;
	}

	async save(
		organizations: Organization[],
		from: Date
	): Promise<Organization[]> {
		await this.baseRepository.manager.transaction(
			async (transactionalEntityManager: EntityManager) => {
				for (const organization of organizations) {
					await this.saveOne(organization, from, transactionalEntityManager);
				}
			}
		);

		return organizations;
	}

	//@deprecated
	async find() {
		return this.baseRepository.find();
	}
}
