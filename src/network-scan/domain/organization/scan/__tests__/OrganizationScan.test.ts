import { OrganizationScan } from '../OrganizationScan';
import { NodeScan } from '../../../node/scan/NodeScan';
import { createDummyNode } from '../../../node/__fixtures__/createDummyNode';
import Organization from '../../Organization';
import { OrganizationId } from '../../OrganizationId';
import { OrganizationTomlInfo } from '../OrganizationTomlInfo';
import { OrganizationValidators } from '../../OrganizationValidators';
import { OrganizationContactInformation } from '../../OrganizationContactInformation';
import Node from '../../../node/Node';
import NodeMeasurement from '../../../node/NodeMeasurement';
import { ValidatorNotSEP20LinkedError } from '../errors/ValidatorNotSEP20LinkedError';
import { WrongNodeScanForOrganizationScan } from '../errors/WrongNodeScanForOrganizationScan';
import { createDummyPublicKey } from '../../../node/__fixtures__/createDummyPublicKey';
import { Snapshot } from '../../../../../core/domain/Snapshot';
import { TomlWithoutValidatorsError } from '../errors/TomlWithoutValidatorsError';
import { TomlState } from '../TomlState';
import { InvalidTomlStateError } from '../errors/InvalidTomlStateError';

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
			expect(result.value[0].error).toBeInstanceOf(
				ValidatorNotSEP20LinkedError
			);
		});

		it('should return invalid toml info when there are no validators defined', function () {
			const scanTime = new Date('2020-01-02');
			const nodeScan = createNodeScan(scanTime, 'domain.com');
			const organizationScan = createOrganizationScan(scanTime);
			const tomlInfo = createTomlInfo(nodeScan);
			tomlInfo.validators = [];
			const result = organizationScan.updateWithTomlInfoCollection(
				new Map([['domain.com', tomlInfo]]),
				nodeScan
			);
			expect(result.isOk()).toBe(true);
			if (result.isErr()) throw result.error;
			expect(result.value).toHaveLength(1);
			expect(result.value[0].homeDomain).toBe('domain.com');
			expect(result.value[0].error).toBeInstanceOf(TomlWithoutValidatorsError);
		});

		it('should return invalid toml state when toml state is not ok', function () {
			const scanTime = new Date('2020-01-02');
			const nodeScan = createNodeScan(scanTime, 'domain.com');
			const organizationScan = createOrganizationScan(scanTime);
			const tomlInfo = createTomlInfo(nodeScan);
			tomlInfo.state = TomlState.UnspecifiedError;
			const result = organizationScan.updateWithTomlInfoCollection(
				new Map([['domain.com', tomlInfo]]),
				nodeScan
			);
			expect(result.isOk()).toBe(true);
			if (result.isErr()) throw result.error;
			expect(result.value).toHaveLength(1);
			expect(result.value[0].homeDomain).toBe('domain.com');
			expect(result.value[0].error).toBeInstanceOf(InvalidTomlStateError);
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
			if (!result.isErr()) throw new Error('Expected error');
			expect(result.error).toBeInstanceOf(WrongNodeScanForOrganizationScan);
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

		describe('TomlState update in Organization', () => {
			it('should update toml state to Ok when toml is valid', () => {
				const organizationScan = createOrganizationScan(new Date('2020-01-01'));
				const nodeScan = createNodeScan(new Date('2020-01-01'));
				const tomlInfo = createTomlInfo(nodeScan);
				const result = organizationScan.updateWithTomlInfoCollection(
					new Map([['domain.com', tomlInfo]]),
					nodeScan
				);
				expect(result.isOk()).toBe(true);
				if (result.isErr()) throw result.error;
				expect(result.value).toHaveLength(0);
				expect(
					organizationScan.organizations[0].latestMeasurement()?.tomlState
				).toBe(TomlState.Ok);
			});

			it('should update toml state to UnspecifiedError when toml is invalid', () => {
				const organizationScan = createOrganizationScan(new Date('2020-01-01'));
				const nodeScan = createNodeScan(new Date('2020-01-01'));
				const tomlInfo = createTomlInfo(nodeScan);
				tomlInfo.state = TomlState.UnspecifiedError;
				const result = organizationScan.updateWithTomlInfoCollection(
					new Map([['domain.com', tomlInfo]]),
					nodeScan
				);
				expect(result.isOk()).toBe(true);
				if (result.isErr()) throw result.error;
				expect(result.value).toHaveLength(1);
				expect(
					organizationScan.organizations[0].latestMeasurement()?.tomlState
				).toBe(TomlState.UnspecifiedError);
			});

			it('should update toml state to ValidatorNotSEP20LinkedError', () => {
				const organizationScan = createOrganizationScan(new Date('2020-01-01'));
				const nodeScan = createNodeScan(new Date('2020-01-01'));
				nodeScan.nodes[0].updateHomeDomain(
					'domain2.com',
					new Date('2020-01-01')
				);
				const tomlInfo = createTomlInfo(nodeScan);
				const result = organizationScan.updateWithTomlInfoCollection(
					new Map([['domain.com', tomlInfo]]),
					nodeScan
				);
				expect(result.isOk()).toBe(true);
				if (result.isErr()) throw result.error;
				expect(result.value).toHaveLength(1);
				expect(
					organizationScan.organizations[0].latestMeasurement()?.tomlState
				).toBe(TomlState.ValidatorNotSEP20Linked);
			});
		});

		it('should update toml state to EmptyValidatorsField', function () {
			const organizationScan = createOrganizationScan(new Date('2020-01-01'));
			const nodeScan = createNodeScan(new Date('2020-01-01'));
			const tomlInfo = createTomlInfo(nodeScan);
			tomlInfo.validators = [];
			const result = organizationScan.updateWithTomlInfoCollection(
				new Map([['domain.com', tomlInfo]]),
				nodeScan
			);
			expect(result.isOk()).toBe(true);
			if (result.isErr()) throw result.error;
			expect(result.value).toHaveLength(1);
			expect(
				organizationScan.organizations[0].latestMeasurement()?.tomlState
			).toBe(TomlState.EmptyValidatorsField);
		});

		function createOrganizationTomlInfoWithNullValues(): OrganizationTomlInfo {
			return {
				state: TomlState.Ok,
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
				validators: ['a']
			};
		}

		function createTomlInfo(nodeScan: NodeScan) {
			const tomlInfo: OrganizationTomlInfo = {
				state: TomlState.Ok,
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

	describe('archiveOrganizationsWithNoActiveValidators', () => {
		it('should archive organizations with no active validators', () => {
			const organizationScan = createOrganizationScan(new Date('2020-01-01'));
			organizationScan.organizations[0].updateValidators(
				new OrganizationValidators([createDummyPublicKey()]),
				new Date('2020-01-01')
			);

			const archived =
				organizationScan.archiveOrganizationsWithNoActiveValidators(
					new NodeScan(new Date('2020-01-01'), [])
				);
			expect(archived).toHaveLength(1);
			expect(organizationScan.organizations[0].snapshotEndDate).toEqual(
				new Date('2020-01-01')
			);
		});

		it('should not archive organizations with active validators', () => {
			const organizationScan = createOrganizationScan(new Date('2020-01-01'));
			const nodeScan = createNodeScan(new Date('2020-01-01'));
			organizationScan.organizations[0].updateValidators(
				new OrganizationValidators([nodeScan.nodes[0].publicKey]),
				new Date('2020-01-01')
			);

			const archived =
				organizationScan.archiveOrganizationsWithNoActiveValidators(nodeScan);
			expect(archived).toHaveLength(0);
			expect(organizationScan.organizations[0].snapshotEndDate).toEqual(
				Snapshot.MAX_DATE
			);
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
