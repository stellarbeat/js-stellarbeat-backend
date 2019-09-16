import {NodeGeoData} from "@stellarbeat/js-stellar-domain";
import geoDateUpdateOlderThanOneDay from "../../src/filters/geoDateUpdateOlderThanOneDay";

let geoData = new NodeGeoData();

test('older', () => {
    geoData.dateUpdated = new Date(1999, 1, 1);
    expect(geoDateUpdateOlderThanOneDay(geoData)).toBeTruthy();
});

test('not older', () => {
    geoData.dateUpdated = new Date();
    expect(geoDateUpdateOlderThanOneDay(geoData)).toBeFalsy();
});