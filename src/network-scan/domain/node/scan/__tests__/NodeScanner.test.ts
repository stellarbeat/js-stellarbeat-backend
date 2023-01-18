import { mock } from 'jest-mock-extended';
import { CrawlerService } from '../../../node/scan/node-crawl/CrawlerService';
import { HomeDomainUpdater } from '../../../node/scan/HomeDomainUpdater';
import { FullValidatorUpdater } from '../../../node/scan/FullValidatorUpdater';
import { GeoDataService } from '../../../node/scan/GeoDataService';
import { Logger } from '../../../../../core/services/PinoLogger';
import { Node } from '@stellarbeat/js-stellarbeat-shared';
import {
	createDummyPublicKey,
	createDummyPublicKeyString
} from '../../__fixtures__/createDummyPublicKey';
import { ok } from 'neverthrow';
import { TomlService } from '../../../network/scan/TomlService';
import { NodeScanner } from '../NodeScanner';
import { StellarCoreVersion } from '../../../network/StellarCoreVersion';
import { OverlayVersionRange } from '../../../network/OverlayVersionRange';
import { QuorumSet } from '../../../network/QuorumSet';

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

	const node = new Node(createDummyPublicKeyString());
	const crawledNode = new Node(createDummyPublicKeyString());
	const crawledNodes = [node, crawledNode];
	const latestClosedLedgerSequence = BigInt(1);
	crawlerService.crawl.mockResolvedValue(
		ok({
			nodes: crawledNodes,
			processedLedgers: [1],
			latestClosedLedger: {
				sequence: latestClosedLedgerSequence,
				closeTime: new Date()
			},
			nodesWithNewIP: [crawledNode],
			nodeResults: []
		})
	);

	homeDomainUpdater.updateHomeDomains.mockResolvedValue(crawledNodes);
	const tomlObjects = [{ name: 'toml' }];
	tomlService.fetchTomlObjects.mockResolvedValue(tomlObjects);

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
		stellarCoreVersionOrError.value
	);
	expect(result.isOk()).toBeTruthy();
	expect(homeDomainUpdater.updateHomeDomains).toBeCalledWith(crawledNodes);
	expect(tomlService.fetchTomlObjects).toBeCalledWith(crawledNodes);
	expect(tomlService.updateNodes).toBeCalledWith(tomlObjects, crawledNodes, []);

	expect(fullValidatorUpdater.updateFullValidatorStatus).toBeCalledWith(
		crawledNodes,
		[],
		latestClosedLedgerSequence.toString()
	);

	expect(fullValidatorUpdater.updateArchiveVerificationStatus).toBeCalledWith(
		crawledNodes,
		[]
	);

	expect(geoDataService.fetchGeoData).toBeCalledWith(crawledNode.ip);
	expect(geoDataService.fetchGeoData).toBeCalledTimes(1);

	expect(result.isOk()).toBeTruthy();
	if (!result.isOk()) throw result.error;
	expect(result.value.nodeDTOs).toEqual(crawledNodes);
	expect(result.value.latestLedgerCloseTime).toBeDefined();
	expect(result.value.nodeScanResults).toBeDefined();
	expect(result.value.latestLedger).toEqual(latestClosedLedgerSequence);
	expect(result.value.nodeDTOs[0].index > 0).toBeTruthy();
});
