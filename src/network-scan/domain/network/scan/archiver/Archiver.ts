import { Node, Organization } from '@stellarbeat/js-stellar-domain';
import { Result } from 'neverthrow';

export interface Archiver {
	archive(
		nodes: Node[],
		organizations: Organization[],
		time: Date
	): Promise<Result<void, Error>>;
}
