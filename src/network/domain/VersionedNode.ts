import { Entity, Column, Repository, PrimaryGeneratedColumn } from 'typeorm';
import PublicKey from './PublicKey';

export type VersionedNodeRepository = Repository<VersionedNode>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SnapShotUniqueIdentifier {}

//todo: extend VersionedEntity and deprecate NodeSnapshotter
@Entity('node')
export default class VersionedNode implements SnapShotUniqueIdentifier {
	@PrimaryGeneratedColumn()
	id?: number;

	@Column(() => PublicKey)
	publicKey: PublicKey;

	@Column('timestamptz')
	dateDiscovered: Date;

	constructor(publicKey: PublicKey, dateDiscovered = new Date()) {
		this.publicKey = publicKey;
		this.dateDiscovered = dateDiscovered;
	}
}
