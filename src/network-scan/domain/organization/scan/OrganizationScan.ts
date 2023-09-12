import Organization from '../Organization';
import { OrganizationTomlInfo } from './OrganizationTomlInfo';
import { NodeScan } from '../../node/scan/NodeScan';
import { err, ok, Result } from 'neverthrow';
import { OrganizationContactInformation } from '../OrganizationContactInformation';
import PublicKey from '../../node/PublicKey';
import Node from '../../node/Node';
import { OrganizationId } from '../OrganizationId';
import { OrganizationValidators } from '../OrganizationValidators';
import { ValidatorNotSEP20LinkedError } from './errors/ValidatorNotSEP20LinkedError';
import { TomlWithoutValidatorsError } from './errors/TomlWithoutValidatorsError';
import { WrongNodeScanForOrganizationScan } from './errors/WrongNodeScanForOrganizationScan';
import { InvalidOrganizationIdError } from './errors/InvalidOrganizationIdError';
import { OrganizationScanError } from './errors/OrganizationScanError';
import { TomlState } from './TomlState';
import { InvalidTomlStateError } from './errors/InvalidTomlStateError';

type homeDomain = string;

export interface InvalidOrganizationTomlInfo {
	homeDomain: string;
	error: OrganizationScanError;
}

export class OrganizationScan {
	constructor(
		public readonly time: Date,
		public readonly organizations: Organization[]
	) {}

	public updateWithTomlInfoCollection(
		organizationTomlInfoCollection: Map<homeDomain, OrganizationTomlInfo>,
		nodeScan: NodeScan,
		archivedOrganizations: Organization[] = []
	): Result<InvalidOrganizationTomlInfo[], OrganizationScanError> {
		if (!this.isSameTime(nodeScan)) {
			return err(
				new WrongNodeScanForOrganizationScan(this.time, nodeScan.time)
			);
		}

		const invalidOrganizationTomlInfos: InvalidOrganizationTomlInfo[] = [];

		organizationTomlInfoCollection.forEach(
			(organizationTomlInfo, homeDomain) => {
				const invalid = this.updateWithTomlInfo(
					homeDomain,
					archivedOrganizations,
					organizationTomlInfo,
					nodeScan
				);
				if (invalid) invalidOrganizationTomlInfos.push(invalid);
			}
		);

		this.updateValidatorsThatChangedHomeDomains(nodeScan);

		return ok(invalidOrganizationTomlInfos);
	}

	public calculateOrganizationAvailability(nodeScan: NodeScan) {
		this.organizations.forEach((organization) => {
			organization.updateAvailability(nodeScan.nodes, this.time);
		});
	}

	public archiveOrganizationsWithNoActiveValidators(
		nodeScan: NodeScan
	): Organization[] {
		return this.organizations
			.filter((organization) => {
				const activeNodes = organization.validators.value.filter((validator) =>
					nodeScan.getNodeByPublicKeyString(validator.value)
				);

				return activeNodes.length === 0;
			})
			.map((organization) => {
				organization.archive(this.time);
				return organization;
			});
	}

	getAvailableOrganizationsCount(): number {
		return this.organizations.filter((organization) =>
			organization.isAvailable()
		).length;
	}

	private updateValidatorsThatChangedHomeDomains(nodeScan: NodeScan) {
		this.organizations.forEach((organization) => {
			const validators = organization.validators.value
				.map((publicKey) => {
					const node = nodeScan.getNodeByPublicKeyString(publicKey.value);
					if (node && node.homeDomain !== organization.homeDomain) {
						return null;
					} //if no node is found, it won't impact the application. It could be unknown or archived

					return publicKey;
				})
				.filter((publicKey): publicKey is PublicKey => !!publicKey);

			organization.updateValidators(
				new OrganizationValidators(validators),
				this.time
			);
		});
	}

	private unArchiveOrCreateOrganization(
		archivedOrganizations: Organization[],
		homeDomain: string
	): Organization | InvalidOrganizationTomlInfo {
		const archivedOrganization =
			archivedOrganizations.find(
				(organization) => organization.homeDomain === homeDomain
			) ?? null;

		if (archivedOrganization) {
			archivedOrganization.unArchive(this.time);
			return archivedOrganization;
		}

		const organizationId = OrganizationId.create(homeDomain);
		if (organizationId.isErr()) {
			return {
				homeDomain: homeDomain,
				error: new InvalidOrganizationIdError(homeDomain, organizationId.error)
			};
		}
		return Organization.create(organizationId.value, homeDomain, this.time);
	}

