import { OrganizationId } from './OrganizationId';
import VersionedOrganization from './VersionedOrganization';

export interface VersionedOrganizationRepository {
	findByOrganizationId(
		organizationId: OrganizationId
	): Promise<VersionedOrganization | undefined>;
	save(versionedOrganization: VersionedOrganization): Promise<void>;
	save(versionedOrganizations: VersionedOrganization[]): Promise<void>;
}
