import { HttpService } from '../../shared/services/HttpService';
import { Url } from '../../shared/domain/Url';
import { Logger } from '../../shared/services/PinoLogger';
import { CheckPointScan, ScanStatus } from './CheckPointScan';
import { inject, injectable } from 'inversify';

//Stateless service that scans a checkpoint
@injectable()
export class CheckPointScanner {
	constructor(
		@inject('HttpService') protected httpService: HttpService,
		@inject('Logger') protected logger: Logger
	) {}

	async scan(checkPointScan: CheckPointScan) {
		checkPointScan.attempt++;
		if (
			checkPointScan.attempt > 1 ||
			((checkPointScan.checkPoint.ledger + 1) / 64) % 100 === 0
		) {
			console.timeEnd('scan');
			console.time('scan');
			this.logger.info('Scanning checkpoint', {
				ledger: checkPointScan.checkPoint.ledger,
				attempt: checkPointScan.attempt
			});
		}
		await this.scanHistoryCategory(checkPointScan);
		await this.scanLedgerCategory(checkPointScan);
		await this.scanTransactionsCategory(checkPointScan);
		await this.scanResultsCategory(checkPointScan);
	}

	private async scanResultsCategory(checkPointScan: CheckPointScan) {
		checkPointScan.resultsCategoryScanStatus = await this.scanUrl(
			checkPointScan.checkPoint.resultsCategoryUrl
		);
	}

	private async scanTransactionsCategory(checkPointScan: CheckPointScan) {
		checkPointScan.transactionsCategoryScanStatus = await this.scanUrl(
			checkPointScan.checkPoint.transactionsCategoryUrl
		);
	}

	private async scanLedgerCategory(checkPointScan: CheckPointScan) {
		checkPointScan.ledgerCategoryScanStatus = await this.scanUrl(
			checkPointScan.checkPoint.ledgersCategoryUrl
		);
	}

	private async scanHistoryCategory(checkPointScan: CheckPointScan) {
		checkPointScan.historyCategoryScanStatus = await this.scanUrl(
			checkPointScan.checkPoint.historyCategoryUrl
		);
	}

	private async scanUrl(url: Url): Promise<ScanStatus> {
		this.logger.debug('Scanning url', {
			url: url.value
		});
		const resultOrError = await this.httpService.head(url, 10000);
		if (resultOrError.isErr()) {
			this.logger.error('Scan error', {
				code: resultOrError.error.code,
				message: resultOrError.error.message,
				url: url.value
			});
			return ScanStatus.error;
		} else {
			const result = resultOrError.value;
			if (result.status === 200) return ScanStatus.present;
			else {
				this.logger.info('Non 200 result', {
					status: result.status,
					message: result.statusText
				});
				return ScanStatus.missing;
			}
		}
	}
}
