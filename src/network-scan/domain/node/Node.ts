import { Entity, Column, OneToMany } from 'typeorm';
import PublicKey from './PublicKey';
import NodeSnapShot from './NodeSnapShot';
import { VersionedEntity } from '../../../core/domain/VersionedEntity';
import NodeDetails from './NodeDetails';
import NodeQuorumSet from './NodeQuorumSet';
import NodeGeoDataLocation from './NodeGeoDataLocation';
import NodeMeasurement from './NodeMeasurement';
import moreThanOneDayApart from './scan/MoreThanOneDayApart';

export interface NodeProps {
	ip: string;
	port: number;
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

	get isp(): string | null {
		return this.currentSnapshot().isp;
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

	get lastIpChange(): Date | null {
		return this.currentSnapshot().lastIpChange;
	}

	get homeDomain(): string | null {
		return this.currentSnapshot().homeDomain;
	}

	get versionStr(): string | null {
		return this.currentSnapshot().versionStr;
	}

	get overlayMinVersion(): number | null {
		return this.currentSnapshot().overlayMinVersion;
	}

	get overlayVersion(): number | null {
		return this.currentSnapshot().overlayVersion;
	}

	get ledgerVersion(): number | null {
		return this.currentSnapshot().ledgerVersion;
	}

	isValidator(): boolean {
		return this.quorumSet !== null;
	}

	isValidating(): boolean {
		return this.latestMeasurement()?.isValidating || false;
	}

	isTrackingFullValidator(): boolean {
		return this.latestMeasurement()?.isFullValidator || false;
	}

	isActive(): boolean {
		return this.latestMeasurement()?.isActive || false;
	}

	isWatcher(): boolean {
		return !this.isValidator();
	}

	updateHomeDomain(homeDomain: string, time: Date): void {
		if (this.currentSnapshot().homeDomain === homeDomain) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().homeDomain = homeDomain;
	}

	updateVersionStr(versionStr: string, time: Date): void {
		if (this.currentSnapshot().versionStr === versionStr) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().versionStr = versionStr;
	}

	updateOverlayMinVersion(overlayMinVersion: number, time: Date): void {
		if (this.currentSnapshot().overlayMinVersion === overlayMinVersion) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().overlayMinVersion = overlayMinVersion;
	}

	updateOverlayVersion(overlayVersion: number, time: Date): void {
		if (this.currentSnapshot().overlayVersion === overlayVersion) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().overlayVersion = overlayVersion;
	}

	updateLedgerVersion(ledgerVersion: number, time: Date): void {
		if (this.currentSnapshot().ledgerVersion === ledgerVersion) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().ledgerVersion = ledgerVersion;
	}

	updateQuorumSet(quorumSet: NodeQuorumSet, time: Date): void {
		const otherQuorumSet = this.currentSnapshot().quorumSet;
		if (otherQuorumSet !== null && otherQuorumSet.equals(quorumSet)) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().quorumSet = quorumSet;
	}

	demoteToWatcher(time: Date): void {
		if (this.isWatcher()) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().quorumSet = null;
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

		if (!this.isIpChangeAllowed(time)) {
			return;
		}

		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().ip = ip;
		this.currentSnapshot().port = port;
		this.currentSnapshot().lastIpChange = time;
	}

	updateIsp(isp: string, time: Date): void {
		if (this.currentSnapshot().isp === isp) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().isp = isp;
	}

	updateDetails(details: NodeDetails, time: Date): void {
		const otherDetails = this.currentSnapshot().nodeDetails;
		if (otherDetails !== null && otherDetails.equals(details)) return;
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().nodeDetails = details;
	}

	private isIpChangeAllowed(time: Date): boolean {
		if (this.lastIpChange === null) return true;
		return moreThanOneDayApart(time, this.lastIpChange);
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
		const snapshot = new NodeSnapShot(time, props.ip, props.port);
		return new Node(publicKey, time, [snapshot], []);
	}
}
