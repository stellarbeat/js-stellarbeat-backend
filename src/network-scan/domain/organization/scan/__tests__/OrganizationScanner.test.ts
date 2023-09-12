import { mock } from 'jest-mock-extended';

import { OrganizationScanner } from '../OrganizationScanner';
import { OrganizationTomlFetcher } from '../OrganizationTomlFetcher';
import { OrganizationTomlInfo } from '../OrganizationTomlInfo';
import { OrganizationScan } from '../OrganizationScan';
import { createDummyNode } from '../../../node/__fixtures__/createDummyNode';
import Organization from '../../Organization';
import { createDummyOrganizationId } from '../../__fixtures__/createDummyOrganizationId';
import { NodeScan } from '../../../node/scan/NodeScan';
import { OrganizationRepository } from '../../OrganizationRepository';
import OrganizationMeasurement from '../../OrganizationMeasurement';
import { Logger } from '../../../../../core/services/PinoLogger';
import { CouldNotRetrieveArchivedOrganizationsError } from '../errors/CouldNotRetrieveArchivedOrganizationsError';
import { createDummyPublicKeyString } from '../../../node/__fixtures__/createDummyPublicKey';
import { TomlState } from '../TomlState';

describe('OrganizationScanner', function () {
	it('should scan organizations', async function () {
		const setup = setupHappyPath();

		const result = await setup.organizationScanner.execute(
			setup.organizationScan,
			setup.nodeScan
		);

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		expect(
			setup.organizationTomlFetcher.fetchOrganizationTomlInfoCollection
		).toBeCalledWith(['domain']);
		expect(setup.organizationRepository.findByHomeDomains).toBeCalledTimes(0);

		expect(result.value.organizations).toHaveLength(1);
		expect(result.value.organizations[0].name).toBe('toml');
		expect(result.value.organizations[0].validators.value).toHaveLength(1);
		expect(result.value.organizations[0].latestMeasurement()).toBeInstanceOf(
			OrganizationMeasurement
		);
	});

	it('should ignore invalid toml files', async function () {
		const setup = setupHappyPath();
		const invalidToml = createToml();
		invalidToml.state = TomlState.UnspecifiedError;
		setup.organizationTomlFetcher.fetchOrganizationTomlInfoCollection.mockResolvedValue(
			new Map([['domain', invalidToml]])
		);

		const result = await setup.organizationScanner.execute(
			setup.organizationScan,
			setup.nodeScan
		);

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;
		expect(result.value.organizations).toHaveLength(1);
		expect(result.value.organizations[0].name).toBeNull();
	});

	it('should return error if fetching archived organization fails', async function () {
		const setup = setupHappyPath();

		const node = createNode('domain');
		const archivedNode = createNode('other-domain.com');
		const nodeScan = new NodeScan(new Date(), [node, archivedNode]);

		setup.organizationRepository.findByHomeDomains.mockImplementation(() => {
			throw new Error('error');
		});

		const result = await setup.organizationScanner.execute(
			setup.organizationScan,
			nodeScan
		);

		expect(result.isErr()).toBe(true);
		if (!result.isErr()) return;
		expect(result.error).toBeInstanceOf(
			CouldNotRetrieveArchivedOrganizationsError
		);
	});

	it('should scan organizations and fetch potential archived organizations', async function () {
		const setup = setupHappyPath();
		const archivedOrganization = Organization.create(
			createDummyOrganizationId(),
			'other-domain.com',
			new Date()
		);
		setup.organizationRepository.findByHomeDomains.mockResolvedValue([
			archivedOrganization
		]);

		const tomlObjects = new Map<string, OrganizationTomlInfo>([
			['domain', createToml()],
			['other-domain.com', createToml()]
		]);
		setup.organizationTomlFetcher.fetchOrganizationTomlInfoCollection.mockResolvedValue(
			tomlObjects
		);

		const node = createNode('domain');
		const archivedNode = createNode('other-domain.com');
		const nodeScan = new NodeScan(new Date(), [node, archivedNode]);

		const organization = Organization.create(
			createDummyOrganizationId(),
			'domain',
			new Date()
		);
		const organizationScan = new OrganizationScan(new Date(), [organization]);
		const result = await setup.organizationScanner.execute(
			organizationScan,
			nodeScan
		);

		expect(
			setup.organizationTomlFetcher.fetchOrganizationTomlInfoCollection
		).toBeCalledWith(['domain', 'other-domain.com']);
		expect(setup.organizationRepository.findByHomeDomains).toBeCalledWith([
			'other-domain.com'
		]);
		expect(result.isOk()).toBeTruthy();
		if (!result.isOk()) throw result.error;
		expect(result.value.organizations).toHaveLength(2);
	});

	function setupHappyPath() {
		const node = createNode('domain');

		const organizationTomlFetcher = mock<OrganizationTomlFetcher>();
		organizationTomlFetcher.fetchOrganizationTomlInfoCollection.mockResolvedValue(
			new Map([['domain', createToml(node.publicKey.value)]])
		);
		const organizationRepository = mock<OrganizationRepository>();
		const organizationScanner = new OrganizationScanner(
			organizationTomlFetcher,
			organizationRepository,
			mock<Logger>()
		);

		const time = new Date();
		const nodeScan = new NodeScan(time, [node]);

		const organization = Organization.create(
			createDummyOrganizationId(),
			'domain',
			time
		);
		const organizationScan = new OrganizationScan(time, [organization]);
		return {
			organizationTomlFetcher,
			organizationRepository,
			organizationScanner,
			nodeScan,
			organizationScan
		};
	}

	function createToml(
		validator = createDummyPublicKeyString()
	): OrganizationTomlInfo {
		return {
			state: TomlState.Ok,
			name: 'toml',
			dba: 'dba',
			github: 'github',
			url: 'url',
			description: 'description',
			keybase: 'keybase',
			officialEmail: 'officialEmail',
			phoneNumber: 'phoneNumber',
			physicalAddress: 'physicalAddress',
			twitter: 'twitter',
			validators: [validator],
			horizonUrl: 'horizonUrl'
		};
	}

	function createNode(domain: string) {
		const node = createDummyNode();
		node.updateHomeDomain(domain, new Date());
		return node;
	}
});
