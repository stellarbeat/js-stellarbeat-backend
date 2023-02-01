import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetNodeSnapshotsDTO } from './GetNodeSnapshotsDTO';
import { NodeSnapShot } from '@stellarbeat/js-stellarbeat-shared';
import PublicKey from '../../domain/node/PublicKey';
import { NodeSnapshotMapper } from '../../mappers/NodeSnapshotMapper';
import { NodeSnapShotRepository } from '../../domain/node/NodeSnapShotRepository';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';

@injectable()
export class GetNodeSnapshots {
	constructor(
		@inject(NETWORK_TYPES.NodeSnapshotRepository)
		private repo: NodeSnapShotRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetNodeSnapshotsDTO
	): Promise<Result<NodeSnapShot[], Error>> {
		try {
			const publicKeyOrError = PublicKey.create(dto.publicKey);
			if (publicKeyOrError.isErr()) {
				return err(publicKeyOrError.error);
			}
			const snapshots = await this.repo.findLatestByPublicKey(
				publicKeyOrError.value,
				dto.at
			);
			return ok(
				snapshots.map((snapshot) =>
					NodeSnapshotMapper.toNodeSnapshotDTO(snapshot)
				)
			);
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
