import OrganizationSnapShot from '../OrganizationSnapShot';
import Organization from '../Organization';
import { SnapShotRepository } from '../../snapshotting/SnapShotRepository';

export interface OrganizationSnapShotRepository extends SnapShotRepository {
	findActive(): Promise<OrganizationSnapShot[]>;

	findActiveAtTime(time: Date): Promise<OrganizationSnapShot[]>;

	findLatestByOrganization(
		organization: Organization,
		at: Date
	): Promise<OrganizationSnapShot[]>;

	findLatest(at: Date): Promise<OrganizationSnapShot[]>;

	save(snapShot: OrganizationSnapShot[]): Promise<OrganizationSnapShot[]>;
}