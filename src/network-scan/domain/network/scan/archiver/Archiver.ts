import {
	Node as NodeDTO,
	Organization as OrganizationDTO
} from '@stellarbeat/js-stellarbeat-shared';
import { Result } from 'neverthrow';

export interface Archiver {
	archive(
		nodes: NodeDTO[],
		organizations: OrganizationDTO[],
		time: Date
	): Promise<Result<void, Error>>;
}
