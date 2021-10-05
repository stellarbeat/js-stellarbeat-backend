import 'reflect-metadata';
import { default as axios, AxiosResponse } from 'axios';
import { err, ok, Result } from 'neverthrow';
import { isNumber, isObject } from '../utilities/TypeGuards';
import { injectable } from 'inversify';

@injectable()
export class HistoryService {
	async fetchStellarHistory(
		historyUrl: string
	): Promise<Result<Record<string, unknown>, Error>> {
		let timeout: NodeJS.Timeout | undefined;
		try {
			historyUrl = historyUrl.replace(/\/$/, ''); //remove trailing slash
			const stellarHistoryUrl =
				historyUrl + '/.well-known/stellar-history.json';
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, 2050);
			const response: AxiosResponse<unknown> = await axios.get(
				stellarHistoryUrl,
				{
					cancelToken: source.token,
					timeout: 2000,
					headers: { 'User-Agent': 'stellarbeat.io' }
				}
			);

			clearTimeout(timeout);
			if (!isObject(response.data))
				return err(new Error('Invalid history response, no data property'));

			return ok(response.data);
		} catch (error) {
			if (timeout) clearTimeout(timeout);
			if (error instanceof Error) return err(error);

			return err(new Error('Could not fetch history'));
		}
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
