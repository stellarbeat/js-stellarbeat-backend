//todo: generics, but needs some refactoring first
import { SnapShot } from '../node/NodeSnapShot';

export interface SnapShotRepository {
	findActive(): Promise<SnapShot[]>;
}
