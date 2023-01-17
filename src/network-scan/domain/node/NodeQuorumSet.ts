import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	Index,
	ValueTransformer
} from 'typeorm';
import { QuorumSet as QuorumSetDTO } from '@stellarbeat/js-stellar-domain';
import { ValueObject } from '../../../core/domain/ValueObject';
import { IdentifiedValueObject } from '../../../core/domain/IdentifiedValueObject';

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
export default class NodeQuorumSet extends IdentifiedValueObject {
	@Index()
	@Column('varchar', { length: 64 })
	hash: string;

	@Column('jsonb', {
		transformer: quorumSetTransformer
	})
	quorumSet: QuorumSetDTO;

	private constructor(hash: string, quorumSet: QuorumSetDTO) {
		super();
		this.hash = hash;
		this.quorumSet = quorumSet;
	}

	static create(hash: string, quorumSet: QuorumSetDTO): NodeQuorumSet {
		return new this(hash, quorumSet);
	}

	equals(other: this): boolean {
		return other.hash === this.hash;
	}
}
