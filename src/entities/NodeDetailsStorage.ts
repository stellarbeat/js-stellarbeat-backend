import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Node } from '@stellarbeat/js-stellar-domain';
import { isNumber, isString } from '../utilities/TypeGuards';

@Entity('node_details')
export default class NodeDetailsStorage {
	@PrimaryGeneratedColumn()
	// @ts-ignore
	id: number;

	@Column('text', { nullable: true })
	host: string | null = null;

	@Column('text', { nullable: true })
	name: string | null = null;

	@Column('text', { nullable: true })
	homeDomain: string | null = null;

	@Column('text', { nullable: true })
	historyUrl: string | null = null;

	@Column('text', { nullable: true })
	alias: string | null = null;

	@Column('text', { nullable: true })
	isp: string | null = null;

	@Column('integer', { nullable: true })
	ledgerVersion: number | null = null;

	@Column('integer', { nullable: true })
	overlayVersion: number | null = null;

	@Column('integer', { nullable: true })
	overlayMinVersion: number | null = null;

	@Column('text', { nullable: true })
	versionStr: string | null = null;

	static fromNode(node: Node) {
		if (node.versionStr === undefined) return null;

		const nodeDetailsStorage = new this();

		nodeDetailsStorage.ledgerVersion = isNumber(node.ledgerVersion)
			? node.ledgerVersion
			: null;
		nodeDetailsStorage.overlayVersion = isNumber(node.overlayVersion)
			? node.overlayVersion
			: null;
		nodeDetailsStorage.overlayMinVersion = isNumber(node.overlayMinVersion)
			? node.overlayMinVersion
			: null;
		nodeDetailsStorage.versionStr = isString(node.versionStr)
			? node.versionStr
			: null;
		nodeDetailsStorage.host = isString(node.host) ? node.host : null;
		nodeDetailsStorage.name = isString(node.name) ? node.name : null;
		nodeDetailsStorage.homeDomain = isString(node.homeDomain)
			? node.homeDomain
			: null;
		nodeDetailsStorage.historyUrl = isString(node.historyUrl)
			? node.historyUrl
			: null;
		nodeDetailsStorage.alias = isString(node.alias) ? node.alias : null;
		nodeDetailsStorage.isp = isString(node.isp) ? node.isp : null;

		return nodeDetailsStorage;
	}

	updateNodeWithDetails(node: Node) {
		node.ledgerVersion = this.ledgerVersion ? this.ledgerVersion : undefined;
		node.overlayVersion = this.overlayVersion ? this.overlayVersion : undefined;
		node.overlayMinVersion = this.overlayMinVersion
			? this.overlayMinVersion
			: undefined;
		node.versionStr = this.versionStr ? this.versionStr : undefined;
		node.host = this.host ? this.host : undefined;
		node.name = this.name ? this.name : undefined;
		node.homeDomain = this.homeDomain ? this.homeDomain : undefined;
		node.historyUrl = this.historyUrl ? this.historyUrl : undefined;
		node.alias = this.alias ? this.alias : undefined;
		node.isp = this.isp ? this.isp : undefined;
	}
}
