import { Entity, Column, Repository, PrimaryGeneratedColumn } from 'typeorm';
import PublicKey from './PublicKey';

export type NodeRepository = Repository<Node>;

//todo: extend VersionedEntity and deprecate NodeSnapshotter
@Entity('node')
export default class Node {
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
