import { MeasuredEntityId } from './MeasuredEntityId';

export class PublicKey implements MeasuredEntityId {
	constructor(public readonly value: string) {}
}
