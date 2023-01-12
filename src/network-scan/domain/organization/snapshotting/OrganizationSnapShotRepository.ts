import OrganizationSnapShot from '../OrganizationSnapShot';
import VersionedOrganization from '../VersionedOrganization';
import { SnapShotRepository } from '../../snapshotting/SnapShotRepository';

export interface OrganizationSnapShotRepository extends SnapShotRepository {
	findActive(): Promise<OrganizationSnapShot[]>;

	findActiveAtTime(time: Date): Promise<OrganizationSnapShot[]>;

	findLatestByOrganization(
		organization: VersionedOrganization,
		at: Date
	): Promise<OrganizationSnapShot[]>;

	findLatest(at: Date): Promise<OrganizationSnapShot[]>;

	save(snapShot: OrganizationSnapShot[]): Promise<OrganizationSnapShot[]>;
}
