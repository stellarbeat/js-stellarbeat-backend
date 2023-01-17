import 'reflect-metadata';
import { Result } from 'neverthrow';
import { CustomError } from '../../../../core/errors/CustomError';

export interface GeoData {
	longitude: number | null;
	latitude: number | null;
	countryCode: string | null;
	countryName: string | null;
	isp: string | null;
}

export class GeoDataUpdateError extends CustomError {
	constructor(publicKey: string, cause?: Error) {
		super(
			'Failed updating geoData for ' + publicKey,
			GeoDataUpdateError.name,
			cause
		);
	}
}

export interface GeoDataService {
	fetchGeoData(ip: string): Promise<Result<GeoData, GeoDataUpdateError>>;
}
