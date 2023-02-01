import Organization from '../Organization';
import { OrganizationTomlInfo } from './OrganizationTomlInfo';
import { NodeScan } from '../../node/scan/NodeScan';
import { err, ok, Result } from 'neverthrow';
import { OrganizationContactInformation } from '../OrganizationContactInformation';
import PublicKey from '../../node/PublicKey';
import Node from '../../node/Node';
import { OrganizationId } from '../OrganizationId';
import { CustomError } from '../../../../core/errors/CustomError';
import { OrganizationValidators } from '../OrganizationValidators';

type homeDomain = string;

export interface InvalidOrganizationTomlInfo {
	homeDomain: string;
	error: Error;
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
	): Result<InvalidOrganizationTomlInfo[], Error> {
		if (!this.isSameTime(nodeScan)) {
			return err(new Error('NodeScan has different time'));
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

	public archiveOrganizationsWithNoActiveValidators(nodeScan: NodeScan) {
		this.organizations.forEach((organization) => {
			const activeNodes = organization.validators.value.filter((validator) =>
				nodeScan.getNodeByPublicKeyString(validator.value)
			);

			if (activeNodes.length === 0) organization.archive(this.time);
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

	private updateWithTomlInfo(
		homeDomain: string,
		archivedOrganizations: Organization[],
		organizationTomlInfo: OrganizationTomlInfo,
		nodeScan: NodeScan
	): InvalidOrganizationTomlInfo | undefined {
		if (organizationTomlInfo.validators.length === 0)
			return {
				homeDomain: homeDomain,
				error: new Error('Organization without validators')
			};
		//TODO: this should  be replaced by checking toml version. If unsupported, return invalid

		let organization = this.getOrganizationByHomeDomain(homeDomain);

		if (!organization) {
			organization =
				archivedOrganizations.find(
					(organization) => organization.homeDomain === homeDomain
				) ?? null;
			if (organization) {
				organization.unArchive(this.time);
				this.organizations.push(organization);
			}
		}

		if (!organization) {
			const organizationId = OrganizationId.create(homeDomain);
			if (organizationId.isErr()) {
				return {
					homeDomain: homeDomain,
					error: organizationId.error
				};
			}
			organization = Organization.create(
				organizationId.value,
				homeDomain,
				this.time
			);
			this.organizations.push(organization);
		}

		const result = this.updateOrganization(
			organization,
			organizationTomlInfo,
			nodeScan
		);

		if (result.isErr())
			return {
				homeDomain: homeDomain,
				error: result.error
			};
	}

	private updateOrganization(
		organization: Organization,
		organizationTomlInfo: OrganizationTomlInfo,
		nodeScan: NodeScan
	): Result<void, Error> {
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
	): Result<void, Error> {
		if (validators.length === 0) return ok(undefined);

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
				new InvalidHomeDomainError(
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

export class InvalidHomeDomainError extends CustomError {
	constructor(
		organizationHomeDomain: string,
		validatorHomeDomain: string | null,
		validator: PublicKey
	) {
		super(
			`Cannot add validator ${validator} with home-domain ${validatorHomeDomain}
			 to organization with home-domain ${organizationHomeDomain} `,
			InvalidHomeDomainError.name
		);
	}
}
