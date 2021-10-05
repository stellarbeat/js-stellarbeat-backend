import 'reflect-metadata';
import { err, ok, Result } from 'neverthrow';
import { isNumber, isObject } from '../utilities/TypeGuards';
import { inject, injectable } from 'inversify';
import { HttpService } from './HttpService';
import { Url } from '../value-objects/Url';

@injectable()
export class HistoryService {
	constructor(@inject('HttpService') protected httpService: HttpService) {
		this.httpService = httpService;
	}

	async fetchStellarHistory(
		historyUrl: string
	): Promise<Result<Record<string, unknown>, Error>> {
		historyUrl = historyUrl.replace(/\/$/, ''); //remove trailing slash
		const stellarHistoryUrl = historyUrl + '/.well-known/stellar-history.json';

		const urlResult = Url.create(stellarHistoryUrl);
		if (urlResult.isErr()) return err(urlResult.error);

		const response = await this.httpService.get(urlResult.value);
		if (response.isErr()) return err(response.error);

		if (!isObject(response.value.data))
			return err(new Error('Invalid history response, no data property'));

		return ok(response.value.data);
	}

	getCurrentLedger(
		stellarHistory: Record<string, unknown>
	): Result<number, Error> {
		if (isNumber(stellarHistory.currentLedger)) {
			return ok(stellarHistory.currentLedger);
		}

		return err(
			new Error(
				'History contains invalid ledger: ' + stellarHistory.currentLedger
			)
		);
	}

	async stellarHistoryIsUpToDate(
		historyUrl: string,
		latestLedger: string
	): Promise<boolean> {
		const stellarHistoryResult = await this.fetchStellarHistory(historyUrl);

		if (stellarHistoryResult.isErr()) {
			console.log(stellarHistoryResult.error.message);
			return false;
		}

		const currentLedgerResult = this.getCurrentLedger(
			stellarHistoryResult.value
		);
		if (currentLedgerResult.isErr()) {
			console.log(currentLedgerResult.error.message);
			return false;
		}

		//todo: latestLedger sequence is bigint, but horizon returns number type for ledger sequence
		return currentLedgerResult.value + 100 >= Number(latestLedger); //allow for a margin of 100 ledgers to account for delay in archiving
	}
}
