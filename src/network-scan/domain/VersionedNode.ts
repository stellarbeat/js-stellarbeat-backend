import { Entity, Column, Repository, PrimaryGeneratedColumn } from 'typeorm';
import PublicKey from './PublicKey';

export type VersionedNodeRepository = Repository<VersionedNode>;

//todo: extend VersionedEntity and deprecate NodeSnapshotter
@Entity('node')
export default class VersionedNode {
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
