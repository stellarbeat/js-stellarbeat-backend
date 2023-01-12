import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	Index,
	ValueTransformer
} from 'typeorm';
import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellar-domain';

//TODO: refactor to use domain QuorumSet
export const quorumSetTransformer: ValueTransformer = {
	from: (dbValue) => {
		return QuorumSetDTO.fromJSON(dbValue);
	},
	to: (entityValue) => JSON.stringify(entityValue)
};

/**
 * A quorumSet can be reused between nodes.
 */
@Entity('node_quorum_set')
export default class NodeQuorumSet {
	@PrimaryGeneratedColumn()
	// @ts-ignore
	id: number;

	@Index()
	@Column('varchar', { length: 64 })
	hash: string;

	@Column('jsonb', {
		transformer: quorumSetTransformer
	})
	quorumSet: QuorumSetDTO;

	constructor(hash: string, quorumSet: QuorumSetDTO) {
		this.hash = hash;
		this.quorumSet = quorumSet;
	}

	static fromQuorumSetDTO(
		hash: string | null,
		quorumSet: QuorumSetDTO
	): NodeQuorumSet | null {
		if (
			hash === null ||
			(quorumSet.validators.length === 0 &&
				quorumSet.innerQuorumSets.length === 0)
		)
			return null;

		return new this(hash, quorumSet);
	}
}
