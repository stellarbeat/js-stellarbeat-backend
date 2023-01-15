import { Entity, Column, OneToMany } from 'typeorm';
import PublicKey from './PublicKey';
import NodeSnapShot from './NodeSnapShot';
import { VersionedEntity } from '../../../core/domain/VersionedEntity';
import { Snapshot } from '../../../core/domain/Snapshot';

export interface NodeProps {
	ip: string | null;
	port: number | null;
}
//todo: extend VersionedEntity and deprecate NodeSnapshotter
@Entity('node')
export default class Node extends VersionedEntity<NodeSnapShot> {
	@Column(() => PublicKey)
	publicKey: PublicKey;

	@Column('timestamptz')
	dateDiscovered: Date;

	@OneToMany(() => NodeSnapShot, (snapshot) => snapshot._node, {
		cascade: false, //TODO: when we switch to Node as aggregate over NodeSnapShot, we can cascade from here
		nullable: false
	})
	protected _snapshots?: NodeSnapShot[];

	currentSnapshot(): NodeSnapShot {
		return super.currentSnapshot();
	}

	protected constructor(
		publicKey: PublicKey,
		dateDiscovered = new Date(),
		snapshots: [NodeSnapShot]
	) {
		super(snapshots);
		this.publicKey = publicKey;
		this.dateDiscovered = dateDiscovered;
	}

	static create(time: Date, publicKey: PublicKey, props: NodeProps): Node {
		const snapshot = new NodeSnapShot(time, props.ip, props.port);
		const node = new Node(publicKey, time, [snapshot]);
		snapshot.node = node;
		return node;
	}

	archive() {
		this.currentSnapshot().endDate = Snapshot.MAX_DATE;
	}
}
