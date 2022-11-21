import { Url } from '../../../shared/domain/Url';
import { err, ok, Result } from 'neverthrow';
import { Scanner } from '../../domain/history-archive-scan/Scanner';
import { inject, injectable } from 'inversify';
import { ScanRepository } from '../../domain/history-archive-scan/ScanRepository';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { mapUnknownToError } from '../../../shared/utilities/mapUnknownToError';
import { isString } from '../../../shared/utilities/TypeGuards';
import { NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { TYPES as SHARED_TYPES } from '../../../shared/core/di-types';
import { Scan } from '../../domain/history-archive-scan/Scan';
import { TYPES } from '../../infrastructure/di/di-types';
import { asyncSleep } from '../../../shared/utilities/asyncSleep';
import { ScanScheduler } from '../../domain/history-archive-scan/ScanScheduler';
import { VerifyArchivesDTO } from './VerifyArchivesDTO';

@injectable()
export class VerifyArchives {
	constructor(
		private scanner: Scanner,
		@inject(TYPES.HistoryArchiveScanRepository)
		private scanRepository: ScanRepository,
		@inject(SHARED_TYPES.NetworkReadRepository)
		private networkRepository: NetworkReadRepository,
		@inject(TYPES.ScanScheduler)
		private scanScheduler: ScanScheduler,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	public async execute(verifyArchivesDTO: VerifyArchivesDTO): Promise<void> {
		const shutDown = false; //todo: implement graceful shutdown
		while (!shutDown) {
			try {
				const historyArchivesOrError = await this.getArchivesToScan();
				if (historyArchivesOrError.isErr()) {
					this.exceptionLogger.captureException(historyArchivesOrError.error);
					await asyncSleep(60 * 60000); //maybe temporary db connection error
					continue;
				}

				await this.scanArchives(
					historyArchivesOrError.value,
					verifyArchivesDTO.persist
				);
			} catch (e) {
				this.exceptionLogger.captureException(mapUnknownToError(e));
				await asyncSleep(60 * 60000);
			}
		}
	}

	private async scanArchives(archives: Url[], persist = false) {
		const previousScans = await this.scanRepository.findLatest();
		const scans = this.scanScheduler.schedule(archives, previousScans); //todo: startDate should be set later
		console.log(
			'Scan schedule',
			scans.map((scan) => {
				return { url: scan.baseUrl.value, from: scan.fromLedger };
			})
		);

		for (let i = 0; i < scans.length; i++) {
			await this.perform(scans[i], persist);
		}
	}

	private async perform(scan: Scan, persist = false) {
		await this.scanner.perform(scan);
		console.log(scan);
		//todo: logger
		if (persist) await this.persist(scan);
	}

	private async persist(scan: Scan) {
		try {
			await this.scanRepository.save([scan]);
		} catch (e: unknown) {
			this.exceptionLogger.captureException(mapUnknownToError(e));
		}
	}

	private async getArchivesToScan(): Promise<Result<Url[], Error>> {
		const networkOrError = await this.networkRepository.getNetwork();
		if (networkOrError.isErr()) {
			return err(networkOrError.error);
		}

		const network = networkOrError.value;
		if (network === null) return err(new Error('No network found'));

		return ok(
			network.nodes
				.map((node) => node.historyUrl)
				.filter((url): url is string => isString(url))
				.map((urlString) => {
					const url = Url.create(urlString);
					if (url.isErr()) return undefined;
					return url.value;
				})
				.filter((url): url is Url => url instanceof Url)
		);
	}
}
