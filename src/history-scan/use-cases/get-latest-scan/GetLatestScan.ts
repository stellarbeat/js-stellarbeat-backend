import { Url } from '../../../core/domain/Url';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { GetLatestScanDTO } from './GetLatestScanDTO';
import { HistoryArchiveScan } from '@stellarbeat/js-stellarbeat-shared';
import { InvalidUrlError } from './InvalidUrlError';
import { Result, err, ok } from 'neverthrow';
import { ScanRepository } from '../../domain/scan/ScanRepository';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../infrastructure/di/di-types';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import 'reflect-metadata';
import { ScanErrorType } from '../../domain/scan/ScanError';

@injectable()
export class GetLatestScan {
	constructor(
		@inject(TYPES.HistoryArchiveScanRepository)
		private scanRepository: ScanRepository,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async execute(
		dto: GetLatestScanDTO
	): Promise<Result<HistoryArchiveScan | null, InvalidUrlError | Error>> {
		const urlOrError = Url.create(dto.url);
		if (urlOrError.isErr()) return err(new InvalidUrlError(dto.url));
		try {
			const scan = await this.scanRepository.findLatestByUrl(
				urlOrError.value.value
			);

			if (scan === null) return ok(null);

			return ok(
				new HistoryArchiveScan(
					scan.baseUrl.value,
					scan.startDate,
					scan.endDate,
					scan.latestVerifiedLedger,
					scan.error?.type === ScanErrorType.TYPE_VERIFICATION,
					scan.error?.type === ScanErrorType.TYPE_VERIFICATION
						? scan.error.url
						: null,
					scan.error?.type === ScanErrorType.TYPE_VERIFICATION
						? scan.error.message
						: null,
					scan.isSlowArchive ?? false
				)
			);
		} catch (e) {
			this.exceptionLogger.captureException(mapUnknownToError(e));
			return err(mapUnknownToError(e));
		}
	}
}
