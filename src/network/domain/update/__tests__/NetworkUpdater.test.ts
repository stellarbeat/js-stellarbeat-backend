import { NetworkUpdater } from '../../NetworkUpdater';
import { mock } from 'jest-mock-extended';
import { CrawlerService } from '../CrawlerService';
import { HomeDomainUpdater } from '../HomeDomainUpdater';
import { TomlService } from '../TomlService';
import { FullValidatorUpdater } from '../FullValidatorUpdater';
import { GeoDataService } from '../GeoDataService';
import { Logger } from '../../../../core/services/PinoLogger';
import { Network, Node, Organization } from '@stellarbeat/js-stellar-domain';
import {
	createDummyPublicKey,
	createDummyPublicKeyString
} from '../../__fixtures__/createDummyPublicKey';
import { QuorumSet } from '../../QuorumSet';
import { ok } from 'neverthrow';

it('should perform a network update', async function () {
	const crawlerService = mock<CrawlerService>();
	const homeDomainUpdater = mock<HomeDomainUpdater>();
	const tomlService = mock<TomlService>();
	const fullValidatorUpdater = mock<FullValidatorUpdater>();
	const geoDataService = mock<GeoDataService>();

	const networkUpdater = new NetworkUpdater(
		crawlerService,
		homeDomainUpdater,
		tomlService,
		fullValidatorUpdater,
		geoDataService,
		mock<Logger>()
	);

	const networkQuorumSet = new QuorumSet(1, [createDummyPublicKey()]);
	const node = new Node(createDummyPublicKeyString());
	const organization = new Organization('org', 'org');
	organization.validators.push(node.publicKey);
	node.organizationId = organization.id;

	const crawledNode = new Node(createDummyPublicKeyString());
	const crawledNodes = [node, crawledNode];
	const network = new Network([node], [organization]);
	const latestClosedLedgerSequence = BigInt(1);
	crawlerService.crawl.mockResolvedValue(
		ok({
			nodes: crawledNodes,
			processedLedgers: [1],
			latestClosedLedger: {
				sequence: latestClosedLedgerSequence,
				closeTime: new Date()
			},
			nodesWithNewIP: [crawledNode]
		})
	);

	homeDomainUpdater.updateHomeDomains.mockResolvedValue(crawledNodes);
	const tomlObjects = [{ name: 'toml' }];
	tomlService.fetchTomlObjects.mockResolvedValue(tomlObjects);

	const result = await networkUpdater.update(network, networkQuorumSet);
	expect(result.isOk()).toBeTruthy();
	expect(homeDomainUpdater.updateHomeDomains).toBeCalledWith(crawledNodes);
	expect(tomlService.fetchTomlObjects).toBeCalledWith(crawledNodes);
	expect(tomlService.updateOrganizationsAndNodes).toBeCalledWith(
		tomlObjects,
		[organization],
		crawledNodes
	);

	expect(fullValidatorUpdater.updateFullValidatorStatus).toBeCalledWith(
		crawledNodes,
		latestClosedLedgerSequence.toString()
	);

	expect(fullValidatorUpdater.updateArchiveVerificationStatus).toBeCalledWith(
		crawledNodes
	);

	expect(geoDataService.updateGeoData).toBeCalledWith([crawledNode]);

	expect(result.isOk()).toBeTruthy();
	if (!result.isOk()) throw result.error;
	expect(result.value.network.nodes).toEqual(crawledNodes);
	expect(result.value.network.organizations).toEqual([organization]);
	expect(result.value.networkUpdate).toBeDefined();
	expect(result.value.network.nodes[0].index > 0).toBeTruthy();
});
