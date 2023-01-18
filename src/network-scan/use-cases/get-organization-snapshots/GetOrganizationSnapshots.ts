import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetOrganizationSnapshotsDTO } from './GetOrganizationSnapshotsDTO';
import { OrganizationSnapShot } from '@stellarbeat/js-stellarbeat-shared';
import OrganizationSnapShotter from '../../domain/organization/snapshotting/OrganizationSnapShotter';
import { OrganizationId } from '../../domain/organization/OrganizationId';
import { OrganizationMapper } from '../../services/OrganizationMapper';

@injectable()
export class GetOrganizationSnapshots {
	constructor(
		private repo: OrganizationSnapShotter,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetOrganizationSnapshotsDTO
	): Promise<Result<OrganizationSnapShot[], Error>> {
		try {
			const organizationIdOrError = OrganizationId.create(dto.organizationId);
			if (organizationIdOrError.isErr())
				return err(organizationIdOrError.error);
			const snapshots = await this.repo.findLatestSnapShotsByOrganizationId(
				organizationIdOrError.value,
				dto.at
			);
			return ok(
				snapshots.map((snapshot) =>
					OrganizationMapper.toOrganizationSnapshotDTO(snapshot)
				)
			);
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
