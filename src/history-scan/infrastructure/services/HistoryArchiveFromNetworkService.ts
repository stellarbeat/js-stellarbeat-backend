import { HistoryArchiveService } from '../../domain/history-archive/HistoryArchiveService';
import { Url } from '../../../core/domain/Url';
import { err, ok, Result } from 'neverthrow';
import { isString } from '../../../core/utilities/TypeGuards';
import { NetworkReadRepository } from '@stellarbeat/js-stellar-domain';
import { inject, injectable } from 'inversify';
import { TYPES as CORE_TYPES } from '../../../core/infrastructure/di/di-types';
import 'reflect-metadata';

@injectable()
export class HistoryArchiveFromNetworkService implements HistoryArchiveService {
	constructor(
		@inject(CORE_TYPES.NetworkReadRepository)
		private networkRepository: NetworkReadRepository
	) {}

	async getHistoryArchiveUrls(): Promise<Result<Url[], Error>> {
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
