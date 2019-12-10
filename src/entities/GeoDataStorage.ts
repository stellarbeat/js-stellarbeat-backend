import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";
import {NodeGeoData} from "@stellarbeat/js-stellar-domain";

@Entity('geo_data')
export default class GeoDataStorage {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column("varchar", {length: 10, nullable: true})
    countryCode: string | null = null;
    @Column("varchar", {length: 255, nullable: true})
    countryName: string | null = null;

    @Column("numeric", {nullable: true})
    latitude: number | null = null;
    @Column("numeric", {nullable: true})
    longitude: number | null = null;

    static fromGeoData(geoData: NodeGeoData) {
        let geoDataStorage = new this();

        if(geoData.latitude === undefined)
            return undefined;

        geoDataStorage.latitude = geoData.latitude;
        geoDataStorage.countryCode = geoData.countryCode ? geoData.countryCode : null;
        geoDataStorage.countryName = geoData.countryName ? geoData.countryName : null;
        geoDataStorage.longitude = geoData.longitude ? geoData.longitude : null;


        return geoDataStorage;
    }

    toGeoData(): NodeGeoData {
        let geoData = new NodeGeoData();
        geoData.countryCode = this.countryCode ? this.countryCode : undefined;
        geoData.countryName = this.countryName ? this.countryName : undefined;
        geoData.longitude = this.longitude ? this.longitude : undefined;
        geoData.latitude = this.latitude ? this.latitude : undefined;

        return geoData;
    }
}