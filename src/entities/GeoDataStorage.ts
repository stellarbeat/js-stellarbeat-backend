import {Entity, Column, PrimaryGeneratedColumn, Index} from "typeorm";

@Entity('geo_data')
export default class GeoDataStorage {

    @PrimaryGeneratedColumn()
        // @ts-ignore
    id: number;

    @Index()
    @Column("varchar", {length: 10})
    countryCode: string;
    @Column("varchar", {length: 255})
    countryName: string;

    @Column("numeric")
    latitude: number;
    @Column("numeric")
    longitude: number;

    constructor(countryCode: string, countryName: string, longitude: number, latitude: number) {
        this.countryCode = countryCode;
        this.countryName = countryName;
        this.longitude = longitude;
        this.latitude = latitude;
    }
}