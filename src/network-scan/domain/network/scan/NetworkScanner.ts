import { QuorumSet } from '../QuorumSet';
import { err, ok, Result } from 'neverthrow';
import NetworkScan from './NetworkScan';
import {
	Network as NetworkDTO,
	NodeIndex
} from '@stellarbeat/js-stellar-domain';
import { CrawlerService } from './node-crawl/CrawlerService';
import { HomeDomainUpdater } from './HomeDomainUpdater';
import { TomlService } from './TomlService';
import { FullValidatorUpdater } from './FullValidatorUpdater';
import { GeoDataService } from './GeoDataService';
import { Logger } from '../../../../core/services/PinoLogger';
import { inject, injectable } from 'inversify';

export type NetworkScanResult = {
	network: NetworkDTO;
	networkScan: NetworkScan;
};

@injectable()
export class NetworkScanner {
	constructor(
		private crawlerService: CrawlerService,
		private homeDomainUpdater: HomeDomainUpdater,
		private tomlService: TomlService,
		private fullValidatorUpdater: FullValidatorUpdater,
		@inject('GeoDataService')
		private geoDataService: GeoDataService,
		@inject('Logger')
		private logger: Logger
	) {}

	async update(
		network: NetworkDTO,
		networkQuorumSet: QuorumSet
	): Promise<Result<NetworkScanResult, Error>> {
		this.logger.info('Starting nodes crawl');

		const crawlResult = await this.crawlerService.crawl(
			network.latestLedger,
			network.time,
			networkQuorumSet,
			network.nodes
		);

		if (crawlResult.isErr()) {
			return err(crawlResult.error);
		}

		const networkScan = new NetworkScan(
			new Date(),
			crawlResult.value.processedLedgers
		);
		networkScan.latestLedger = crawlResult.value.latestClosedLedger.sequence;
		networkScan.latestLedgerCloseTime =
			crawlResult.value.latestClosedLedger.closeTime;
		const nodes = crawlResult.value.nodes;

		this.logger.info('Updating home domains');
		await this.homeDomainUpdater.updateHomeDomains(nodes);

		this.logger.info('Processing home domains');
		const tomlObjects = await this.tomlService.fetchTomlObjects(nodes);

		this.logger.info('Processing organizations & nodes from TOML');
		const organizations = network.organizations;

		this.tomlService.updateOrganizationsAndNodes(
			tomlObjects,
			organizations,
			nodes
		);

		this.logger.info('Updating full validators');
		await this.fullValidatorUpdater.updateFullValidatorStatus(
			nodes,
			crawlResult.value.latestClosedLedger.sequence.toString()
		);
		await this.fullValidatorUpdater.updateArchiveVerificationStatus(nodes);

		if (crawlResult.value.nodesWithNewIP.length > 0) {
			this.logger.info('Updating geoData info', {
				nodes: crawlResult.value.nodesWithNewIP.map((node) => node.displayName)
			});
			await this.geoDataService.updateGeoData(crawlResult.value.nodesWithNewIP);
		}

		const newNetwork: NetworkDTO = new NetworkDTO(
			nodes,
			organizations,
			networkScan.time,
			networkScan.latestLedger.toString()
		);
		this.logger.info('Calculating node indexes'); //not the right place. Maybe index should be a separate thing, because it is tightly coupled to a network update.
		const nodeIndex = new NodeIndex(newNetwork);
		nodes.forEach((node) => (node.index = nodeIndex.getIndex(node)));

		return ok({
			network: newNetwork,
			networkScan: networkScan
		});
	}
}
