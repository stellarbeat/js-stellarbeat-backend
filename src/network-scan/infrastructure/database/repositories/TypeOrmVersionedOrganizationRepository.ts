import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';
import VersionedOrganization from '../../../domain/organization/VersionedOrganization';
import { VersionedOrganizationRepository } from '../../../domain/organization/VersionedOrganizationRepository';
import { OrganizationId } from '../../../domain/organization/OrganizationId';

@injectable()
@EntityRepository(VersionedOrganization)
export class TypeOrmVersionedOrganizationRepository
	extends Repository<VersionedOrganization>
	implements VersionedOrganizationRepository
{
	async findByOrganizationId(
		organizationId: OrganizationId
	): Promise<VersionedOrganization | undefined> {
		return await this.findOne({
			organizationId: organizationId
		});
	}
}
