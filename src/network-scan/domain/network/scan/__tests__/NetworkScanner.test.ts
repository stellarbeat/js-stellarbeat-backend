import { NetworkScanner } from '../NetworkScanner';
import { mock } from 'jest-mock-extended';
import { Logger } from '../../../../../core/services/PinoLogger';
import {
	Network as NetworkDTO,
	Node as NodeDTO,
	Organization as OrganizationDTO
} from '@stellarbeat/js-stellarbeat-shared';
import { createDummyPublicKey } from '../../../node/__fixtures__/createDummyPublicKey';
import { QuorumSet } from '../../QuorumSet';
import { ok } from 'neverthrow';
import { Network } from '../../Network';
import { NetworkId } from '../../NetworkId';
import { StellarCoreVersion } from '../../StellarCoreVersion';
import { OverlayVersionRange } from '../../OverlayVersionRange';
import { NodeScanner } from '../../../node/scan/NodeScanner';
import { OrganizationScanner } from '../../../organization/scan/OrganizationScanner';
import { createDummyNode } from '../../../node/__fixtures__/createDummyNode';
import { NodeScan } from '../../../node/scan/NodeScan';
import Organization from '../../../organization/Organization';
import { createDummyOrganizationId } from '../../../organization/__fixtures__/createDummyOrganizationId';
import { OrganizationScan } from '../../../organization/scan/OrganizationScan';

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
	const nodeDTO = new NodeDTO(node.publicKey.value);
	const organization = Organization.create(
		createDummyOrganizationId(),
		'domain',
		new Date()
	);
	const organizationDTO = new OrganizationDTO('org', 'org');
	organizationDTO.validators.push(nodeDTO.publicKey);
	nodeDTO.organizationId = organizationDTO.id;

	const nodeScan = new NodeScan(new Date(), [node]);
	nodeScan.processCrawl([], [], [], BigInt(1), new Date());
	nodeScanner.execute.mockResolvedValue(ok(nodeScan));

	const organizationScan = new OrganizationScan(new Date(), [organization]);
	organizationScanner.execute.mockResolvedValue(ok(organizationScan));

	const result = await networkScanner.scan(
		null,
		null,
		network,
		[node],
		[organization],
		[]
	);
	expect(result.isOk()).toBeTruthy();
	if (!result.isOk()) throw result.error;

	expect(result.value.network.nodes).toHaveLength(1);
	expect(result.value.network.organizations).toHaveLength(1);
	expect(result.value.networkScan).toBeDefined();
});
