import {
	Entity,
	Column,
	ManyToOne,
	PrimaryGeneratedColumn,
	Index
} from 'typeorm';

import NodeQuorumSetStorage from './NodeQuorumSetStorage';
import NodeGeoDataStorage from './NodeGeoDataStorage';
import NodeDetailsStorage from './NodeDetailsStorage';
import NodePublicKeyStorage from './NodePublicKeyStorage';
import { Node } from '@stellarbeat/js-stellar-domain';
import OrganizationIdStorage from './OrganizationIdStorage';
import NodeMeasurementV2 from './NodeMeasurementV2';
import { NodeMeasurementV2Average } from '../repositories/NodeMeasurementV2Repository';
import { NodeSnapShot as DomainNodeSnapShot } from '@stellarbeat/js-stellar-domain';

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
	@ManyToOne(() => NodePublicKeyStorage, {
		nullable: false,
		cascade: ['insert'],
		eager: true
	})
	protected _nodePublicKey?: NodePublicKeyStorage;

	@Column('text')
	ip: string;

	@Column('integer')
	port: number;

	//Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
	@ManyToOne(() => NodeDetailsStorage, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _nodeDetails?: NodeDetailsStorage | null;

	//Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
	@ManyToOne(() => NodeQuorumSetStorage, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _quorumSet?: NodeQuorumSetStorage | null;

	//Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
	@ManyToOne(() => NodeGeoDataStorage, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _geoData?: NodeGeoDataStorage | null = null;

	//Do not initialize on null, or you cannot make the difference between 'not selected in query' (=undefined), or 'actually null' (=null)
	@ManyToOne(() => OrganizationIdStorage, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _organizationIdStorage?: OrganizationIdStorage | null;

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
	constructor(
		nodeStorage: NodePublicKeyStorage,
		startDate: Date,
		ip: string,
		port: number
	) {
		this.nodePublicKey = nodeStorage;
		this.ip = ip;
		this.port = port;
		this.startDate = startDate;
	}

	set organizationIdStorage(
		organizationIdStorage: OrganizationIdStorage | null
	) {
		this._organizationIdStorage = organizationIdStorage;
	}

	get organizationIdStorage() {
		if (this._organizationIdStorage === undefined) {
			throw new Error('Organization snapshot not loaded from database');
		}

		return this._organizationIdStorage;
	}

	set nodePublicKey(nodePublicKeyStorage: NodePublicKeyStorage) {
		this._nodePublicKey = nodePublicKeyStorage;
	}

	get nodePublicKey() {
		if (this._nodePublicKey === undefined) {
			throw new Error('Node public key not loaded from database');
		}

		return this._nodePublicKey;
	}

	set nodeDetails(nodeDetails: NodeDetailsStorage | null) {
		this._nodeDetails = nodeDetails;
	}

	get nodeDetails() {
		if (this._nodeDetails === undefined) {
			throw new Error('Node details not loaded from database');
		}

		return this._nodeDetails;
	}

	set quorumSet(quorumSet: NodeQuorumSetStorage | null) {
		this._quorumSet = quorumSet;
	}

	get quorumSet() {
		if (this._quorumSet === undefined) {
			throw new Error('Node quorumSet not loaded from database');
		}

		return this._quorumSet;
	}

	set geoData(geoData: NodeGeoDataStorage | null) {
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
		if (this.organizationIdStorage === null)
			return node.organizationId !== null;

		return this.organizationIdStorage.organizationId !== node.organizationId;
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
		measurement?: NodeMeasurementV2,
		measurement24HourAverage?: NodeMeasurementV2Average,
		measurement30DayAverage?: NodeMeasurementV2Average
	): Node {
		const node = new Node(this.nodePublicKey.publicKey, this.ip, this.port);
		node.dateDiscovered = this.nodePublicKey.dateDiscovered;
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
		if (this.organizationIdStorage) {
			node.organizationId = this.organizationIdStorage.organizationId;
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
