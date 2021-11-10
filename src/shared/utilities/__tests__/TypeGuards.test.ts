import isPartOfStringEnum from '../TypeGuards';

enum Type {
	myType = 'myType'
}

test('enum', function () {
	expect(isPartOfStringEnum('myType', Type)).toBeTruthy();
});
