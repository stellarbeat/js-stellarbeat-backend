import { err, ok, Result } from 'neverthrow';
import { inject } from 'inversify';
import { NETWORK_TYPES } from '../../infrastructure/di/di-types';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { NetworkId } from '../../domain/network/NetworkId';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { NetworkQuorumSetMapper } from './NetworkQuorumSetMapper';
import { InvalidQuorumSetConfigError } from './InvalidQuorumSetConfigError';
import { NetworkRepository } from '../../domain/network/NetworkRepository';
import { Network, NetworkProps } from '../../domain/network/Network';
import { OverlayVersionRange } from '../../domain/network/OverlayVersionRange';
import { UpdateNetworkDTO } from './UpdateNetworkDTO';
import { InvalidOverlayRangeError } from './InvalidOverlayRangeError';
import { StellarCoreVersion } from '../../domain/network/StellarCoreVersion';
import { InvalidStellarCoreVersionError } from './InvalidStellarCoreVersionError';
import { RepositoryError } from './RepositoryError';

export class UpdateNetwork {
	constructor(
		@inject(NETWORK_TYPES.VersionedNetworkRepository)
		private networkRepository: NetworkRepository,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async execute(dto: UpdateNetworkDTO): Promise<Result<void, Error>> {
		try {
			const networkId = new NetworkId(dto.networkId);
			const quorumSetOrError = NetworkQuorumSetMapper.fromArray(
				dto.networkQuorumSet
			);
			if (quorumSetOrError.isErr()) {
				return err(new InvalidQuorumSetConfigError());
			}
			const overlayRangeOrError = OverlayVersionRange.create(
				dto.overlayMinVersion,
				dto.overlayVersion
			);
			if (overlayRangeOrError.isErr())
				return err(new InvalidOverlayRangeError());

			const stellarCoreVersionOrError = StellarCoreVersion.create(
				dto.stellarCoreVersion
			);
			if (stellarCoreVersionOrError.isErr())
				return err(new InvalidStellarCoreVersionError());

			const configProps: NetworkProps = {
				name: dto.name,
				overlayVersionRange: overlayRangeOrError.value,
				quorumSetConfiguration: quorumSetOrError.value,
				maxLedgerVersion: dto.ledgerVersion,
				stellarCoreVersion: stellarCoreVersionOrError.value
			};

			const network = await this.networkRepository.findOneByNetworkId(
				networkId
			);
			if (!network) {
				await this.networkRepository.save(
					Network.create(dto.time, networkId, dto.passphrase, configProps)
				);
				return ok(undefined);
			}

			network.updateName(configProps.name, dto.time);
			network.updateMaxLedgerVersion(configProps.maxLedgerVersion, dto.time);
			network.updateOverlayVersionRange(
				configProps.overlayVersionRange,
				dto.time
			);
			network.updateQuorumSetConfiguration(
				configProps.quorumSetConfiguration,
				dto.time
			);
			network.updateStellarCoreVersion(
				configProps.stellarCoreVersion,
				dto.time
			);

			if (network.isSnapshottedAt(dto.time)) {
				await this.networkRepository.save(network);
			}

			return ok(undefined);
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(new RepositoryError(dto.networkId));
		}
	}
}
