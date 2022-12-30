import {
	Entity,
	Column,
	ManyToOne,
	PrimaryGeneratedColumn,
	Index
} from 'typeorm';

import NodeQuorumSet from './NodeQuorumSet';
import NodeGeoDataLocation from './NodeGeoDataLocation';
import NodeDetails from './NodeDetails';
import { Node } from '@stellarbeat/js-stellar-domain';
import VersionedOrganization from './VersionedOrganization';
import NodeMeasurement from './measurement/NodeMeasurement';
import { NodeSnapShot as DomainNodeSnapShot } from '@stellarbeat/js-stellar-domain';
import { NodeMeasurementAverage } from './measurement/NodeMeasurementAverage';
import VersionedNode from './VersionedNode';

export interface SnapShot {
	endDate: Date;
}

/**
 * Type 2 Slowly Changing Dimensions
 */
@Entity('node_snap_shot')
export default class NodeSnapShot implements SnapShot {
	@PrimaryGeneratedColumn()
	// @ts-ignore
	id: number;

	@Index()
	@ManyToOne(() => VersionedNode, {
		nullable: false,
		cascade: ['insert'],
		eager: true
	})
	protected _node?: VersionedNode;

	@Column('text')
	ip: string;

	@Column('integer')
	port: number;

	//Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
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

	//Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
	@ManyToOne(() => NodeGeoDataLocation, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _geoData?: NodeGeoDataLocation | null = null;

	//Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
	@ManyToOne(() => VersionedOrganization, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _organization?: VersionedOrganization | null;

	@Column('timestamptz', { nullable: false })
	@Index()
	public startDate: Date;

	@Column('timestamptz', { nullable: false })
	@Index()
	public endDate: Date = NodeSnapShot.MAX_DATE;

	//We want to filter out constant changes in ip and ports due to badly configured validators.
	@Column('bool')
	ipChange = false;

	static readonly MAX_DATE = new Date(Date.UTC(9999, 11, 31, 23, 59, 59));

	//typeOrm does not fill in constructor parameters. should be fixed in a later version.
	constructor(node: VersionedNode, startDate: Date, ip: string, port: number) {
		this.node = node;
		this.ip = ip;
		this.port = port;
		this.startDate = startDate;
	}

	set organization(organization: VersionedOrganization | null) {
		this._organization = organization;
	}

	get organization() {
		if (this._organization === undefined) {
			throw new Error('Organization not loaded from database');
		}

		return this._organization;
	}

	set node(node: VersionedNode) {
		this._node = node;
	}

	get node(): VersionedNode {
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

	get geoData() {
		if (this._geoData === undefined) {
			throw new Error('Node geoData not loaded from database');
		}

		return this._geoData;
	}

	quorumSetChanged(node: Node): boolean {
		if (this.quorumSet === null && node.quorumSet && node.quorumSet.validators)
			return node.quorumSet.hasValidators();

		if (this.quorumSet === null) {
			return false;
		}

		return this.quorumSet.hash !== node.quorumSetHashKey;
	}

	nodeIpPortChanged(node: Node): boolean {
		return this.ip !== node.ip || this.port !== node.port;
	}

	nodeDetailsChanged(node: Node): boolean {
		if (this.nodeDetails === null)
			return (
				node.versionStr !== null ||
				node.overlayVersion !== null ||
				node.overlayMinVersion !== null ||
				node.ledgerVersion !== null
			);

		return (
			this.nodeDetails.alias !== node.alias ||
			this.nodeDetails.historyUrl !== node.historyUrl ||
			this.nodeDetails.homeDomain !== node.homeDomain ||
			this.nodeDetails.host !== node.host ||
			this.nodeDetails.isp !== node.isp ||
			this.nodeDetails.ledgerVersion !== node.ledgerVersion ||
			this.nodeDetails.name !== node.name ||
			this.nodeDetails.overlayMinVersion !== node.overlayMinVersion ||
			this.nodeDetails.overlayVersion !== node.overlayVersion ||
			this.nodeDetails.versionStr !== node.versionStr
		);
	}

	organizationChanged(node: Node): boolean {
		if (this.organization === null) return node.organizationId !== null;

		return this.organization.organizationId !== node.organizationId;
	}

	geoDataChanged(node: Node): boolean {
		if (this.geoData === null) {
			return node.geoData.latitude !== null || node.geoData.longitude !== null;
		} else
			return (
				this.geoData.latitude !== node.geoData.latitude ||
				this.geoData.longitude !== node.geoData.longitude
			);
	}

	hasNodeChanged(crawledNode: Node): boolean {
		if (this.quorumSetChanged(crawledNode)) return true;
		if (this.nodeIpPortChanged(crawledNode)) return true;
		if (this.nodeDetailsChanged(crawledNode)) return true;
		if (this.geoDataChanged(crawledNode)) return true;

		return this.organizationChanged(crawledNode);
	}

	toNode(
		//todo: move to factory
		time: Date,
		measurement?: NodeMeasurement,
		measurement24HourAverage?: NodeMeasurementAverage,
		measurement30DayAverage?: NodeMeasurementAverage
	): Node {
		const node = new Node(this.node.publicKey.value, this.ip, this.port);
		node.dateDiscovered = this.node.dateDiscovered;
		node.dateUpdated = time;
		if (this.quorumSet) {
			node.quorumSet = this.quorumSet.quorumSet;
			node.quorumSetHashKey = this.quorumSet.hash;
		}
		if (this.geoData) {
			node.geoData = this.geoData.toGeoData();
		}
		if (this.nodeDetails) {
			this.nodeDetails.updateNodeWithDetails(node);
		}
		if (this.organization) {
			node.organizationId = this.organization.organizationId;
		}

		if (measurement) {
			node.active = measurement.isActive;
			node.isValidating = measurement.isValidating;
			node.isFullValidator = measurement.isFullValidator;
			node.overLoaded = measurement.isOverLoaded;
			node.index = measurement.index / 100;
			node.activeInScp = measurement.isActiveInScp;
			node.historyArchiveHasError = measurement.historyArchiveHasError;
		}

		if (measurement24HourAverage) {
			node.statistics.has24HourStats = true;
			node.statistics.active24HoursPercentage =
				measurement24HourAverage.activeAvg;
			node.statistics.validating24HoursPercentage =
				measurement24HourAverage.validatingAvg;
			node.statistics.overLoaded24HoursPercentage =
				measurement24HourAverage.overLoadedAvg;
		}

		if (measurement30DayAverage) {
			node.statistics.has30DayStats = true;
			node.statistics.active30DaysPercentage =
				measurement30DayAverage.activeAvg;
			node.statistics.validating30DaysPercentage =
				measurement30DayAverage.validatingAvg;
			node.statistics.overLoaded30DaysPercentage =
				measurement30DayAverage.overLoadedAvg;
		}

		return node;
	}

	isActive(): boolean {
		return this.endDate.getTime() === NodeSnapShot.MAX_DATE.getTime();
	}

	toString(): string {
		return `NodeSnapShot (id:${this.id})`;
	}

	toJSON(): DomainNodeSnapShot {
		return new DomainNodeSnapShot(
			this.startDate,
			this.endDate,
			this.toNode(this.startDate)
		);
	}
}