	private updateWithTomlInfo(
		homeDomain: string,
		archivedOrganizations: Organization[],
		organizationTomlInfo: OrganizationTomlInfo,
		nodeScan: NodeScan
	): InvalidOrganizationTomlInfo | undefined {
		let organization = this.getOrganizationByHomeDomain(homeDomain);

		if (!organization) {
			const organizationOrError = this.unArchiveOrCreateOrganization(
				archivedOrganizations,
				homeDomain
			);

			if (organizationOrError instanceof Organization)
				organization = organizationOrError;
			else return organizationOrError;

			this.organizations.push(organization);
		}

		organization.updateTomlState(organizationTomlInfo.state, this.time);
		if (organizationTomlInfo.state !== TomlState.Ok) {
			return {
				homeDomain: homeDomain,
				error: new InvalidTomlStateError(homeDomain, organizationTomlInfo.state)
			};
		}

		const result = this.updateOrganization(
			organization,
			organizationTomlInfo,
			nodeScan
		);

		if (result.isErr()) {
			if (result.error instanceof ValidatorNotSEP20LinkedError)
				organization.updateTomlState(
					TomlState.ValidatorNotSEP20Linked,
					this.time
				);
			if (result.error instanceof TomlWithoutValidatorsError)
				organization.updateTomlState(TomlState.EmptyValidatorsField, this.time);
			return {
				homeDomain: homeDomain,
				error: result.error
			};
		}
	}

	private updateOrganization(
		organization: Organization,
		organizationTomlInfo: OrganizationTomlInfo,
		nodeScan: NodeScan
	): Result<void, ValidatorNotSEP20LinkedError | TomlWithoutValidatorsError> {
		if (organizationTomlInfo.name)
			organization.updateName(organizationTomlInfo.name, this.time);
		if (organizationTomlInfo.description)
			organization.updateDescription(
				organizationTomlInfo.description,
				this.time
			);
		if (organizationTomlInfo.url)
			organization.updateUrl(organizationTomlInfo.url, this.time);
		if (organizationTomlInfo.horizonUrl)
			organization.updateHorizonUrl(organizationTomlInfo.horizonUrl, this.time);
		const contactInformation = OrganizationContactInformation.create({
			dba: organizationTomlInfo.dba,
			officialEmail: organizationTomlInfo.officialEmail,
			keybase: organizationTomlInfo.keybase,
			github: organizationTomlInfo.github,
			twitter: organizationTomlInfo.twitter,
			phoneNumber: organizationTomlInfo.phoneNumber,
			physicalAddress: organizationTomlInfo.physicalAddress
		});
		organization.updateContactInformation(contactInformation, this.time);

		return this.updateValidators(
			organization,
			organizationTomlInfo.validators,
			nodeScan
		);
	}

	private updateValidators(
		organization: Organization,
		validators: string[],
		nodeScan: NodeScan
	): Result<void, ValidatorNotSEP20LinkedError | TomlWithoutValidatorsError> {
		if (validators.length === 0)
			return err(new TomlWithoutValidatorsError(organization.homeDomain));

		const publicKeys: PublicKey[] = [];
		validators.forEach((validator) => {
			const publicKeyOrError = PublicKey.create(validator);
			if (publicKeyOrError.isErr()) return;
			const publicKey = publicKeyOrError.value;
			publicKeys.push(publicKey);
		});

		const validatorWithInvalidHomeDomain = publicKeys
			.map((publicKey) => nodeScan.getNodeByPublicKeyString(publicKey.value))
			.filter((node): node is Node => !!node)
			.find((node) => node.homeDomain !== organization.homeDomain);

		if (validatorWithInvalidHomeDomain)
			return err(
				new ValidatorNotSEP20LinkedError(
					organization.homeDomain,
					validatorWithInvalidHomeDomain.homeDomain,
					validatorWithInvalidHomeDomain.publicKey
				)
			);

		organization.updateValidators(
			new OrganizationValidators(publicKeys),
			this.time
		);

		return ok(undefined);
	}

	private getOrganizationByHomeDomain(homeDomain: string): Organization | null {
		return (
			this.organizations.find(
				(organization) => organization.homeDomain === homeDomain
			) ?? null
		);
	}

	private isSameTime(nodeScan: NodeScan): boolean {
		return this.time.getTime() === nodeScan.time.getTime();
	}
}
