import { mock } from 'jest-mock-extended';
import { CrawlerService } from '../../../node/scan/node-crawl/CrawlerService';
import { HomeDomainUpdater } from '../../../node/scan/HomeDomainUpdater';
import { FullValidatorUpdater } from '../../../node/scan/FullValidatorUpdater';
import { GeoDataService } from '../../../node/scan/GeoDataService';
import { Logger } from '../../../../../core/services/PinoLogger';
import { Node as NodeDTO } from '@stellarbeat/js-stellarbeat-shared';
import { createDummyPublicKey } from '../../__fixtures__/createDummyPublicKey';
import { ok } from 'neverthrow';
import { TomlService } from '../../../network/scan/TomlService';
import { NodeScanner } from '../NodeScanner';
import { StellarCoreVersion } from '../../../network/StellarCoreVersion';
import { OverlayVersionRange } from '../../../network/OverlayVersionRange';
import { QuorumSet } from '../../../network/QuorumSet';
import { createDummyNode } from '../../__fixtures__/createDummyNode';
import { PeerNode } from '@stellarbeat/js-stellar-node-crawler';
import { CrawlerMapper } from '../node-crawl/CrawlerMapper';

it('should perform a network scan', async function () {
	const crawlerService = mock<CrawlerService>();
	const homeDomainUpdater = mock<HomeDomainUpdater>();
	const tomlService = mock<TomlService>();
	const fullValidatorUpdater = mock<FullValidatorUpdater>();
	const geoDataService = mock<GeoDataService>();

	const nodeScanner = new NodeScanner(
		crawlerService,
		homeDomainUpdater,
		tomlService,
		fullValidatorUpdater,
		geoDataService,
		mock<Logger>()
	);

	const stellarCoreVersionOrError = StellarCoreVersion.create('1.0.0');
	const overlayVersionRangeOrError = OverlayVersionRange.create(1, 2);
	if (stellarCoreVersionOrError.isErr())
		throw new Error('StellarCoreVersion.create failed');
	if (overlayVersionRangeOrError.isErr())
		throw new Error('OverlayVersionRange.create failed');

	const quorumSetConfig = new QuorumSet(1, [createDummyPublicKey()]);

	const node = createDummyNode();
	const nodeDTO = new NodeDTO(node.publicKey.value);

	const crawledNode = createDummyNode();
	const crawledNodeDTO = new NodeDTO(crawledNode.publicKey.value);
	const crawledNodeDTOs = [nodeDTO, crawledNodeDTO];
	const crawledNodes = [node, crawledNode];
	const latestClosedLedgerSequence = BigInt(1);
	const peerNodes = new Map([
		[node.publicKey.value, new PeerNode(node.publicKey.value)]
	]);
	const nodeScanResults = CrawlerMapper.mapPeerNodes(peerNodes);

	crawlerService.crawl.mockResolvedValue(
		ok({
			nodeDTOs: crawledNodeDTOs,
			processedLedgers: [1],
			latestClosedLedger: {
				sequence: latestClosedLedgerSequence,
				closeTime: new Date()
			},
			nodeDTOsWithNewIP: [crawledNodeDTO],
			peerNodes
		})
	);

	homeDomainUpdater.fetchHomeDomains.mockResolvedValue(
		new Map([[node.publicKey.value, 'domain']])
	);
	const tomlObjects = new Map([[node.publicKey.value, { name: 'toml' }]]);
	tomlService.fetchTomlObjects.mockResolvedValue(tomlObjects);
	tomlService.extractNodeTomlInfoCollection.mockReturnValue(
		new Map([
			[
				node.publicKey.value,
				{
					name: 'name',
					alias: 'alias',
					publicKey: node.publicKey.value,
					homeDomain: 'domain',
					host: null,
					historyUrl: null
				}
			]
		])
	);

	geoDataService.fetchGeoData.mockResolvedValue(
		ok({
			countryCode: 'US',
			latitude: 1,
			longitude: 1,
			countryName: 'United States',
			isp: 'isp'
		})
	);

	const result = await nodeScanner.scan(
		new Date(),
		null,
		new Date(),
		quorumSetConfig,
		[node],
		[nodeDTO],
		stellarCoreVersionOrError.value
	);
	expect(result.isOk()).toBeTruthy();
	expect(homeDomainUpdater.fetchHomeDomains).toBeCalledWith(
		[node].map((node) => node.publicKey.value)
	);
	expect(tomlService.fetchTomlObjects).toBeCalledTimes(1);
	expect(tomlService.extractNodeTomlInfoCollection).toBeCalledTimes(1);

	expect(fullValidatorUpdater.updateFullValidatorStatus).toBeCalledWith(
		crawledNodeDTOs,
		nodeScanResults.nodeScanMeasurements,
		latestClosedLedgerSequence.toString()
	);

	expect(fullValidatorUpdater.updateArchiveVerificationStatus).toBeCalledWith(
		crawledNodeDTOs,
		nodeScanResults.nodeScanMeasurements
	);

	expect(geoDataService.fetchGeoData).toBeCalledWith(crawledNodeDTO.ip);
	expect(geoDataService.fetchGeoData).toBeCalledTimes(1);

	expect(result.isOk()).toBeTruthy();
	if (!result.isOk()) throw result.error;
	expect(result.value.nodeDTOs).toEqual(crawledNodeDTOs);
	expect(result.value.latestLedgerCloseTime).toBeDefined();
	expect(result.value.nodeScanResults).toBeDefined();
	expect(result.value.latestLedger).toEqual(latestClosedLedgerSequence);
	expect(result.value.nodeDTOs[0].index > 0).toBeTruthy();
});
