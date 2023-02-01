import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetLatestNodeSnapshotsDTO } from './GetLatestNodeSnapshotsDTO';
import { NodeSnapShot } from '@stellarbeat/js-stellarbeat-shared';
import { NodeSnapshotMapper } from '../../mappers/NodeSnapshotMapper';
import { NodeSnapShotRepository } from '../../domain/node/NodeSnapShotRepository';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import 'reflect-metadata';

@injectable()
export class GetLatestNodeSnapshots {
	constructor(
		@inject(NETWORK_TYPES.NodeSnapshotRepository)
		private repo: NodeSnapShotRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetLatestNodeSnapshotsDTO
	): Promise<Result<NodeSnapShot[], Error>> {
		try {
			const snapshots = await this.repo.findLatest(dto.at);
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
