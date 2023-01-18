import { Entity, Column, OneToMany } from 'typeorm';
import PublicKey from './PublicKey';
import NodeSnapShot from './NodeSnapShot';
import { VersionedEntity } from '../../../core/domain/VersionedEntity';
import NodeDetails from './NodeDetails';
import NodeQuorumSet from './NodeQuorumSet';
import NodeGeoDataLocation from './NodeGeoDataLocation';
import NodeMeasurement from './NodeMeasurement';

export interface NodeProps {
	ip: string;
	port: number;
	details: NodeDetails | null;
	quorumSet: NodeQuorumSet | null;
	geoData: NodeGeoDataLocation | null;
}

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

	@OneToMany(() => NodeMeasurement, (measurement) => measurement.node, {
		cascade: false
	})
	protected _measurements: NodeMeasurement[];

	//todo: make protected after refactoring
	currentSnapshot(): NodeSnapShot {
		return super.currentSnapshot();
	}

	latestMeasurement(): NodeMeasurement | null {
		if (this._measurements === undefined)
			throw new Error('measurements not hydrated');
		return this._measurements[this._measurements.length - 1] || null;
	}

	addMeasurement(measurement: NodeMeasurement): void {
		this._measurements.push(measurement);
	}

	get ip(): string {
		return this.currentSnapshot().ip;
	}

	get port(): number {
		return this.currentSnapshot().port;
	}

	get details(): NodeDetails | null {
		return this.currentSnapshot().nodeDetails;
	}

	get geoData(): NodeGeoDataLocation | null {
		return this.currentSnapshot().geoData;
	}

	get quorumSet(): NodeQuorumSet | null {
		return this.currentSnapshot().quorumSet;
	}

	updateQuorumSet(quorumSet: NodeQuorumSet, time: Date): void {
		const otherQuorumSet = this.currentSnapshot().quorumSet;
		if (otherQuorumSet !== null && otherQuorumSet.equals(quorumSet)) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().quorumSet = quorumSet;
	}

	updateGeoData(geoData: NodeGeoDataLocation, time: Date): void {
		const otherGeoData = this.currentSnapshot().geoData;
		if (otherGeoData !== null && otherGeoData.equals(geoData)) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().geoData = geoData;
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

	updateDetails(details: NodeDetails, time: Date): void {
		const otherDetails = this.currentSnapshot().nodeDetails;
		if (otherDetails !== null && otherDetails.equals(details)) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().nodeDetails = details;
	}

	protected constructor(
		publicKey: PublicKey,
		dateDiscovered: Date,
		snapshots: [NodeSnapShot],
		measurements: NodeMeasurement[]
	) {
		super(snapshots);
		this.publicKey = publicKey;
		this.dateDiscovered = dateDiscovered;
		this._measurements = measurements;
	}

	static create(time: Date, publicKey: PublicKey, props: NodeProps): Node {
		const snapshot = new NodeSnapShot(
			time,
			props.ip,
			props.port,
			props.details,
			props.quorumSet,
			props.geoData
		);
		const node = new Node(publicKey, time, [snapshot], []);
		snapshot.node = node;
		return node;
	}

	archive(date: Date): void {
		this.currentSnapshot().endDate = date;
	}
}
