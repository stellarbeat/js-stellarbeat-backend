import {NodeGeoData} from "@stellarbeat/js-stellar-domain";

export default (geoData: NodeGeoData) => {
    let date = new Date();
    let yesterday = new Date(date.getTime() - 24*60*60*1000);

    return geoData.dateUpdated.getTime() < yesterday.getTime();
}