import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	Index,
	Repository
} from 'typeorm';
import { PublicKey } from '@stellarbeat/js-stellar-domain';

export type NodePublicKeyStorageRepository = Repository<NodePublicKeyStorage>;

export interface SnapShotUniqueIdentifier {}

@Entity('node_public_key')
export default class NodePublicKeyStorage implements SnapShotUniqueIdentifier {
	@PrimaryGeneratedColumn()
	// @ts-ignore
	id: number;

	@Column('varchar', { length: 56 })
	@Index({ unique: true })
	publicKey: PublicKey;

	@Column('timestamptz')
	dateDiscovered: Date;

	constructor(publicKey: PublicKey, dateDiscovered = new Date()) {
		this.publicKey = publicKey;
		this.dateDiscovered = dateDiscovered;
	}
}
