import { Entity, Column, ManyToOne, Index } from 'typeorm';

import NodeQuorumSet from './NodeQuorumSet';
import NodeGeoDataLocation from './NodeGeoDataLocation';
import NodeDetails from './NodeDetails';
import { QuorumSet } from '@stellarbeat/js-stellar-domain';
import Organization from '../organization/Organization';
import Node from './Node';
import { Snapshot } from '../../../core/domain/Snapshot';

/**
 * Type 2 Slowly Changing Dimensions
 */
@Entity('node_snap_shot')
export default class NodeSnapShot extends Snapshot {
	//@deprecated, typeorm requires this property and it has to be public, hopefully this will be resolved in a later version
	@Index()
	@ManyToOne(() => Node, {
		nullable: false,
		cascade: ['insert'],
		eager: true
	})
	public _node?: Node;

	@Column('text')
	ip: string | null;

	@Column('integer')
	port: number | null;

	@ManyToOne(() => NodeDetails, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _nodeDetails?: NodeDetails | null;

	//Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
	@ManyToOne(() => NodeQuorumSet, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _quorumSet?: NodeQuorumSet | null;

	@ManyToOne(() => NodeGeoDataLocation, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _geoData?: NodeGeoDataLocation | null = null;

	//@deprecated. Organization will own the relation with node. Node will only have a 'homedomain' property. This better reflects the real world
	//Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
	@ManyToOne(() => Organization, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _organization?: Organization | null;

	//We want to filter out constant changes in ip and ports due to badly configured validators.
	@Column('bool')
	ipChange = false;

	//typeOrm does not fill in constructor parameters. should be fixed in a later version.
	constructor(startDate: Date, ip: string | null, port: number | null) {
		super(startDate);
		this.ip = ip;
		this.port = port;
	}

	set organization(organization: Organization | null) {
		this._organization = organization;
	}

	get organization() {
		if (this._organization === undefined) {
			throw new Error('Organization not loaded from database');
		}

		return this._organization;
	}

	//@deprecated
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

	organizationChanged(organizationId: string | null): boolean {
		if (this.organization === null) return organizationId !== null;

		return this.organization.organizationId.value !== organizationId;
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
		organizationId: string | null,
		geoData: NodeGeoDataLocation | null
	): boolean {
		if (this.quorumSetChanged(quorumSetHash, quorumSet)) return true;
		if (this.nodeIpPortChanged(ip, port)) return true;
		if (this.nodeDetailsChanged(nodeDetails)) return true;
		if (this.geoDataChanged(geoData)) return true;
		return this.organizationChanged(organizationId);
	}

	isActive(): boolean {
		return this.endDate.getTime() === NodeSnapShot.MAX_DATE.getTime();
	}

	copy(startDate: Date): this {
		throw new Error('Method not implemented.');
	}
}
