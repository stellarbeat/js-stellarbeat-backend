import olderThanOneDay from "../../src/filters/OlderThanOneDay";

test('older', () => {
    const myDate = new Date(1999, 1, 1);
    expect(olderThanOneDay(myDate)).toBeTruthy();
});

test('not older', () => {
    const myDate = new Date();
    expect(olderThanOneDay(myDate)).toBeFalsy();
});