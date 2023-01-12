import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { inject, injectable } from 'inversify';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { OrganizationSnapShot } from '@stellarbeat/js-stellar-domain';
import OrganizationSnapShotter from '../../domain/organization/snapshotting/OrganizationSnapShotter';
import { GetLatestOrganizationSnapshotsDTO } from './GetLatestOrganizationSnapshotsDTO';

@injectable()
export class GetLatestOrganizationSnapshots {
	constructor(
		private repo: OrganizationSnapShotter,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}
	async execute(
		dto: GetLatestOrganizationSnapshotsDTO
	): Promise<Result<OrganizationSnapShot[], Error>> {
		try {
			const snapshots = await this.repo.findLatestSnapShots(dto.at);
			return ok(
				snapshots.map(
					(snapshot) =>
						new OrganizationSnapShot(
							snapshot.startDate,
							snapshot.endDate,
							snapshot.toOrganizationDTO(snapshot.startDate)
						)
				)
			);
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(mapUnknownToError(error));
		}
	}
}
