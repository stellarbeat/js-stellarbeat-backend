import { err, ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
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
import { Logger } from '../../../core/services/PinoLogger';

@injectable()
export class UpdateNetwork {
	constructor(
		@inject(NETWORK_TYPES.NetworkRepository)
		private networkRepository: NetworkRepository,
		@inject('Logger') private logger: Logger,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger
	) {}

	async execute(dto: UpdateNetworkDTO): Promise<Result<void, Error>> {
		try {
			this.logger.info('UpdateNetwork.execute', { dto });
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

			const network = await this.networkRepository.findActiveByNetworkId(
				networkId
			);

			if (!network) {
				this.logger.info('Network not found, creating new one', {
					networkId: networkId.value
				});
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
				this.logger.info('Network updated', {
					networkId: networkId.value,
					changes: network.changes
						.filter((change) => change.time.getTime() === dto.time.getTime())
						.map((change) => {
							return {
								type: change.constructor.name,
								to: change.to
							};
						})
				});
				await this.networkRepository.save(network);
			}

			return ok(undefined);
		} catch (error) {
			this.exceptionLogger.captureException(mapUnknownToError(error));
			return err(new RepositoryError(dto.networkId));
		}
	}
}
