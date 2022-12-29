import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { GetOrganizationSnapshotsDTO } from './GetOrganizationSnapshotsDTO';
import { OrganizationSnapShot } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotter from '../../domain/snapshotting/OrganizationSnapShotter';

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
			const snapshots = await this.repo.findLatestSnapShotsByOrganization(
				dto.organizationId,
				dto.at
			);
			return ok(
				snapshots.map(
					(snapshot) =>
						new OrganizationSnapShot(
							snapshot.startDate,
							snapshot.endDate,
							snapshot.toOrganization(snapshot.startDate)
						)
				)
			);
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}