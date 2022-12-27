import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	Index,
	ValueTransformer
} from 'typeorm';
import { QuorumSet } from '@stellarbeat/js-stellar-domain';

export const quorumSetTransformer: ValueTransformer = {
	from: (dbValue) => {
		return QuorumSet.fromJSON(dbValue);
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
	quorumSet: QuorumSet;

	constructor(hash: string, quorumSet: QuorumSet) {
		this.hash = hash;
		this.quorumSet = quorumSet;
	}

	static fromQuorumSet(
		hash: string | null,
		quorumSet: QuorumSet
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
