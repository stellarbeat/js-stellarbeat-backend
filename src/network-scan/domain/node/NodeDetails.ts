import { Entity, Column } from 'typeorm';
import { Node as NodeDTO } from '@stellarbeat/js-stellar-domain';
import { IdentifiedValueObject } from '../../../core/domain/IdentifiedValueObject';

export interface NodeDetailsProps {
	host: string | null;
	name: string | null;
	homeDomain: string | null;
	historyUrl: string | null;
	alias: string | null;
	isp: string | null;
	ledgerVersion: number | null;
	overlayVersion: number | null;
	overlayMinVersion: number | null;
	versionStr: string | null;
}

@Entity('node_details')
export default class NodeDetails extends IdentifiedValueObject {
	@Column('text', { nullable: true })
	readonly host: string | null = null;

	@Column('text', { nullable: true })
	readonly name: string | null = null;

	@Column('text', { nullable: true })
	readonly homeDomain: string | null = null;

	@Column('text', { nullable: true })
	readonly historyUrl: string | null = null;

	@Column('text', { nullable: true })
	readonly alias: string | null = null;

	@Column('text', { nullable: true })
	readonly isp: string | null = null;

	@Column('integer', { nullable: true })
	readonly ledgerVersion: number | null = null;

	@Column('integer', { nullable: true })
	readonly overlayVersion: number | null = null;

	@Column('integer', { nullable: true })
	readonly overlayMinVersion: number | null = null;

	@Column('text', { nullable: true })
	readonly versionStr: string | null = null;

	private constructor(
		host: string | null = null,
		homeDomain: string | null = null,
		name: string | null = null,
		historyUrl: string | null = null,
		alias: string | null = null,
		isp: string | null = null,
		ledgerVersion: number | null = null,
		overlayVersion: number | null = null,
		overlayMinVersion: number | null = null,
		versionStr: string | null = null
	) {
		super();
		this.host = host;
		this.homeDomain = homeDomain;
		this.name = name;
		this.historyUrl = historyUrl;
		this.alias = alias;
		this.isp = isp;
		this.ledgerVersion = ledgerVersion;
		this.overlayVersion = overlayVersion;
		this.overlayMinVersion = overlayMinVersion;
		this.versionStr = versionStr;
	}

	static create(props: NodeDetailsProps) {
		return new this(
			props.host,
			props.homeDomain,
			props.name,
			props.historyUrl,
			props.alias,
			props.isp,
			props.ledgerVersion,
			props.overlayVersion,
			props.overlayMinVersion,
			props.versionStr
		);
	}

	updateNodeDTOWithDetails(node: NodeDTO) {
		node.ledgerVersion = this.ledgerVersion;
		node.overlayVersion = this.overlayVersion;
		node.overlayMinVersion = this.overlayMinVersion;

		node.versionStr = this.versionStr;
		node.host = this.host;
		node.name = this.name;
		node.homeDomain = this.homeDomain;
		node.historyUrl = this.historyUrl;
		node.alias = this.alias;
		node.isp = this.isp;
	}

	equals(other: this): boolean {
		return (
			this.name === other.name &&
			this.host === other.host &&
			this.homeDomain === other.homeDomain &&
			this.historyUrl === other.historyUrl &&
			this.alias === other.alias &&
			this.isp === other.isp &&
			this.ledgerVersion === other.ledgerVersion &&
			this.overlayVersion === other.overlayVersion &&
			this.overlayMinVersion === other.overlayMinVersion &&
			this.versionStr === other.versionStr
		);
	}
}
