import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { OrganizationSnapShot } from '@stellarbeat/js-stellarbeat-shared';
import { GetLatestOrganizationSnapshotsDTO } from './GetLatestOrganizationSnapshotsDTO';
import { OrganizationSnapshotMapper } from '../../mappers/OrganizationSnapshotMapper';
import { OrganizationSnapShotRepository } from '../../domain/organization/OrganizationSnapShotRepository';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import 'reflect-metadata';

@injectable()
export class GetLatestOrganizationSnapshots {
	constructor(
		@inject(NETWORK_TYPES.OrganizationSnapshotRepository)
		private repo: OrganizationSnapShotRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetLatestOrganizationSnapshotsDTO
	): Promise<Result<OrganizationSnapShot[], Error>> {
		try {
			const snapshots = await this.repo.findLatest(dto.at);
			return ok(
				snapshots.map((snapshot) =>
					OrganizationSnapshotMapper.toOrganizationSnapshotDTO(snapshot)
				)
			);
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
