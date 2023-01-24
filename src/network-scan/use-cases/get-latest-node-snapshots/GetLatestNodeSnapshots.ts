import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import NodeSnapShotter from '../../domain/node/snapshotting/NodeSnapShotter';
import { GetLatestNodeSnapshotsDTO } from './GetLatestNodeSnapshotsDTO';
import { NodeSnapShot } from '@stellarbeat/js-stellarbeat-shared';
import { NodeSnapshotMapper } from '../../services/NodeSnapshotMapper';

@injectable()
export class GetLatestNodeSnapshots {
	constructor(
		private repo: NodeSnapShotter,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetLatestNodeSnapshotsDTO
	): Promise<Result<NodeSnapShot[], Error>> {
		try {
			const snapshots = await this.repo.findLatestSnapShots(dto.at);
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
