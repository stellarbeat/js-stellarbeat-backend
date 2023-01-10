import { QuorumSet } from './QuorumSet';
import { err, ok, Result } from 'neverthrow';
import NetworkUpdate from './NetworkUpdate';
import { Network as NetworkDTO, NodeIndex } from '@stellarbeat/js-stellar-domain';
import { CrawlerService } from './update/CrawlerService';
import { HomeDomainUpdater } from './update/HomeDomainUpdater';
import { TomlService } from './update/TomlService';
import { FullValidatorUpdater } from './update/FullValidatorUpdater';
import { GeoDataService } from './update/GeoDataService';
import { Logger } from '../../core/services/PinoLogger';
import { inject, injectable } from 'inversify';

export type NetworkUpdateResult = {
	network: NetworkDTO;
	networkUpdate: NetworkUpdate;
};

@injectable()
export class NetworkUpdater {
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
	): Promise<Result<NetworkUpdateResult, Error>> {
		this.logger.info('Starting nodes crawl');

		const crawlResult = await this.crawlerService.crawl(
			network,
			networkQuorumSet
		);

		if (crawlResult.isErr()) {
			return err(crawlResult.error);
		}

		const networkUpdate = new NetworkUpdate(
			new Date(),
			crawlResult.value.processedLedgers
		);
		networkUpdate.latestLedger = crawlResult.value.latestClosedLedger.sequence;
		networkUpdate.latestLedgerCloseTime =
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
			networkUpdate.time,
			networkUpdate.latestLedger.toString()
		);
		this.logger.info('Calculating node indexes'); //not the right place. Maybe index should be a separate thing, because it is tightly coupled to a network update.
		const nodeIndex = new NodeIndex(newNetwork);
		nodes.forEach((node) => (node.index = nodeIndex.getIndex(node)));

		return ok({
			network: newNetwork,
			networkUpdate: networkUpdate
		});
	}
}
