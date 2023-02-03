import 'reflect-metadata';
import { err, ok, Result } from 'neverthrow';
import { Crawler, PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import {
	Ledger,
	CrawlResult as CrawlResultDTO
} from '@stellarbeat/js-stellar-node-crawler/lib/crawler';
import { injectable } from 'inversify';
import { QuorumSet } from '../../../network/QuorumSet';
import { CrawlerDTOMapper } from './CrawlerDTOMapper';
import Node from '../../Node';
import { NodeAddress } from '../../NodeAddress';
import { NodeAddressDTOComposer } from './NodeAddressDTOComposer';
import { mapUnknownToError } from '../../../../../core/utilities/mapUnknownToError';

export interface CrawlResult {
	latestClosedLedger: Ledger;
	processedLedgers: number[];
	peerNodes: Map<string, PeerNode>;
}

@injectable()
export class CrawlerService {
	constructor(private crawler: Crawler) {}

	async crawl(
		networkQuorumSet: QuorumSet,
		nodes: Node[],
		bootstrapNodeAddresses: NodeAddress[] = [],
		latestLedger: bigint | null = null,
		latestLedgerCloseTime: Date | null = null
	): Promise<Result<CrawlResult, Error>> {
		const nodeAddresses = NodeAddressDTOComposer.compose(
			nodes,
			bootstrapNodeAddresses,
			networkQuorumSet
		);

		if (nodeAddresses.length === 0) {
			return err(new Error('Cannot crawl network without nodes'));
		}

		const crawlResultOrError = await this.tryCrawl(
			networkQuorumSet,
			nodes,
			nodeAddresses,
			latestLedger,
			latestLedgerCloseTime
		);
		if (crawlResultOrError.isErr()) return err(crawlResultOrError.error);

		if (!CrawlerService.successFullyConnectedToAPeer(crawlResultOrError.value))
			return err(new Error('Could not connect to a single node in crawl'));

		return ok({
			latestClosedLedger: crawlResultOrError.value.latestClosedLedger,
			processedLedgers: crawlResultOrError.value.closedLedgers.map((sequence) =>
				Number(sequence)
			),
			peerNodes: crawlResultOrError.value.peers
		});
	}

	private async tryCrawl(
		networkQuorumSet: QuorumSet,
		nodes: Node[],
		nodeAddresses: [string, number][],
		latestLedger: bigint | null,
		latestLedgerCloseTime: Date | null
	): Promise<Result<CrawlResultDTO, Error>> {
		try {
			return ok(
				await this.crawler.crawl(
					nodeAddresses,
					CrawlerDTOMapper.toNetworkQuorumSetDTO(networkQuorumSet),
					CrawlerDTOMapper.toLedgerDTO(latestLedger, latestLedgerCloseTime),
					CrawlerDTOMapper.createQuorumSetDTOMap(nodes)
				)
			);
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	private static successFullyConnectedToAPeer(crawlResult: CrawlResultDTO) {
		return (
			Array.from(crawlResult.peers.values()).filter(
				(peer) => peer.successfullyConnected
			).length !== 0
		);
	}
}
