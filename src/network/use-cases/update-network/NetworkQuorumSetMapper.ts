import { QuorumSet } from '../../domain/QuorumSet';
import { err, ok, Result } from 'neverthrow';
import PublicKey from '../../domain/PublicKey';

export class NetworkQuorumSetMapper {
	static fromArray(
		quorumSetConfig: Array<string | string[]>
	): Result<QuorumSet, Error> {
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

		const innerQuorumSets: QuorumSet[] = innerQuorumSetsOrError.value;

		return ok(new QuorumSet(threshold, validators, innerQuorumSets));
	}
}
