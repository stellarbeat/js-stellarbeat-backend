import { Entity, Column, OneToMany } from 'typeorm';
import PublicKey from './PublicKey';
import NodeSnapShot from './NodeSnapShot';
import { VersionedEntity } from '../../../core/domain/VersionedEntity';

export interface NodeProps {
	ip: string;
	port: number;
}

//todo: extend VersionedEntity and deprecate NodeSnapshotter
@Entity('node')
export default class Node extends VersionedEntity<NodeSnapShot> {
	@Column(() => PublicKey)
	publicKey: PublicKey;

	@Column('timestamptz')
	dateDiscovered: Date;

	@OneToMany(() => NodeSnapShot, (snapshot) => snapshot._node, {
		cascade: false,
		nullable: false
	})
	protected _snapshots?: NodeSnapShot[];

	//todo: make protected after refactoring
	currentSnapshot(): NodeSnapShot {
		return super.currentSnapshot();
	}

	get ip(): string {
		return this.currentSnapshot().ip;
	}

	get port(): number {
		return this.currentSnapshot().port;
	}

	updateIpPort(ip: string, port: number, time: Date) {
		if (
			this.currentSnapshot().ip === ip &&
			this.currentSnapshot().port === port
		) {
			return;
		}

		if (!this.currentSnapshot().isIpChangeAllowed(time)) {
			return;
		}

		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().ip = ip;
		this.currentSnapshot().port = port;
		this.currentSnapshot().lastIpChange = time;
	}

	protected constructor(
		publicKey: PublicKey,
		dateDiscovered: Date,
		snapshots: [NodeSnapShot]
	) {
		super(snapshots);
		this.publicKey = publicKey;
		this.dateDiscovered = dateDiscovered;
	}

	static create(time: Date, publicKey: PublicKey, props: NodeProps): Node {
		const snapshot = new NodeSnapShot(time, props.ip, props.port);
		snapshot.quorumSet = null;
		snapshot.nodeDetails = null;
		snapshot.geoData = null;
		const node = new Node(publicKey, time, [snapshot]);
		snapshot.node = node;
		return node;
	}

	archive(date: Date): void {
		this.currentSnapshot().endDate = date;
	}
}
