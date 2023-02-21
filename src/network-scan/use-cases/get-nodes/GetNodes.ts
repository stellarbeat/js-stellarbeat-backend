import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import 'reflect-metadata';
import { GetNodesDTO } from './GetNodesDTO';
import { GetNetwork } from '../get-network/GetNetwork';
import { NodeV1 } from '@stellarbeat/js-stellarbeat-shared';

@injectable()
export class GetNodes {
	constructor(
		private readonly getNetwork: GetNetwork,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async execute(dto: GetNodesDTO): Promise<Result<NodeV1[], Error>> {
		const networkOrError = await this.getNetwork.execute({
			at: dto.at
		});

		if (networkOrError.isErr()) {
			return err(networkOrError.error);
		}

		if (networkOrError.value === null) {
			return ok([]);
		}

		return ok(networkOrError.value.nodes);
	}
}
