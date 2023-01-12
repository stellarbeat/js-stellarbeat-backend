import { Entity, Column, Index } from 'typeorm';
import { IdentifiedValueObject } from '../../../core/domain/IdentifiedValueObject';

export interface NodeGeoDataLocationProps {
	countryCode: string | null;
	countryName: string | null;
	latitude: number | null;
	longitude: number | null;
}

@Entity('node_geo_data')
export default class NodeGeoDataLocation extends IdentifiedValueObject {
	@Index()
	@Column('varchar', { length: 10, nullable: true })
	readonly countryCode: string | null = null;
	@Column('varchar', { length: 255, nullable: true })
	readonly countryName: string | null = null;

	@Column('numeric', { name: 'latitude', nullable: true })
	protected _latitude: string | null = null;
	@Column('numeric', { name: 'longitude', nullable: true })
	protected _longitude: string | null = null;

	private constructor(
		latitude: number | null = null,
		longitude: number | null = null,
		countryCode: string | null = null,
		countryName: string | null = null
	) {
		super();
		this._latitude = latitude !== null ? latitude.toString() : null;
		this._longitude = longitude !== null ? longitude.toString() : null;
		this.countryCode = countryCode;
		this.countryName = countryName;
	}

	static create(props: NodeGeoDataLocationProps): NodeGeoDataLocation {
		return new NodeGeoDataLocation(
			props.latitude,
			props.longitude,
			props.countryCode,
			props.countryName
		);
	}

	get latitude(): number | null {
		if (this._latitude !== null) return Number(this._latitude);

		return null;
	}

	get longitude(): number | null {
		if (this._longitude !== null) return Number(this._longitude);

		return null;
	}

	equals(other: this): boolean {
		return (
			this.countryCode === other.countryCode &&
			this.countryName === other.countryName &&
			this.latitude === other.latitude &&
			this.longitude === other.longitude
		);
	}
}
