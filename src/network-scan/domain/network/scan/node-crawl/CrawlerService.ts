import 'reflect-metadata';
import { err, ok, Result } from 'neverthrow';
import { Crawler, PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import {
	Node as NodeDTO,
	QuorumSet as QuorumSetDTO
} from '@stellarbeat/js-stellar-domain';
import {
	Ledger,
	NodeAddress
} from '@stellarbeat/js-stellar-node-crawler/lib/crawler';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../../../core/services/PinoLogger';
import { QuorumSet } from '../../QuorumSet';
import { CrawlerMapper } from './CrawlerMapper';
import { NodeScanResult } from '../NetworkScanner';

export type CrawlResult = {
	nodes: NodeDTO[];
	nodesWithNewIP: NodeDTO[];
	latestClosedLedger: Ledger;
	processedLedgers: number[];
	nodeResults: NodeScanResult[];
};

/**
 * Uses the crawler package to perform a new crawl based on seed data in our database
 */
@injectable()
export class CrawlerService {
	constructor(
		protected crawler: Crawler,
		@inject('Logger') protected logger: Logger
	) {}

	async crawl(
		latestLedger: string | null,
		latestLedgerCloseTime: Date,
		networkQuorumSet: QuorumSet,
		nodeDTOs: NodeDTO[] //todo: refactor out and replace with Node[],
	): Promise<Result<CrawlResult, Error>> {
		try {
			const latestClosedLedger: Ledger = {
				sequence: latestLedger ? BigInt(latestLedger) : BigInt(0),
				closeTime: latestLedgerCloseTime //latestNetwork.time
			};

			this.logger.info(
				'latest detected ledger of previous crawl: ' + latestLedger
			);

			if (nodeDTOs.length === 0) {
				return err(new Error('Cannot crawl network without nodes'));
			}

			const quorumSetDTO = CrawlerMapper.toQuorumSetDTO(networkQuorumSet);
			const addresses: NodeAddress[] = [];
			const quorumSets: Map<string, QuorumSetDTO> = new Map();

			// crawl the top tier nodes first. If for some reason nodes are not sending the externalize messages of other nodes they depend on,
			// we can at least pick up the own messages of the top tier because the crawler will connect to them simultaneously and keep listening until timeout or a ledger close.
			// Edge case: most of the top tiers are overloaded and we cannot connect to them: without relay of externalize messages we also cannot find out if the nodes are validating.
			// Edge case: If the top tier nodes are validating but do not even send their own externalize messages to us, then there is no way we can determine their validating status.
			// For maximum robustness the max open connections setting is advised to be at least the number of top tier nodes.
			const sortedNodes = nodeDTOs.sort((a) => {
				if (QuorumSetDTO.getAllValidators(quorumSetDTO).includes(a.publicKey))
					return -1;
				return 0;
			});

			sortedNodes.map((node) => {
				addresses.push([node.ip, node.port]);
				if (node.quorumSetHashKey)
					quorumSets.set(node.quorumSetHashKey, node.quorumSet);
			});

			const crawlResult = await this.crawler.crawl(
				addresses,
				quorumSetDTO,
				latestClosedLedger,
				quorumSets
			);

			if (
				Array.from(crawlResult.peers.values()).filter(
					(peer) => peer.successfullyConnected
				).length === 0
			)
				return err(new Error('Could not connect to a single node in crawl'));
			const { nodes, nodesWithNewIP } = this.mapPeerNodesToNodes(
				crawlResult.peers,
				nodeDTOs
			);

			const processedLedgers = crawlResult.closedLedgers.map((sequence) =>
				Number(sequence)
			);
			const newLatestClosedLedger = crawlResult.latestClosedLedger;

			return ok({
				nodes: nodes,
				nodesWithNewIP: nodesWithNewIP,
				latestClosedLedger: newLatestClosedLedger,
				processedLedgers: processedLedgers,
				nodeResults: Array.from(crawlResult.peers.values()).map((peer) =>
					CrawlerMapper.mapPeerNodeToNodeResult(peer)
				)
			});
		} catch (e) {
			if (e instanceof Error) return err(e);
			return err(new Error('Unspecified error during crawl'));
		}
	}

	public mapPeerNodesToNodes(
		peerNodes: Map<string, PeerNode>,
		knownNodes: NodeDTO[]
	): {
		nodes: NodeDTO[];
		nodesWithNewIP: NodeDTO[];
		peerNodes: Map<string, PeerNode>;
	} {
		const nodesWithNewIp: NodeDTO[] = [];
		const nodes: NodeDTO[] = [];
		const publicKeys: Set<string> = new Set();
		peerNodes.forEach((peer) => {
			publicKeys.add(peer.publicKey);
			let node = knownNodes.find((node) => node.publicKey === peer.publicKey);
			if (!node) {
				node = new NodeDTO(peer.publicKey);
				node.unknown = true;
			} else {
				node.unknown = false;
			}
			console.log(node.publicKey);
			if (peer.ip && peer.port) {
				if (node.ip !== peer.ip) nodesWithNewIp.push(node);

				node.ip = peer.ip;
				node.port = peer.port;
			}

			if (peer.quorumSet) {
				//to make sure we dont override qSets just because the node was not validating this round.
				node.quorumSet = peer.quorumSet;
				node.quorumSetHashKey = peer.quorumSetHash ? peer.quorumSetHash : null;
			}

			node.unknown = false;
			node.isValidating = peer.isValidating;
			node.overLoaded = peer.overLoaded;
			node.activeInScp = peer.participatingInSCP;
			node.active = true;

			if (peer.nodeInfo) {
				node.ledgerVersion = peer.nodeInfo.ledgerVersion;
				node.overlayMinVersion = peer.nodeInfo.overlayMinVersion;
				node.overlayVersion = peer.nodeInfo.overlayVersion;
				node.versionStr = peer.nodeInfo.versionString;
			}
			nodes.push(node);
		});

		knownNodes
			.filter((node) => !publicKeys.has(node.publicKey))
			.forEach((node) => {
				node.overLoaded = false;
				node.active = false;
				node.isValidating = false;
				node.activeInScp = false;
				nodes.push(node);
			});

		return {
			nodes: nodes,
			nodesWithNewIP: nodesWithNewIp,
			peerNodes: peerNodes
		};
	}
}
