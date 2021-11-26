import isPartOfStringEnum from '../TypeGuards';
import { EventType } from '../../../network-event-notifications/domain/event/Event';

enum Type {
	myType = 'myType'
}

test('enum', function () {
	expect(isPartOfStringEnum('myType', Type)).toBeTruthy();
});

test('event part of enum', function () {
	expect(isPartOfStringEnum('NodeXUpdatesInactive', EventType)).toBeTruthy();
});
