import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import 'reflect-metadata';
import { GetNetwork } from '../get-network/GetNetwork';
import { Organization } from '@stellarbeat/js-stellarbeat-shared';
import { GetOrganizationDTO } from './GetOrganizationDTO';

@injectable()
export class GetOrganization {
	constructor(
		private readonly getNetwork: GetNetwork,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async execute(
		dto: GetOrganizationDTO
	): Promise<Result<Organization | null, Error>> {
		const networkOrError = await this.getNetwork.execute({
			at: dto.at
		});

		if (networkOrError.isErr()) {
			return err(networkOrError.error);
		}

		if (networkOrError.value === null) {
			return ok(null);
		}

		const organization = networkOrError.value?.getOrganizationById(
			dto.organizationId
		);

		if (organization.unknown) return ok(null);

		return ok(organization);
	}
}
