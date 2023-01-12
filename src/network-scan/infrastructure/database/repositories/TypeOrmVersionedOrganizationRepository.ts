import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';
import Organization from '../../../domain/organization/Organization';
import { OrganizationRepository } from '../../../domain/organization/OrganizationRepository';
import { OrganizationId } from '../../../domain/organization/OrganizationId';

@injectable()
@EntityRepository(Organization)
export class TypeOrmVersionedOrganizationRepository
	extends Repository<Organization>
	implements OrganizationRepository
{
	async findByOrganizationId(
		organizationId: OrganizationId
	): Promise<Organization | undefined> {
		return await this.findOne({
			organizationId: organizationId
		});
	}
}
