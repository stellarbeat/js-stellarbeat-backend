import { TrackedEntityId } from './TrackedEntityId';

export class PublicKey implements TrackedEntityId {
	constructor(public readonly value: string) {}
}
