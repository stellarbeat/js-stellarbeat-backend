import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";
import {NodeGeoData} from "@stellarbeat/js-stellar-domain";

@Entity('geo_data')
export default class GeoDataStorage {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column("varchar", {length: 10, nullable: true})
    countryCode?: string;
    @Column("varchar", {length: 255, nullable: true})
    countryName?: string;

    @Column("numeric", {nullable: true})
    latitude?: number;
    @Column("numeric", {nullable: true})
    longitude?: number;

    constructor(countryCode?: string, countryName?: string, longitude?: number, latitude?: number) {
        this.countryCode = countryCode;
        this.countryName = countryName;
        this.longitude = longitude;
        this.latitude = latitude;
    }

    static fromGeoData(geoData: NodeGeoData) {
        let geoDataStorage = new this(geoData.countryCode, geoData.countryName, geoData.longitude, geoData.latitude);
        if(Object.values(geoDataStorage).every(el => el === undefined))
            return undefined;

        return geoDataStorage;
    }

    toGeoData(): NodeGeoData {
        let geoData = new NodeGeoData();
        geoData.countryCode = this.countryCode;
        geoData.countryName = this.countryName;
        geoData.longitude = this.longitude;
        geoData.latitude = this.latitude;

        return geoData;
    }
}