import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import 'reflect-metadata';
import { GetNodeDTO } from './GetNodeDTO';
import { GetNetwork } from '../get-network/GetNetwork';
import { NodeV1 } from '@stellarbeat/js-stellarbeat-shared';

@injectable()
export class GetNode {
	constructor(
		private readonly getNetwork: GetNetwork,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async execute(dto: GetNodeDTO): Promise<Result<NodeV1 | null, Error>> {
		const networkOrError = await this.getNetwork.execute({
			at: dto.at
		});

		if (networkOrError.isErr()) {
			return err(networkOrError.error);
		}

		if (networkOrError.value === null) {
			return ok(null);
		}

		const node = networkOrError.value.nodes.find(
			(node) => node.publicKey === dto.publicKey
		);

		if (!node) return ok(null);

		return ok(node);
	}
}
