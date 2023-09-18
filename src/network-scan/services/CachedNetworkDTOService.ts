import { NetworkDTOService } from './NetworkDTOService';
import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import * as LRUCache from 'lru-cache';
import { NetworkV1 } from '@stellarbeat/js-stellarbeat-shared';
import { mapUnknownToError } from '../../core/utilities/mapUnknownToError';
import { NETWORK_TYPES } from '../infrastructure/di/di-types';
import { NetworkScanRepository } from '../domain/network/scan/NetworkScanRepository';

@injectable()
export class CachedNetworkDTOService {
	private cache: LRUCache<string, NetworkV1>; //todo: external cache like redis ?
	constructor(
		private networkDTORepository: NetworkDTOService,
		@inject(NETWORK_TYPES.NetworkScanRepository)
		private networkScanRepository: NetworkScanRepository
	) {
		this.cache = new LRUCache<string, NetworkV1>({
			ttl: 1000 * 60 * 10, //10 minutes
			maxSize: 10, //max 10 items
			sizeCalculation: () => {
				return 1;
			}
		});
	}

	public async getLatestNetworkDTO(): Promise<Result<NetworkV1 | null, Error>> {
		try {
			const scanTime =
				await this.networkScanRepository.findLatestSuccessfulScanTime();

			if (!scanTime) return ok(null);

			if (this.cache.has(scanTime.toISOString()))
				return ok(this.cache.get(scanTime.toISOString()) as NetworkV1);

			const latestNetworkDTO =
				await this.networkDTORepository.getLatestNetworkDTO();
			if (latestNetworkDTO.isErr()) return latestNetworkDTO;

			if (latestNetworkDTO.value !== null)
				this.cache.set(scanTime.toISOString(), latestNetworkDTO.value);

			return latestNetworkDTO;
		} catch (e) {
			return err(mapUnknownToError(e));
		}
	}

	public async getNetworkDTOAt(time: Date) {
		//at the moment no caching needed
		return this.networkDTORepository.getNetworkDTOAt(time);
	}
}
