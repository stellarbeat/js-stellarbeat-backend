import { injectable } from 'inversify';
import {
	EntityRepository,
	Repository,
	EntityManager,
	SelectQueryBuilder
} from 'typeorm';
import Organization from '../../../domain/organization/Organization';
import { OrganizationRepository } from '../../../domain/organization/OrganizationRepository';
import { OrganizationId } from '../../../domain/organization/OrganizationId';
import { Snapshot } from '../../../../core/domain/Snapshot';

@injectable()
@EntityRepository(Organization)
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
		const organizations = await this.baseRepository
			.createQueryBuilder('organization')
			.innerJoinAndSelect(
				'organization._snapshots',
				'snapshots',
				'snapshots."OrganizationId" = organization.id AND snapshots."startDate" <= :at AND snapshots."endDate" > :at',
				{ at }
			)
			.getMany();

		organizations.forEach((organization) => {
			//temporary until we use it as aggregate root
			organization.currentSnapshot().organization = organization;
		});

		return organizations;
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
			);
	}

	async saveOne(
		organization: Organization,
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

		// manager is workaround for changes type not correctly persisted https://github.com/typeorm/typeorm/issues/7558
		await baseRepo.save([...organization.snapshots], {});

		return organization;
	}

	async save(organizations: Organization[]): Promise<Organization[]> {
		await this.baseRepository.manager.transaction(
			async (transactionalEntityManager: EntityManager) => {
				for (const organization of organizations) {
					await this.saveOne(organization, transactionalEntityManager);
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
