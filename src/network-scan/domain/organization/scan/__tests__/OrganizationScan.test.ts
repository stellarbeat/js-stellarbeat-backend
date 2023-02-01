import { InvalidHomeDomainError, OrganizationScan } from '../OrganizationScan';
import { NodeScan } from '../../../node/scan/NodeScan';
import { createDummyNode } from '../../../node/__fixtures__/createDummyNode';
import Organization from '../../Organization';
import { OrganizationId } from '../../OrganizationId';
import { OrganizationTomlInfo } from '../OrganizationTomlInfo';
import { OrganizationValidators } from '../../OrganizationValidators';
import { OrganizationContactInformation } from '../../OrganizationContactInformation';
import Node from '../../../node/Node';
import NodeMeasurement from '../../../node/NodeMeasurement';

describe('OrganizationScan', () => {
	describe('updateWithTomlInfo', () => {
		it('should update existing organization', () => {
			const scanTime = new Date('2020-01-02');
			const nodeScan = createNodeScan(scanTime);
			const organizationScan = createOrganizationScan(scanTime);
			const tomlInfo = createTomlInfo(nodeScan);
			const result = organizationScan.updateWithTomlInfoCollection(
				new Map([['domain.com', tomlInfo]]),
				nodeScan
			);
			expect(result.isOk()).toBe(true);
			if (result.isErr()) throw result.error;
			expect(result.value).toHaveLength(0);
			assertOrganization(
				organizationScan.organizations[0],
				tomlInfo,
				nodeScan.nodes[0],
				scanTime
			);
		});

		it('should return invalid toml info when validator has wrong or missing home-domain', function () {
			const scanTime = new Date('2020-01-02');
			const nodeScan = createNodeScan(scanTime, 'wrong.com');
			nodeScan.nodes[0].updateHomeDomain('wrong.com', scanTime);
			const organizationScan = createOrganizationScan(scanTime);
			const tomlInfo = createTomlInfo(nodeScan);
			const result = organizationScan.updateWithTomlInfoCollection(
				new Map([['domain.com', tomlInfo]]),
				nodeScan
			);
			expect(result.isOk()).toBe(true);
			if (result.isErr()) throw result.error;
			expect(result.value).toHaveLength(1);
			expect(result.value[0].homeDomain).toBe('domain.com');
			expect(result.value[0].error).toBeInstanceOf(InvalidHomeDomainError);
		});

		it('should not update organizations if nodeScan has different time', () => {
			const time = new Date('2020-01-01');
			const nodeScanTime = new Date('2020-01-02');
			const nodeScan = new NodeScan(nodeScanTime, []);
			const organizationScan = new OrganizationScan(time, []);
			const result = organizationScan.updateWithTomlInfoCollection(
				new Map(),
				nodeScan
			);
			expect(result.isErr()).toBe(true);
		});

		it('should add missing organizations', () => {
			const scanTime = new Date('2020-01-02');
			const nodeScan = createNodeScan(scanTime, 'domain2.com');
			const organizationScan = createOrganizationScan(scanTime);
			const tomlInfo = createTomlInfo(nodeScan);
			const result = organizationScan.updateWithTomlInfoCollection(
				new Map([['domain2.com', tomlInfo]]),
				nodeScan
			);
			expect(result.isOk()).toBe(true);
			if (result.isErr()) throw result.error;
			expect(result.value).toHaveLength(0);
			expect(organizationScan.organizations).toHaveLength(2);
			assertOrganization(
				organizationScan.organizations[1],
				tomlInfo,
				nodeScan.nodes[0],
				scanTime
			);
		});

		it('should update validators in existing organizations with missing toml file', () => {
			const scanTime = new Date('2020-01-02');
			const nodeScan = createNodeScan(scanTime);
			const organizationScan = createOrganizationScan(scanTime, 'domain.com');
			organizationScan.organizations[0].updateValidators(
				new OrganizationValidators([nodeScan.nodes[0].publicKey]),
				scanTime
			);

			nodeScan.nodes[0].updateHomeDomain('domain2.com', scanTime);
			const result = organizationScan.updateWithTomlInfoCollection(
				new Map(),
				nodeScan
			);
			expect(result.isOk()).toBe(true);
			if (result.isErr()) throw result.error;
			expect(result.value).toHaveLength(0);
			expect(organizationScan.organizations).toHaveLength(1);
			expect(organizationScan.organizations[0].validators.value).toHaveLength(
				0
			);
		});

		it('should un-archive archived organizations even if there are no changes to toml file', () => {
			const archivedOrganization = createOrganization('domain.com');
			archivedOrganization.archive(new Date('2020-01-01'));

			const scanTime = new Date('2020-01-02');
			const nodeScan = createNodeScan(scanTime);
			const organizationScan = new OrganizationScan(scanTime, []);
			const tomlInfo = createOrganizationTomlInfoWithNullValues();
			const result = organizationScan.updateWithTomlInfoCollection(
				new Map([['domain.com', tomlInfo]]),
				nodeScan,
				[archivedOrganization]
			);
			expect(result.isOk()).toBe(true);
			expect(organizationScan.organizations).toHaveLength(1);
			expect(organizationScan.organizations[0].snapshotStartDate).toEqual(
				scanTime
			);
		});

		it('should un-archive archived organization and update', function () {
			const archivedOrganization = createOrganization('domain.com');
			archivedOrganization.archive(new Date('2020-01-01'));

			const scanTime = new Date('2020-01-02');
			const nodeScan = createNodeScan(scanTime);
			const organizationScan = new OrganizationScan(scanTime, []);
			const tomlInfo = createTomlInfo(nodeScan);
			const result = organizationScan.updateWithTomlInfoCollection(
				new Map([['domain.com', tomlInfo]]),
				nodeScan,
				[archivedOrganization]
			);
			expect(result.isOk()).toBe(true);
			expect(organizationScan.organizations).toHaveLength(1);
			expect(organizationScan.organizations[0].snapshotStartDate).toEqual(
				scanTime
			);

			assertOrganization(
				organizationScan.organizations[0],
				tomlInfo,
				nodeScan.nodes[0],
				scanTime
			);
		});

		function createOrganizationTomlInfoWithNullValues() {
			return {
				horizonUrl: null,
				url: null,
				name: null,
				keybase: null,
				dba: null,
				github: null,
				description: null,
				officialEmail: null,
				physicalAddress: null,
				phoneNumber: null,
				twitter: null,
				validators: []
			};
		}

		function createTomlInfo(nodeScan: NodeScan) {
			const tomlInfo: OrganizationTomlInfo = {
				horizonUrl: 'https://horizon.stellar.org',
				url: 'https://stellar.org',
				name: 'Stellar',
				keybase: 'keybase',
				dba: 'dba',
				github: 'stellar',
				description: 'description',
				officialEmail: 'email',
				physicalAddress: 'address',
				phoneNumber: 'phone',
				twitter: 'twitter',
				validators: [nodeScan.nodes[0].publicKey.value]
			};
			return tomlInfo;
		}

		function assertOrganization(
			organization: Organization,
			tomlInfo: OrganizationTomlInfo,
			node: Node,
			scanTime: Date
		) {
			expect(organization.name).toBe(tomlInfo.name);
			expect(organization.url).toBe(tomlInfo.url);
			expect(organization.validators).toEqual(
				new OrganizationValidators([node.publicKey])
			);
			expect(organization.description).toBe(tomlInfo.description);
			expect(organization.horizonUrl).toBe(tomlInfo.horizonUrl);
			expect(organization.snapshotStartDate).toEqual(scanTime);
			expect(organization.contactInformation).toEqual(
				OrganizationContactInformation.create({
					officialEmail: tomlInfo.officialEmail,
					physicalAddress: tomlInfo.physicalAddress,
					phoneNumber: tomlInfo.phoneNumber,
					twitter: tomlInfo.twitter,
					keybase: tomlInfo.keybase,
					github: tomlInfo.github,
					dba: tomlInfo.dba
				})
			);
		}
	});

	describe('calculateOrganizationAvailability', () => {
		it('should add measurements for every organization', () => {
			const organizationScan = createOrganizationScan(new Date('2020-01-01'));
			const nodeScan = createNodeScan(new Date('2020-01-01'));
			organizationScan.organizations[0].updateValidators(
				new OrganizationValidators([nodeScan.nodes[0].publicKey]),
				new Date('2020-01-01')
			);

			organizationScan.calculateOrganizationAvailability(nodeScan);

			expect(organizationScan.organizations[0].isAvailable()).toBe(true);
		});
	});

	function createOrganizationScan(scanTime: Date, domain = 'domain.com') {
		return new OrganizationScan(scanTime, [createOrganization(domain)]);
	}
	function createNodeScan(time: Date, domain = 'domain.com') {
		const node = createDummyNode('localhost', 1, time);
		node.updateHomeDomain(domain, time);
		const measurement = new NodeMeasurement(time, node);
		measurement.isValidating = true;
		node.addMeasurement(measurement);
		return new NodeScan(time, [node]);
	}
	function createOrganization(domain: string) {
		const organizationId = OrganizationId.create(domain);
		if (organizationId.isErr()) throw new Error('Invalid organizationId');
		return Organization.create(
			organizationId.value,
			domain,
			new Date('2020-01-01')
		);
	}
});
