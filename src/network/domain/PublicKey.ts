import {
	Entity,
	Column,
	Index,
	Repository,
	PrimaryGeneratedColumn
} from 'typeorm';

export type PublicKeyRepository = Repository<PublicKey>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SnapShotUniqueIdentifier {}

@Entity('node_public_key')
export default class PublicKey implements SnapShotUniqueIdentifier {
	@PrimaryGeneratedColumn()
	id?: number;

	@Column('varchar', { length: 56 })
	@Index({ unique: true })
	publicKey: string;

	@Column('timestamptz')
	dateDiscovered: Date;

	constructor(publicKey: string, dateDiscovered = new Date()) {
		this.publicKey = publicKey;
		this.dateDiscovered = dateDiscovered;
	}
}
