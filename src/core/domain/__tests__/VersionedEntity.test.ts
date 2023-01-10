import { VersionedEntity } from '../VersionedEntity';
import { Snapshot } from '../Snapshot';

class MySnapshot extends Snapshot {
	constructor(startDate: Date, public myProperty: string) {
		super(startDate);
	}

	copy(startDate: Date): this {
		return new MySnapshot(startDate, this.myProperty) as this;
	}
}

class MyVersionedEntity extends VersionedEntity<MySnapshot> {
	constructor(time: Date, private myProperty: string) {
		super([new MySnapshot(time, myProperty)]);
	}

	getMyProperty(): string {
		return this.currentSnapshot().myProperty;
	}

	setMyProperty(myProperty: string, time: Date): void {
		this.addSnapshotIfNotExistsFor(time);
		this.currentSnapshot().myProperty = myProperty;
	}

	get snapshots(): MySnapshot[] {
		return super.snapshots;
	}
}

it('should get snapshot values from the current snapshot', function () {
	const entity = new MyVersionedEntity(new Date(), 'foo');
	expect(entity.getMyProperty()).toEqual('foo');
	entity.setMyProperty('bar', new Date());
	expect(entity.getMyProperty()).toEqual('bar');
});

it('it should not create a new snapshot if a snapshot already exists for the given time', function () {
	const entity = new MyVersionedEntity(new Date(), 'foo');
	const time = new Date();
	entity.setMyProperty('bar', time);
	expect(entity.snapshots.length).toEqual(1);
	entity.setMyProperty('baz', time);
	expect(entity.snapshots.length).toEqual(1);
});

it('should create a new snapshot for a new time', function () {
	const creationTime = new Date('2020-01-01');
	const entity = new MyVersionedEntity(creationTime, 'foo');
	expect(entity.snapshots.length).toEqual(1);
	const updateTime = new Date('2020-01-02');
	entity.setMyProperty('bar', updateTime);
	expect(entity.snapshots.length).toEqual(2);
	const update2Time = new Date('2020-01-03');
	entity.setMyProperty('baz', update2Time);
	expect(entity.snapshots.length).toEqual(3);
	expect(entity.isSnapshottedAt(update2Time)).toEqual(true);
});
