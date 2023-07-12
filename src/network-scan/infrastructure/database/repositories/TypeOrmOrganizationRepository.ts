import { injectable } from 'inversify';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import Organization from '../../../domain/organization/Organization';
import { OrganizationRepository } from '../../../domain/organization/OrganizationRepository';
import { OrganizationId } from '../../../domain/organization/OrganizationId';
import OrganizationMeasurement from '../../../domain/organization/OrganizationMeasurement';
import { Snapshot } from '../../../../core/domain/Snapshot';
import OrganizationSnapShot from '../../../domain/organization/OrganizationSnapShot';

@injectable()
export class TypeOrmOrganizationRepository implements OrganizationRepository {
	constructor(private baseRepository: Repository<Organization>) {}

	async findByOrganizationId(
		organizationId: OrganizationId
	): Promise<Organization | null> {
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

	async findActiveAtTimePoint(at: Date): Promise<Organization[]> {
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

	async findActive(): Promise<Organization[]> {
		return await this.getActiveOrganizationsBaseQuery().getMany();
	}

	private getActiveOrganizationsBaseQuery(): SelectQueryBuilder<Organization> {
		return this.baseRepository
			.createQueryBuilder('organization')
			.innerJoinAndSelect(
				'organization._snapshots',
				'snapshots',
				'snapshots."OrganizationId" = organization.id AND snapshots."endDate" = :max',
				{
					max: Snapshot.MAX_DATE
				}
			)
			.leftJoinAndSelect(
				'organization._measurements',
				'measurements',
				'measurements."organizationId"= organization.id and measurements."time" = (select max(measurements2."time") from "organization_measurement" measurements2 where measurements2."organizationId" = organization.id)'
			);
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
				organizationId: {
					value: organization.organizationId.value
				}
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

		const orderedSnapshotsToSave = snapshotsToSave.sort(
			(a, b) => a.startDate.getTime() - b.startDate.getTime()
		);

		//we need the correct order to avoid unique key violation [node, endDate].
		// EndDate of the previous currentSnapshot needs to be changed first before adding a new snapshot with the max endDate
		//Typeorm ignores the order when persisting in one go
		for (const snapshot of orderedSnapshotsToSave) {
			await baseRepo.save(OrganizationSnapShot, snapshot);
		}

		const measurement = organization.latestMeasurement();
		if (measurement && measurement.time.getTime() >= from.getTime()) {
			await baseRepo.save(OrganizationMeasurement, measurement);
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
