import { Entity, Column, ManyToOne, Index } from 'typeorm';

import NodeQuorumSet from './NodeQuorumSet';
import NodeGeoDataLocation from './NodeGeoDataLocation';
import NodeDetails from './NodeDetails';
import Node from './Node';
import { Snapshot } from '../../../core/domain/Snapshot';

/**
 * Type 2 Slowly Changing Dimensions
 */
@Entity('node_snap_shot')
export default class NodeSnapShot extends Snapshot {
	//@deprecated, typeorm requires this property, and it has to be public, hopefully this will be resolved in a later version
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
	public _quorumSet?: NodeQuorumSet | null = null;

	@ManyToOne(() => NodeGeoDataLocation, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _geoData?: NodeGeoDataLocation | null = null;

	@Column('timestamptz', { nullable: true })
	public lastIpChange: Date | null = null;

	//typeOrm does not fill in constructor parameters. should be fixed in a later version.
	constructor(startDate: Date, ip: string, port: number) {
		super(startDate);
		this.ip = ip;
		this.port = port;
		this.lastIpChange = startDate;
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
