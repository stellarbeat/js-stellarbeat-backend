import { CrawlerService, CrawlResult } from './node-crawl/CrawlerService';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../../core/services/PinoLogger';
import { err, Ok, ok, Result } from 'neverthrow';
import { QuorumSet } from '../../network/QuorumSet';
import Node from '../Node';
import { NodeScan } from './NodeScan';
import { CrawlerMapper } from './node-crawl/CrawlerMapper';
import { NodeRepository } from '../NodeRepository';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import PublicKey from '../PublicKey';

@injectable()
export class NodeScannerCrawlStep {
	constructor(
		@inject(NETWORK_TYPES.NodeRepository)
		private nodeRepository: NodeRepository,
		private crawlerService: CrawlerService,
		@inject('Logger')
		private logger: Logger
	) {}

	public async execute(
		nodeScan: NodeScan,
		networkQuorumSetConfiguration: QuorumSet,
		previousLatestLedger: string | null = null,
		previousLatestLedgerCloseTime: Date | null = null
	): Promise<Result<void, Error>> {
		this.logger.info('Starting new node-scan with crawl');
		const crawlResult = await this.crawlerService.crawl(
			networkQuorumSetConfiguration,
			nodeScan.nodes.map((node) => CrawlerMapper.mapToCrawlNode(node)),
			previousLatestLedger,
			previousLatestLedgerCloseTime
		);
		if (crawlResult.isErr()) {
			return err(crawlResult.error);
		}

		const archivedNodes = await this.fetchRelevantArchivedNodes(
			crawlResult,
			nodeScan
		);

		const invalidPeerNodes = nodeScan.processCrawl(
			Array.from(crawlResult.value.peerNodes.values()),
			archivedNodes,
			crawlResult.value.processedLedgers,
			crawlResult.value.latestClosedLedger.sequence,
			crawlResult.value.latestClosedLedger.closeTime
		);

		if (invalidPeerNodes.length > 0)
			this.logger.info('Could not add the following peer-nodes', {
				invalidPeerNodes: invalidPeerNodes
			});

		return ok(undefined);
	}

	private async fetchRelevantArchivedNodes(
		crawlResult: Ok<CrawlResult, Error>,
		nodeScan: NodeScan
	) {
		const newlyFoundPublicKeyStrings = this.detectNewlyFoundPublicKeysStrings(
			crawlResult.value,
			nodeScan.nodes
		);

		const missingPublicKeys = this.mapToPublicKeys(newlyFoundPublicKeyStrings);

		if (missingPublicKeys.length > 0)
			return await this.nodeRepository.findByPublicKey(missingPublicKeys);
		return [];
	}

	private mapToPublicKeys(newlyFoundPublicKeyStrings: string[]) {
		return newlyFoundPublicKeyStrings
			.map((publicKey) => {
				const publicKeyOrError = PublicKey.create(publicKey);
				if (publicKeyOrError.isErr()) {
					this.logger.info('crawler returned node with invalid public key', {
						publicKey: publicKey
					});
					return undefined;
				}
				return publicKeyOrError.value;
			})
			.filter((publicKey) => publicKey !== undefined) as PublicKey[];
	}

	private detectNewlyFoundPublicKeysStrings(
		crawlResult: CrawlResult,
		nodes: Node[]
	) {
		return Array.from(crawlResult.peerNodes.keys()).filter(
			(publicKey) => !nodes.find((node) => node.publicKey.value === publicKey)
		);
	}
}
