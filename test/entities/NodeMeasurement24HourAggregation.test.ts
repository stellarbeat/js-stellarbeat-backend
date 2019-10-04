import NodeMeasurement24HourAggregation from "../../src/entities/NodeMeasurement24HourAggregation";

test("entity", () => {
    let agg = new NodeMeasurement24HourAggregation(
        'abc', 'isValid'
    );
    let date = new Date();
    date.setFullYear(1999, 0, 0);
    date.setHours(0);
    agg.lastDate = date;

    let nextDate = new Date();
    nextDate.setFullYear(1999, 0, 0);
    nextDate.setHours(0);

    agg.addMeasurement(true, nextDate, 1);
    expect(agg.numberOfCrawls.length).toEqual(24);
    expect(agg.counters.length).toEqual(24);
    expect(agg.counters[0]).toEqual(1);
    expect(agg.numberOfCrawls[0]).toEqual(1);
    expect(agg.position).toEqual(0);
    expect(agg.lastDate).toEqual(nextDate);

    agg.addMeasurement(false, nextDate, 2);
    expect(agg.counters[0]).toEqual(1);
    expect(agg.numberOfCrawls[0]).toEqual(2);
    expect(agg.position).toEqual(0);
    expect(agg.lastDate).toEqual(nextDate);

    nextDate = new Date();
    nextDate.setFullYear(1999, 0, 0);
    nextDate.setHours(1);
    agg.addMeasurement(true, nextDate, 1);
    expect(agg.counters[0]).toEqual(1);
    expect(agg.numberOfCrawls[0]).toEqual(2);
    expect(agg.counters[1]).toEqual(1);
    expect(agg.numberOfCrawls[1]).toEqual(1);
    expect(agg.position).toEqual(1);
    expect(agg.lastDate).toEqual(nextDate);
    //advance a full window
    for(let i = 2; i<24; i++) {
        nextDate = new Date();
        nextDate.setFullYear(1999, 0, 0);
        nextDate.setHours(i);
        agg.addMeasurement(true, nextDate, 1);
    }
    nextDate = new Date();
    nextDate.setFullYear(1999, 0, 1);
    nextDate.setHours(0);
    agg.addMeasurement(false, nextDate, 1);

    expect(agg.position).toEqual(0);
    expect(agg.counters).toEqual([
        0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
    ]);
    expect(agg.numberOfCrawls).toEqual([
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
    ]);

    nextDate = new Date();
    nextDate.setFullYear(1999, 0, 2);
    nextDate.setHours(1);
    agg.addMeasurement(true, nextDate, 1);

    expect(agg.counters).toEqual([
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]);
    expect(agg.numberOfCrawls).toEqual([
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]);
});