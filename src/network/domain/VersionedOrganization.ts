import {
	Entity,
	Column,
	Index,
	Repository,
	PrimaryGeneratedColumn
} from 'typeorm';
import { SnapShotUniqueIdentifier } from '../infrastructure/database/entities/VersionedNode';

export type VersionedOrganizationRepository = Repository<VersionedOrganization>;

/**
 * Stores the unique organization id's, regardless of versions.
 */
@Entity('organization')
export default class VersionedOrganization implements SnapShotUniqueIdentifier {
	@PrimaryGeneratedColumn()
	id?: number;

	@Column('text', { nullable: false })
	@Index({ unique: true })
	organizationId: string;

	@Column('text', { nullable: true })
	homeDomain: string | null = null;
	//null is allowed and value is not unique for backwards compatibility with older versions of stellarbeat

	@Column('timestamptz')
	dateDiscovered: Date;

	constructor(organizationId: string, dateDiscovered: Date = new Date()) {
		this.organizationId = organizationId;
		this.dateDiscovered = dateDiscovered;
	}
}
