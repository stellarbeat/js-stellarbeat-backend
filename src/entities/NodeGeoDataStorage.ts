import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";
import {NodeGeoData} from "@stellarbeat/js-stellar-domain";
import CrawlV2 from "./CrawlV2";
import {logMethod} from "../logger";

@Entity('node_geo_data')
export default class NodeGeoDataStorage {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column("varchar", {length: 10, nullable: true})
    countryCode: string | null = null;
    @Column("varchar", {length: 255, nullable: true})
    countryName: string | null = null;

    @Column("numeric", {name: 'latitude', nullable: true})
    protected _latitude: string | null = null;
    @Column("numeric", {name: 'longitude', nullable: true})
    protected _longitude: string | null = null;

    static fromGeoData(geoData: NodeGeoData):NodeGeoDataStorage|null {
        let geoDataStorage = new this();

        if(geoData.latitude === undefined)
            return null;

        geoDataStorage.latitude = geoData.latitude;
        geoDataStorage.countryCode = geoData.countryCode ? geoData.countryCode : null;
        geoDataStorage.countryName = geoData.countryName ? geoData.countryName : null;
        geoDataStorage.longitude = geoData.longitude !== undefined ? geoData.longitude : null;


        return geoDataStorage;
    }



    set latitude(value:number|null) {
        if(value !== null)
            this._latitude = value.toString();
    }

    get latitude():number|null {
        if(this._latitude)
            return Number(this._latitude);

        return null;
    }

    set longitude(value:number|null) {
        if(value !== null)
            this._longitude = value.toString();
    }

    get longitude():number|null {
        if(this._longitude)
            return Number(this._longitude);

        return null;
    }

    @logMethod
    toGeoData(crawl:CrawlV2): NodeGeoData {
        let geoData = new NodeGeoData(crawl.validFrom);
        geoData.countryCode = this.countryCode ? this.countryCode : undefined;
        geoData.countryName = this.countryName ? this.countryName : undefined;
        geoData.longitude = this.longitude !== null ? this.longitude : undefined;
        geoData.latitude = this.latitude !==null ? this.latitude : undefined;
        geoData.dateUpdated = crawl.validFrom;

        return geoData;
    }
}