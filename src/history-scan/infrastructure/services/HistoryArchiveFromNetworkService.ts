import { HistoryArchiveService } from '../../domain/history-archive/HistoryArchiveService';
import { Url } from '../../../core/domain/Url';
import { err, ok, Result } from 'neverthrow';
import { isString } from '../../../core/utilities/TypeGuards';
import { injectable } from 'inversify';
import 'reflect-metadata';
import { NetworkDTOService } from '../../../network-scan/services/NetworkDTOService';

@injectable()
export class HistoryArchiveFromNetworkService implements HistoryArchiveService {
	constructor(private networkService: NetworkDTOService) {}

	async getHistoryArchiveUrls(): Promise<Result<Url[], Error>> {
		const networkOrError = await this.networkService.getLatestNetworkDTO();
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
