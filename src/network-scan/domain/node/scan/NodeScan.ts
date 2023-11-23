import Node from '../Node';
import { PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import {
	InvalidPeerNode,
	PeerNodeToNodeMapper
} from './node-crawl/PeerNodeToNodeMapper';
import NodeMeasurement from '../NodeMeasurement';
import NodeDetails from '../NodeDetails';
import NodeGeoDataLocation from '../NodeGeoDataLocation';
import { NodeTomlInfo } from './NodeTomlInfo';
import { SemanticVersionComparer } from '@stellarbeat/js-stellarbeat-shared';
import { StellarCoreVersion } from '../../network/StellarCoreVersion';

export class NodeScan {
	public processedLedgers: number[] = [];
	public latestLedger = BigInt(0);
	public latestLedgerCloseTime: Date | null = null;

	constructor(public readonly time: Date, public readonly nodes: Node[]) {}

	public processCrawl(
		peerNodes: PeerNode[],
		archivedNodes: Node[] = [],
		processedLedgers: number[] = [],
		latestLedger = BigInt(0),
		latestLedgerCloseTime: Date | null = null
	): InvalidPeerNode[] {
		this.processedLedgers = processedLedgers;
		this.latestLedger = latestLedger;
		this.latestLedgerCloseTime = latestLedgerCloseTime;

		const invalidPeerNodes: InvalidPeerNode[] = [];

		peerNodes.forEach((peerNode) => {
			const node = this.getNodeByPublicKeyString(peerNode.publicKey);
			if (node) {
				return PeerNodeToNodeMapper.updateNodeFromPeerNode(
					node,
					peerNode,
					this.time
				);
			}

			const archivedNode = archivedNodes.find(
				(archivedNode) => archivedNode.publicKey.value === peerNode.publicKey
			);

			if (archivedNode) {
				archivedNode.unArchive(this.time);
				PeerNodeToNodeMapper.updateNodeFromPeerNode(
					archivedNode,
					peerNode,
					this.time
				);
				this.nodes.push(archivedNode);
				return;
			}

			const createdNodeOrError = PeerNodeToNodeMapper.createNodeFromPeerNode(
				peerNode,
				this.time
			);
			if (createdNodeOrError.isErr()) {
				invalidPeerNodes.push(createdNodeOrError.error);
			} else {
				this.nodes.push(createdNodeOrError.value);
			}
		});

		this.nodes
			.filter(
				(node) =>
					node.latestMeasurement()?.time.getTime() !== this.time.getTime()
			)
			.forEach((node) =>
				node.addMeasurement(new NodeMeasurement(this.time, node))
			);

		return invalidPeerNodes;
	}

	getPublicKeys(): string[] {
		return this.nodes.map((node) => node.publicKey.value);
	}

	updateHomeDomains(homeDomains: Map<string, string>) {
		this.nodes.forEach((node) => {
			const homeDomain = homeDomains.get(node.publicKey.value);
			if (homeDomain) {
				node.updateHomeDomain(homeDomain, this.time);
			}
		});
	}

	updateWithTomlInfo(nodeTomlInfoCollection: Set<NodeTomlInfo>) {
		nodeTomlInfoCollection.forEach((nodeTomlInfo) => {
			const node = this.nodes.find(
				(node) => node.publicKey.value === nodeTomlInfo.publicKey
			);
			if (node && node.homeDomain === nodeTomlInfo.homeDomain)
				node.updateDetails(
					NodeDetails.create({
						alias: nodeTomlInfo.alias,
						historyUrl: nodeTomlInfo.historyUrl,
						name: nodeTomlInfo.name,
						host: nodeTomlInfo.host
					}),
					this.time
				);
		});
	}

	updateStellarCoreVersionBehindStatus(stellarCoreVersion: StellarCoreVersion) {
		this.nodes.forEach((node) => {
			const measurement = node.latestMeasurement();
			if (measurement) {
				if (node.versionStr)
					measurement.stellarCoreVersionBehind =
						SemanticVersionComparer.isBehind(
							node.versionStr,
							stellarCoreVersion.value
						);
			} else throw new Error('Measurement not found');
		});
	}

	getHomeDomains(): string[] {
		return this.nodes
			.filter((node) => node.homeDomain)
			.map((node) => node.homeDomain as string);
	}

	getHistoryArchiveUrls(): Map<string, string> {
		return new Map(
			this.nodes
				.filter((node) => node.details?.historyUrl)
				.map((node) => [
					node.publicKey.value,
					node.details?.historyUrl as string
				])
		);
	}

	updateHistoryArchiveUpToDateStatus(
		nodesWithUpToDateHistoryArchives: Set<string>
	) {
		this.nodes
			.filter((node) =>
				nodesWithUpToDateHistoryArchives.has(node.publicKey.value)
			)
			.forEach((node) => {
				const measurement = node.latestMeasurement();
				if (!measurement) throw new Error('Measurement not found');
				measurement.isFullValidator = nodesWithUpToDateHistoryArchives.has(
					node.publicKey.value
				);
			});
	}

	updateHistoryArchiveVerificationStatus(
		nodesWithHistoryArchiveVerificationErrors: Set<string>
	) {
		this.nodes
			.filter((node) =>
				nodesWithHistoryArchiveVerificationErrors.has(node.publicKey.value)
			)
			.forEach((node) => {
				const measurement = node.latestMeasurement();
				if (!measurement) throw new Error('Measurement not found');
				measurement.historyArchiveHasError =
					nodesWithHistoryArchiveVerificationErrors.has(node.publicKey.value);
			});
	}

	public getModifiedIPs(): string[] {
		return this.nodes
			.filter(
				(node) =>
					node.lastIpChange &&
					node.lastIpChange.getTime() === this.time.getTime()
			)
			.map((node) => node.ip);
	}

	public updateIndexes(indexes: Map<string, number>) {
		this.nodes.forEach((node) => {
			const measurement = node.latestMeasurement();
			if (measurement)
				measurement.index = indexes.get(node.publicKey.value) ?? 0;
			else throw new Error('Measurement not found');
		});
	}

	updateGeoDataAndISP(
		geoData: Map<string, { geo: NodeGeoDataLocation; isp: string | null }>
	) {
		this.nodes.forEach((node) => {
			const geoDataAndISP = geoData.get(node.ip);
			if (geoDataAndISP) {
				node.updateGeoData(geoDataAndISP.geo, this.time);
			}

			const isp = geoDataAndISP?.isp;
			if (isp) {
				node.updateIsp(isp, this.time);
			}
		});
	}

	public getNodeByPublicKeyString(publicKey: string): Node | undefined {
		return this.nodes.find((node) => node.publicKey.value === publicKey);
	}

	getActiveWatchersCount(): number {
		return this.nodes.filter(
			(node) => node.isWatcher() && node.isActive() && !node.isValidating()
		).length;
	}

	getActiveValidatorsCount(): number {
		return this.nodes.filter((node) => node.isValidating()).length;
	}

	getActiveFullValidatorsCount(): number {
		return this.nodes.filter((node) => node.isTrackingFullValidator()).length;
	}
}
