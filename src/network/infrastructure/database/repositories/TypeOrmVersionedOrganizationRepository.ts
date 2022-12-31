import { injectable } from 'inversify';
import { EntityRepository, Repository } from 'typeorm';
import { NetworkId } from '../../../domain/NetworkId';
import VersionedOrganization from '../../../domain/VersionedOrganization';
import { VersionedOrganizationRepository } from '../../../domain/VersionedOrganizationRepository';
import { OrganizationId } from '../../../domain/OrganizationId';

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
