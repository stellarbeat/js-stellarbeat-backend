import { NetworkScanner } from '../NetworkScanner';
import { mock } from 'jest-mock-extended';
import { CrawlerService } from '../node-crawl/CrawlerService';
import { HomeDomainUpdater } from '../HomeDomainUpdater';
import { TomlService } from '../TomlService';
import { FullValidatorUpdater } from '../FullValidatorUpdater';
import { GeoDataService } from '../GeoDataService';
import { Logger } from '../../../../../core/services/PinoLogger';
import {
	Network as NetworkDTO,
	Node,
	Organization
} from '@stellarbeat/js-stellarbeat-shared';
import {
	createDummyPublicKey,
	createDummyPublicKeyString
} from '../../../node/__fixtures__/createDummyPublicKey';
import { QuorumSet } from '../../QuorumSet';
import { ok } from 'neverthrow';
import { Network } from '../../Network';
import { NetworkId } from '../../NetworkId';
import { StellarCoreVersion } from '../../StellarCoreVersion';
import { OverlayVersionRange } from '../../OverlayVersionRange';

it('should perform a network scan', async function () {
	const crawlerService = mock<CrawlerService>();
	const homeDomainUpdater = mock<HomeDomainUpdater>();
	const tomlService = mock<TomlService>();
	const fullValidatorUpdater = mock<FullValidatorUpdater>();
	const geoDataService = mock<GeoDataService>();

	const networkScanner = new NetworkScanner(
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

	const network = Network.create(new Date(), new NetworkId('test'), 'test', {
		name: 'test',
		quorumSetConfiguration: new QuorumSet(1, [createDummyPublicKey()]),
		stellarCoreVersion: stellarCoreVersionOrError.value,
		overlayVersionRange: overlayVersionRangeOrError.value,
		maxLedgerVersion: 1
	});
	const node = new Node(createDummyPublicKeyString());
	const organization = new Organization('org', 'org');
	organization.validators.push(node.publicKey);
	node.organizationId = organization.id;

	const crawledNode = new Node(createDummyPublicKeyString());
	const crawledNodes = [node, crawledNode];
	const networkDTO = new NetworkDTO([node], [organization]);
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
	const result = await networkScanner.update(networkDTO, network);
	expect(result.isOk()).toBeTruthy();
	expect(homeDomainUpdater.updateHomeDomains).toBeCalledWith(crawledNodes);
	expect(tomlService.fetchTomlObjects).toBeCalledWith(crawledNodes);
	expect(tomlService.updateNodes).toBeCalledWith(tomlObjects, crawledNodes, []);
	expect(tomlService.updateOrganizations).toBeCalledWith(
		tomlObjects,
		[organization],
		crawledNodes
	);

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
	expect(result.value.network.nodes).toEqual(crawledNodes);
	expect(result.value.network.organizations).toEqual([organization]);
	expect(result.value.networkScan).toBeDefined();
	expect(result.value.network.nodes[0].index > 0).toBeTruthy();
});
