import { NetworkQuorumSetConfiguration } from '../../domain/network/NetworkQuorumSetConfiguration';
import { err, ok, Result } from 'neverthrow';
import PublicKey from '../../domain/node/PublicKey';

export class NetworkQuorumSetMapper {
	static fromArray(
		quorumSetConfig: Array<string | string[]>
	): Result<NetworkQuorumSetConfiguration, Error> {
		if (quorumSetConfig.length === 0) {
			return err(new Error('Quorum set must not be empty'));
		}
		const threshold = Math.floor(quorumSetConfig.length / 2) + 1;

		const validatorsRaw: string[] = quorumSetConfig.filter(
			(item) => typeof item === 'string'
		) as string[];

		const innerQuorumSetsRaw = quorumSetConfig.filter((item) =>
			Array.isArray(item)
		) as Array<string[]>;

		const validatorsOrErrors = Result.combine(
			validatorsRaw.map((validator) => {
				return PublicKey.create(validator);
			})
		);

		if (validatorsOrErrors.isErr()) {
			return err(validatorsOrErrors.error);
		}
		const validators: PublicKey[] = validatorsOrErrors.value;

		const innerQuorumSetsOrError = Result.combine(
			innerQuorumSetsRaw.map((item) => NetworkQuorumSetMapper.fromArray(item))
		);
		if (innerQuorumSetsOrError.isErr()) {
			return err(innerQuorumSetsOrError.error);
		}

		const innerQuorumSets: NetworkQuorumSetConfiguration[] =
			innerQuorumSetsOrError.value;

		return ok(
			new NetworkQuorumSetConfiguration(threshold, validators, innerQuorumSets)
		);
	}
}
