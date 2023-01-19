import { NetworkScanner } from '../NetworkScanner';
import { mock } from 'jest-mock-extended';
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
import { NodeScanner } from '../../../node/scan/NodeScanner';
import { OrganizationScanner } from '../../../organization/scan/OrganizationScanner';
import { createDummyNode } from '../../../node/__fixtures__/createDummyNode';

it('should perform a network scan', async function () {
	const nodeScanner = mock<NodeScanner>();
	const organizationScanner = mock<OrganizationScanner>();

	const networkScanner = new NetworkScanner(
		nodeScanner,
		organizationScanner,
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
	const node = createDummyNode();
	const nodeDTO = new Node(node.publicKey.value);
	const organizationDTO = new Organization('org', 'org');
	organizationDTO.validators.push(nodeDTO.publicKey);
	nodeDTO.organizationId = organizationDTO.id;

	const crawledNode = new Node(createDummyPublicKeyString());
	const crawledNodes = [nodeDTO, crawledNode];
	const networkDTO = new NetworkDTO([nodeDTO], [organizationDTO]);
	networkDTO.latestLedger = '1';

	nodeScanner.scan.mockResolvedValue(
		ok({
			processedLedgers: [],
			nodeDTOs: crawledNodes,
			latestLedger: BigInt(1),
			latestLedgerCloseTime: new Date(),
			nodeScanResults: []
		})
	);
	organizationScanner.scan.mockResolvedValue(
		ok({
			organizationDTOs: [organizationDTO]
		})
	);

	const result = await networkScanner.scan(networkDTO, network, [node]);
	expect(result.isOk()).toBeTruthy();
	if (!result.isOk()) throw result.error;

	expect(result.value.network.nodes).toEqual(crawledNodes);
	expect(result.value.network.organizations).toEqual([organizationDTO]);
	expect(result.value.networkScan).toBeDefined();
});
