import { Entity, Column, ManyToOne, Index } from 'typeorm';

import NodeQuorumSet from './NodeQuorumSet';
import NodeGeoDataLocation from './NodeGeoDataLocation';
import NodeDetails from './NodeDetails';
import { Node as NodeDTO, NodeGeoData } from '@stellarbeat/js-stellar-domain';
import Organization from '../organization/Organization';
import NodeMeasurement from './NodeMeasurement';
import { NodeSnapShot as NodeSnapShotDTO } from '@stellarbeat/js-stellar-domain';
import { NodeMeasurementAverage } from './NodeMeasurementAverage';
import Node from './Node';
import { Snapshot } from '../../../core/domain/Snapshot';

/**
 * Type 2 Slowly Changing Dimensions
 */
@Entity('node_snap_shot')
export default class NodeSnapShot extends Snapshot {
	@Index()
	@ManyToOne(() => Node, {
		nullable: false,
		cascade: ['insert'],
		eager: true
	})
	protected _node?: Node;

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

	@ManyToOne(() => NodeGeoDataLocation, {
		nullable: true,
		cascade: ['insert'],
		eager: true
	})
	protected _geoData?: NodeGeoDataLocation | null = null;

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
	constructor(node: Node, startDate: Date, ip: string, port: number) {
		super(startDate);
		this.node = node;
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

	set node(node: Node) {
		this._node = node;
	}

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

	quorumSetChanged(node: NodeDTO): boolean {
		if (this.quorumSet === null && node.quorumSet && node.quorumSet.validators)
			return node.quorumSet.hasValidators();

		if (this.quorumSet === null) {
			return false;
		}

		return this.quorumSet.hash !== node.quorumSetHashKey;
	}

	nodeIpPortChanged(node: NodeDTO): boolean {
		return this.ip !== node.ip || this.port !== node.port;
	}

	nodeDetailsChanged(node: NodeDTO): boolean {
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

	organizationChanged(node: NodeDTO): boolean {
		if (this.organization === null) return node.organizationId !== null;

		return this.organization.organizationId.value !== node.organizationId;
	}

	geoDataChanged(geoData: NodeGeoDataLocation | null): boolean {
		if (this.geoData === null) {
			return geoData !== null;
		}
		if (geoData === null) {
			return true;
		}
		return !this.geoData.equals(
			NodeGeoDataLocation.create({
				latitude: geoData.latitude,
				longitude: geoData.longitude,
				countryCode: geoData.countryCode,
				countryName: geoData.countryName
			})
		);
	}

	hasNodeChanged(crawledNode: NodeDTO): boolean {
		if (this.quorumSetChanged(crawledNode)) return true;
		if (this.nodeIpPortChanged(crawledNode)) return true;
		if (this.nodeDetailsChanged(crawledNode)) return true;

		let geoData: NodeGeoDataLocation | null = null;
		if (
			!(
				crawledNode.geoData.latitude === null &&
				crawledNode.geoData.longitude === null
			)
		)
			geoData = NodeGeoDataLocation.create({
				latitude: crawledNode.geoData.latitude,
				longitude: crawledNode.geoData.longitude,
				countryCode: crawledNode.geoData.countryCode,
				countryName: crawledNode.geoData.countryName
			});
		if (this.geoDataChanged(geoData)) return true;

		return this.organizationChanged(crawledNode);
	}

	toNodeDTO(
		time: Date,
		measurement?: NodeMeasurement,
		measurement24HourAverage?: NodeMeasurementAverage,
		measurement30DayAverage?: NodeMeasurementAverage
	): NodeDTO {
		const node = new NodeDTO(this.node.publicKey.value, this.ip, this.port);
		node.dateDiscovered = this.node.dateDiscovered;
		node.dateUpdated = time;
		if (this.quorumSet) {
			node.quorumSet = this.quorumSet.quorumSet;
			node.quorumSetHashKey = this.quorumSet.hash;
		}

		node.geoData = new NodeGeoData();
		if (this.geoData !== null) {
			node.geoData.latitude = this.geoData.latitude;
			node.geoData.longitude = this.geoData.longitude;
			node.geoData.countryCode = this.geoData.countryCode;
			node.geoData.countryName = this.geoData.countryName;
		}
		if (this.nodeDetails) {
			this.nodeDetails.updateNodeDTOWithDetails(node);
		}
		if (this.organization) {
			node.organizationId = this.organization.organizationId.value;
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

	toJSON(): NodeSnapShotDTO {
		return new NodeSnapShotDTO(
			this.startDate,
			this.endDate,
			this.toNodeDTO(this.startDate)
		);
	}

	copy(startDate: Date): this {
		throw new Error('Method not implemented.');
	}
}
