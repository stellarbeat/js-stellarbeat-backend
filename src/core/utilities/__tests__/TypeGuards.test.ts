import isPartOfStringEnum, { isNumber } from '../TypeGuards';
import { EventType } from '../../../notifications/domain/event/Event';

enum Type {
	myType = 'myType'
}

test('enum', function () {
	expect(isPartOfStringEnum('myType', Type)).toBeTruthy();
});

test('event part of enum', function () {
	expect(isPartOfStringEnum('NodeXUpdatesInactive', EventType)).toBeTruthy();
});

test('is a number', () => {
	expect(isNumber(undefined)).toBeFalsy();
	expect(isNumber(0)).toBeTruthy();
	expect(isNumber('0')).toBeFalsy();
});
