import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import 'reflect-metadata';
import { GetOrganizationsDTO } from './GetOrganizationsDTO';
import { GetNetwork } from '../get-network/GetNetwork';
import { OrganizationV1 } from '@stellarbeat/js-stellarbeat-shared';

@injectable()
export class GetOrganizations {
	constructor(
		private readonly getNetwork: GetNetwork,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async execute(
		dto: GetOrganizationsDTO
	): Promise<Result<OrganizationV1[], Error>> {
		const networkOrError = await this.getNetwork.execute({
			at: dto.at
		});

		if (networkOrError.isErr()) {
			return err(networkOrError.error);
		}

		if (networkOrError.value === null) {
			return ok([]);
		}

		return ok(networkOrError.value.organizations);
	}
}
