import CrawlV2 from "../../src/entities/CrawlV2";

test("crawlV2", () => {
    let date = new Date();
    let crawl = new CrawlV2(date, [1]);

    expect(crawl.ledgers).toEqual([1]);
    expect(crawl.time).toEqual(date);
    expect(crawl.latestLedger).toEqual(BigInt(0))
    expect(crawl.latestLedgerCloseTime.getTime()).toEqual(new Date(0).getTime());
} );