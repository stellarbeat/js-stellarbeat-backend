import { CoreEntity } from './CoreEntity';
import { Snapshot } from './Snapshot';
import { ok } from 'neverthrow';

//https://martinfowler.com/eaaDev/TemporalObject.html
export abstract class VersionedEntity<T extends Snapshot> extends CoreEntity {
	protected _snapshots?: T[];

	public get snapshotStartDate(): Date {
		return this.currentSnapshot().startDate;
	}

	public get snapshotEndDate(): Date {
		return this.currentSnapshot().endDate;
	}

	protected constructor(snapshots: [T]) {
		super();
		this._snapshots = snapshots;
	}

	protected currentSnapshot(): T {
		const snapshot = this.snapshots[this.snapshots.length - 1];
		if (!snapshot) {
			throw new Error('Snapshots not hydrated');
		}
		return this.snapshots[this.snapshots.length - 1];
	}

	protected addSnapshotIfNotExistsFor(time: Date) {
		if (time.getTime() <= this.currentSnapshot().startDate.getTime()) {
			return;
		}

		const newSnapshot = this.currentSnapshot().copy(time);
		this.currentSnapshot().endDate = time;
		this.snapshots.push(newSnapshot);

		return ok(undefined);
	}

	public get snapshots(): T[] {
		if (!this._snapshots) {
			throw new Error('Snapshots not hydrated');
		}
		return this._snapshots;
	}

	public set snapshots(snapshots: T[]) {
		this._snapshots = snapshots;
	}

	isSnapshottedAt(time: Date): boolean {
		return this.snapshotStartDate.getTime() === time.getTime();
	}

	archive(time: Date): void {
		this.currentSnapshot().endDate = time;
	}

	unArchive(time: Date): void {
		this.addSnapshotIfNotExistsFor(time);
	}
}
