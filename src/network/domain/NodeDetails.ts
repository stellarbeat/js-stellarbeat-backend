import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Node } from '@stellarbeat/js-stellar-domain';
import { isNumber, isString } from '../../core/utilities/TypeGuards';

@Entity('node_details')
export default class NodeDetails {
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
		if (node.versionStr === null && node.historyUrl === null) return null;

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
}
