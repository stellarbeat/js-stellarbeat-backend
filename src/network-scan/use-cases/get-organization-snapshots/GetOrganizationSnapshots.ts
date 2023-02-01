import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetOrganizationSnapshotsDTO } from './GetOrganizationSnapshotsDTO';
import { OrganizationSnapShot } from '@stellarbeat/js-stellarbeat-shared';
import { OrganizationId } from '../../domain/organization/OrganizationId';
import { OrganizationSnapshotMapper } from '../../mappers/OrganizationSnapshotMapper';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import { OrganizationSnapShotRepository } from '../../domain/organization/OrganizationSnapShotRepository';

@injectable()
export class GetOrganizationSnapshots {
	constructor(
		@inject(NETWORK_TYPES.OrganizationSnapshotRepository)
		private repo: OrganizationSnapShotRepository,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetOrganizationSnapshotsDTO
	): Promise<Result<OrganizationSnapShot[], Error>> {
		try {
			const organizationIdOrError = OrganizationId.create(
				dto.organizationId,
				dto.organizationId
			);
			if (organizationIdOrError.isErr())
				return err(organizationIdOrError.error);
			const snapshots = await this.repo.findLatestByOrganizationId(
				organizationIdOrError.value,
				dto.at
			);
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
