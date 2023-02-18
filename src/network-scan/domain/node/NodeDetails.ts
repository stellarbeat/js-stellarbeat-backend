import { Entity, Column } from 'typeorm';
import { IdentifiedValueObject } from '../../../core/domain/IdentifiedValueObject';

export interface NodeDetailsProps {
	host: string | null;
	name: string | null;
	historyUrl: string | null;
	alias: string | null;
}

@Entity('node_details')
export default class NodeDetails extends IdentifiedValueObject {
	@Column('text', { nullable: true })
	readonly host: string | null = null;

	@Column('text', { nullable: true })
	readonly name: string | null = null;

	@Column('text', { nullable: true })
	readonly historyUrl: string | null = null;

	@Column('text', { nullable: true })
	readonly alias: string | null = null;

	private constructor(
		host: string | null = null,
		name: string | null = null,
		historyUrl: string | null = null,
		alias: string | null = null
	) {
		super();
		this.host = host;
		this.name = name;
		this.historyUrl = historyUrl;
		this.alias = alias;
	}

	static create(props: NodeDetailsProps): NodeDetails {
		return new this(props.host, props.name, props.historyUrl, props.alias);
	}

	equals(other: this): boolean {
		return (
			this.name === other.name &&
			this.host === other.host &&
			this.historyUrl === other.historyUrl &&
			this.alias === other.alias
		);
	}
}
