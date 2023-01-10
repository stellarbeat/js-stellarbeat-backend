//todo: generics, but needs some refactoring first
import { SnapShot } from '../NodeSnapShot';

export interface SnapShotRepository {
	findActive(): Promise<SnapShot[]>;
}
