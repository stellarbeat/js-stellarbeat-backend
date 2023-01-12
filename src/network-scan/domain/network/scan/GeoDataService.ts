import 'reflect-metadata';
import { Node as NodeDTO } from '@stellarbeat/js-stellar-domain';
import { Result } from 'neverthrow';
import { CustomError } from '../../../../core/errors/CustomError';

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
	updateGeoDataForNode(
		node: NodeDTO
	): Promise<Result<void, GeoDataUpdateError>>;
	updateGeoData(nodes: NodeDTO[]): Promise<void>;
}
