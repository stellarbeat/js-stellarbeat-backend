//todo: generics, but needs some refactoring first

import { Snapshot } from '../../../core/domain/Snapshot';

export interface SnapShotRepository {
	findActive(): Promise<Snapshot[]>;
}
