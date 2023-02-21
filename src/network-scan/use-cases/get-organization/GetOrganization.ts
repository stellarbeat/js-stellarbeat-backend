import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import 'reflect-metadata';
import { GetNetwork } from '../get-network/GetNetwork';
import { OrganizationV1 } from '@stellarbeat/js-stellarbeat-shared';
import { GetOrganizationDTO } from './GetOrganizationDTO';

@injectable()
export class GetOrganization {
	constructor(
		private readonly getNetwork: GetNetwork,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async execute(
		dto: GetOrganizationDTO
	): Promise<Result<OrganizationV1 | null, Error>> {
		const networkOrError = await this.getNetwork.execute({
			at: dto.at
		});

		if (networkOrError.isErr()) {
			return err(networkOrError.error);
		}

		if (networkOrError.value === null) {
			return ok(null);
		}

		const organization = networkOrError.value.organizations.find(
			(organization) => organization.id === dto.organizationId
		);

		if (!organization) return ok(null);

		return ok(organization);
	}
}
