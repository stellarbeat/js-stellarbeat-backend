import { MeasuredEntityId } from './MeasuredEntityId';

export class OrganizationId implements MeasuredEntityId {
	constructor(public readonly value: string) {}
}
