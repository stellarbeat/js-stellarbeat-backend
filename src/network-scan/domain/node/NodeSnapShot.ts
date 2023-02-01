import { Entity, Column, ManyToOne, Index } from 'typeorm';

import NodeQuorumSet from './NodeQuorumSet';
import NodeGeoDataLocation from './NodeGeoDataLocation';
import NodeDetails from './NodeDetails';
import Node from './Node';
import { Snapshot } from '../../../core/domain/Snapshot';
import moreThanOneDayApart from './scan/MoreThanOneDayApart';
import { QuorumSet } from '@stellarbeat/js-stellarbeat-shared';

/**
 * Type 2 Slowly Changing Dimensions
 */
@Entity('node_snap_shot')
export default class NodeSnapShot extends Snapshot {
	//@deprecated, typeorm requires this property and it has to be public, hopefully this will be resolved in a later version
	@Index()
	@ManyToOne(() => Node, {
		nullable: false,
		cascade: false,
		eager: true //move to false after archiver refactoring
	})
	public _node?: Node;

	@Column('text')
	ip: string;

	@Column('integer')
	port: number;

	@Column('text', { nullable: true })
	isp: string | null = null;

	@Column('text', { nullable: true })
	homeDomain: string | null = null;

	@Column('integer', { nullable: true })
	ledgerVersion: number | null = null;

	@Column('integer', { nullable: true })
	overlayVersion: number | null = null;

	@Column('integer', { nullable: true })
	overlayMinVersion: number | null = null;

	@Column('text', { nullable: true })
	versionStr: string | null = null;

	@ManyToOne(() => NodeDetails, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _nodeDetails?: NodeDetails | null = null;

	//Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
	@ManyToOne(() => NodeQuorumSet, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _quorumSet?: NodeQuorumSet | null = null;

	@ManyToOne(() => NodeGeoDataLocation, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _geoData?: NodeGeoDataLocation | null = null;

	@Column('timestamptz', { nullable: true })
	@Index()
	public lastIpChange: Date | null = null;

	//typeOrm does not fill in constructor parameters. should be fixed in a later version.
	constructor(startDate: Date, ip: string, port: number) {
		super(startDate);
		this.ip = ip;
		this.port = port;
	}

	isIpChangeAllowed(time: Date): boolean {
		if (this.lastIpChange === null) return true;
		return moreThanOneDayApart(time, this.lastIpChange);
	}

	//@deprecated: TODO REMOVE
	set node(node: Node) {
		this._node = node;
	}

	//@deprecated
	get node(): Node {
		if (this._node === undefined) {
			throw new Error('Node not loaded from database');
		}

		return this._node;
	}

	set nodeDetails(nodeDetails: NodeDetails | null) {
		this._nodeDetails = nodeDetails;
	}

	get nodeDetails() {
		if (this._nodeDetails === undefined) {
			throw new Error('Node details not loaded from database');
		}

		return this._nodeDetails;
	}

	set quorumSet(quorumSet: NodeQuorumSet | null) {
		this._quorumSet = quorumSet;
	}

	get quorumSet() {
		if (this._quorumSet === undefined) {
			throw new Error('Node quorumSet not loaded from database');
		}

		return this._quorumSet;
	}

	set geoData(geoData: NodeGeoDataLocation | null) {
		this._geoData = geoData;
	}

	get geoData(): NodeGeoDataLocation | null {
		if (this._geoData === undefined) {
			throw new Error('Hydration failed');
		}

		return this._geoData;
	}

	quorumSetChanged(
		quorumSetHash: string | null,
		quorumSet: QuorumSet
	): boolean {
		if (this.quorumSet === null && quorumSet.validators)
			return quorumSet.hasValidators();

		if (this.quorumSet === null) {
			return false;
		}

		return this.quorumSet.hash !== quorumSetHash;
	}

	nodeIpPortChanged(ip: string, port: number): boolean {
		return this.ip !== ip || this.port !== port;
	}

	nodeDetailsChanged(nodeDetails: NodeDetails | null): boolean {
		if (this.nodeDetails === null) {
			return nodeDetails !== null;
		}

		if (nodeDetails === null) {
			return true;
		}

		return !this.nodeDetails.equals(nodeDetails);
	}

	geoDataChanged(geoData: NodeGeoDataLocation | null): boolean {
		if (this.geoData === null) {
			return geoData !== null;
		}

		if (geoData === null) {
			return true;
		}

		return !this.geoData.equals(geoData);
	}

	hasNodeChanged(
		ip: string,
		port: number,
		quorumSetHash: string | null,
		quorumSet: QuorumSet,
		nodeDetails: NodeDetails | null,
		geoData: NodeGeoDataLocation | null,
		isp: string | null,
		homeDomain: string | null,
		ledgerVersion: number | null,
		overlayVersion: number | null,
		overlayMinVersion: number | null,
		versionStr: string | null
	): boolean {
		if (this.quorumSetChanged(quorumSetHash, quorumSet)) return true;
		if (this.nodeIpPortChanged(ip, port)) return true;
		if (this.nodeDetailsChanged(nodeDetails)) return true;
		if (this.isp !== isp) return true;
		if (this.homeDomain !== homeDomain) return true;
		if (this.ledgerVersion !== ledgerVersion) return true;
		if (this.overlayVersion !== overlayVersion) return true;
		if (this.overlayMinVersion !== overlayMinVersion) return true;
		if (this.versionStr !== versionStr) return true;
		return this.geoDataChanged(geoData);
	}

	isActive(): boolean {
		return this.endDate.getTime() === NodeSnapShot.MAX_DATE.getTime();
	}

	copy(startDate: Date): this {
		const copy = new NodeSnapShot(startDate, this.ip, this.port) as this;
		copy.lastIpChange = this.lastIpChange;
		copy.isp = this.isp;
		copy.homeDomain = this.homeDomain;
		copy.ledgerVersion = this.ledgerVersion;
		copy.overlayVersion = this.overlayVersion;
		copy.overlayMinVersion = this.overlayMinVersion;
		copy.versionStr = this.versionStr;
		copy.nodeDetails = this.nodeDetails;
		copy.quorumSet = this.quorumSet;
		copy.geoData = this.geoData;

		return copy;
	}
}
