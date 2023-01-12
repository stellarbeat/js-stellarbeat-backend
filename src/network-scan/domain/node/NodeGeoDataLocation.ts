import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { NodeGeoData } from '@stellarbeat/js-stellar-domain';

@Entity('node_geo_data')
export default class NodeGeoDataLocation {
	@PrimaryGeneratedColumn()
	// @ts-ignore
	id: number;

	@Index()
	@Column('varchar', { length: 10, nullable: true })
	countryCode: string | null = null;
	@Column('varchar', { length: 255, nullable: true })
	countryName: string | null = null;

	@Column('numeric', { name: 'latitude', nullable: true })
	protected _latitude: string | null = null;
	@Column('numeric', { name: 'longitude', nullable: true })
	protected _longitude: string | null = null;

	static fromGeoData(geoData: NodeGeoData): NodeGeoDataLocation | null {
		if (geoData.latitude === null) return null;

		const geoDataStorage = new this();

		geoDataStorage.latitude = geoData.latitude;
		geoDataStorage.countryCode = geoData.countryCode;
		geoDataStorage.countryName = geoData.countryName;
		geoDataStorage.longitude = geoData.longitude;

		return geoDataStorage;
	}

	set latitude(value: number | null) {
		if (value !== null) this._latitude = value.toString();
	}

	get latitude(): number | null {
		if (this._latitude) return Number(this._latitude);

		return null;
	}

	set longitude(value: number | null) {
		if (value !== null) this._longitude = value.toString();
	}

	get longitude(): number | null {
		if (this._longitude) return Number(this._longitude);

		return null;
	}

	toGeoData(): NodeGeoData {
		const geoData = new NodeGeoData();
		geoData.countryCode = this.countryCode;
		geoData.countryName = this.countryName;
		geoData.longitude = this.longitude;
		geoData.latitude = this.latitude;

		return geoData;
	}
}
