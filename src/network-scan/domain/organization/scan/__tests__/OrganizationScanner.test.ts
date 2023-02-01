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

describe('OrganizationScanner', function () {
	it('should scan organizations', async function () {
		const organizationTomlFetcher = mock<OrganizationTomlFetcher>();
		organizationTomlFetcher.fetchOrganizationTomlInfoCollection.mockResolvedValue(
			new Map([['domain', createToml()]])
		);
		const organizationRepository = mock<OrganizationRepository>();
		const organizationScanner = new OrganizationScanner(
			organizationTomlFetcher,
			organizationRepository
		);

		const node = createNode('domain');
		const nodeScan = new NodeScan(new Date(), [node]);

		const organization = Organization.create(
			createDummyOrganizationId(),
			'domain',
			new Date()
		);
		const organizationScan = new OrganizationScan(new Date(), [organization]);

		const result = await organizationScanner.execute(
			organizationScan,
			nodeScan
		);

		expect(result.isOk()).toBe(true);
		if (!result.isOk()) return;

		expect(
			organizationTomlFetcher.fetchOrganizationTomlInfoCollection
		).toBeCalledWith(['domain']);
		expect(organizationRepository.findByHomeDomains).toBeCalledTimes(0);

		expect(result.value.organizations).toHaveLength(1);
		expect(result.value.organizations[0].latestMeasurement()).toBeInstanceOf(
			OrganizationMeasurement
		);
	});

	it('should scan organizations and fetch potential archived organizations', async function () {
		const organizationRepository = mock<OrganizationRepository>();
		const archivedOrganization = Organization.create(
			createDummyOrganizationId(),
			'other-domain.com',
			new Date()
		);
		organizationRepository.findByHomeDomains.mockResolvedValue([
			archivedOrganization
		]);

		const tomlService = mock<OrganizationTomlFetcher>();
		const tomlObjects = new Map<string, OrganizationTomlInfo>([
			['domain', createToml()],
			['other-domain.com', createToml()]
		]);
		tomlService.fetchOrganizationTomlInfoCollection.mockResolvedValue(
			tomlObjects
		);

		const organizationScanner = new OrganizationScanner(
			tomlService,
			organizationRepository
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
		const result = await organizationScanner.execute(
			organizationScan,
			nodeScan
		);

		expect(tomlService.fetchOrganizationTomlInfoCollection).toBeCalledWith([
			'domain',
			'other-domain.com'
		]);
		expect(organizationRepository.findByHomeDomains).toBeCalledWith([
			'other-domain.com'
		]);
		expect(result.isOk()).toBeTruthy();
		if (!result.isOk()) throw result.error;
		expect(result.value.organizations).toHaveLength(2);
	});

	function createToml(): OrganizationTomlInfo {
		return {
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
			validators: ['a'],
			horizonUrl: 'horizonUrl'
		};
	}

	function createNode(domain: string) {
		const node = createDummyNode();
		node.updateHomeDomain(domain, new Date());
		return node;
	}
});
