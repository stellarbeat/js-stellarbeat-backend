import { CoreEntity } from '../../core/domain/CoreEntity';
import { Snapshot } from './Snapshot';
import { NetworkSnapshot } from './NetworkSnapshot';

export abstract class VersionedEntity<T extends Snapshot> extends CoreEntity {
	static readonly MAX_DATE = new Date(Date.UTC(9999, 11, 31, 23, 59, 59));

	protected _snapshots?: T[];

	protected constructor(snapshots: T[]) {
		super();
		this._snapshots = snapshots;
	}

	protected currentSnapshot(): T {
		const snapshot = this.snapshots[this.snapshots.length - 1];
		if (!(snapshot instanceof Snapshot)) {
			throw new Error('No snapshots');
		}
		return this.snapshots[this.snapshots.length - 1];
	}

	createSnapshotWorkingCopy(time: Date): T {
		return this.currentSnapshot().copy(time);
	}

	addSnapshot(snapshot: T) {
		if (!snapshot.containsUpdates(this.currentSnapshot())) {
			return; //no changes
		}

		if (this.currentSnapshot().endDate !== NetworkSnapshot.MAX_DATE) {
			throw new Error('Can only add version at end of chain');
		}
		if (snapshot.startDate < this.currentSnapshot().startDate) {
			throw new Error('Cannot add version before current version');
		}
		this.currentSnapshot().endDate = snapshot.startDate;
		this.snapshots.push(snapshot);
	}

	get snapshots(): T[] {
		if (!this._snapshots) {
			this._snapshots = [];
		}
		return this._snapshots;
	}
}
