import { CrawlerService, CrawlResult } from './node-crawl/CrawlerService';
import { inject, injectable } from 'inversify';
import { Logger } from '../../../../core/services/PinoLogger';
import { err, Ok, ok, Result } from 'neverthrow';
import { NetworkQuorumSetConfiguration } from '../../network/NetworkQuorumSetConfiguration';
import Node from '../Node';
import { NodeScan } from './NodeScan';
import { NodeRepository } from '../NodeRepository';
import { NETWORK_TYPES } from '../../../infrastructure/di/di-types';
import PublicKey from '../PublicKey';
import { mapUnknownToError } from '../../../../core/utilities/mapUnknownToError';
import { NodeAddress } from '../NodeAddress';

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
		networkQuorumSetConfiguration: NetworkQuorumSetConfiguration,
		previousLatestLedger: bigint | null = null,
		previousLatestLedgerCloseTime: Date | null = null,
		bootstrapNodeAddresses: NodeAddress[] = []
	): Promise<Result<void, Error>> {
		this.logger.info('Starting new node-scan with crawl starting from ledger', {
			previousLatestLedger: previousLatestLedger?.toString(),
			previousLatestLedgerCloseTime:
				previousLatestLedgerCloseTime?.toISOString()
		});
		const crawlResult = await this.crawlerService.crawl(
			networkQuorumSetConfiguration,
			nodeScan.nodes,
			bootstrapNodeAddresses,
			previousLatestLedger,
			previousLatestLedgerCloseTime
		);
		if (crawlResult.isErr()) {
			return err(crawlResult.error);
		}

		const archivedNodesOrError = await this.fetchRelevantArchivedNodes(
			crawlResult,
			nodeScan
		);

		if (archivedNodesOrError.isErr()) {
			return err(archivedNodesOrError.error);
		}

		const invalidPeerNodes = nodeScan.processCrawl(
			Array.from(crawlResult.value.peerNodes.values()),
			archivedNodesOrError.value,
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
	): Promise<Result<Node[], Error>> {
		try {
			const newlyFoundPublicKeyStrings = this.detectNewlyFoundPublicKeysStrings(
				crawlResult.value,
				nodeScan.nodes
			);

			const missingPublicKeys = this.mapToPublicKeys(
				newlyFoundPublicKeyStrings
			);

			if (missingPublicKeys.length > 0)
				return ok(await this.nodeRepository.findByPublicKey(missingPublicKeys));
			return ok([]);
		} catch (e) {
			this.logger.error('Error while fetching archived nodes', { error: e });
			return err(mapUnknownToError(e));
		}
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
