import { inject, injectable } from 'inversify';
import * as AWS from 'aws-sdk';
import { PutObjectRequest } from 'aws-sdk/clients/s3';
import { err, ok, Result } from 'neverthrow';
import { CustomError } from '../../../core/errors/CustomError';
import { Logger } from '../../../core/services/PinoLogger';
import { Archiver } from '../../domain/network/scan/archiver/Archiver';
import { NetworkDTOService } from '../../services/NetworkDTOService';

@injectable()
export class NullArchiver implements Archiver {
	constructor(@inject('Logger') protected logger: Logger) {}

	archive(time: Date): Promise<Result<void, Error>> {
		return new Promise<Result<void, Error>>((resolve) =>
			resolve(ok(undefined))
		);
	}
}

@injectable()
export class S3Archiver implements Archiver {
	constructor(
		private accessKeyId: string,
		private secretAccessKey: string,
		private bucketName: string,
		private environment: string,
		private networkDTOService: NetworkDTOService
	) {}

	async archive(time: Date): Promise<Result<void, Error>> {
		const networkDTOOrError = await this.networkDTOService.getNetworkDTOAt(
			time
		);
		if (networkDTOOrError.isErr()) return err(networkDTOOrError.error);
		if (networkDTOOrError.value === null)
			return err(new Error('Could not find networkDTO for archival'));

		const nodeParams: PutObjectRequest = {
			Bucket: this.bucketName,
			Key:
				this.environment +
				'/' +
				time.getFullYear() +
				'/' +
				time.toLocaleString('en-us', { month: 'short' }) +
				'/' +
				time.toISOString() +
				'-nodes.json',
			Body: JSON.stringify(networkDTOOrError.value.nodes)
		};

		const organizationParams: PutObjectRequest = {
			Bucket: this.bucketName,
			Key:
				this.environment +
				'/' +
				time.getFullYear() +
				'/' +
				time.toLocaleString('en-us', { month: 'short' }) +
				'/' +
				time.toISOString() +
				'-organization.json',
			Body: JSON.stringify(networkDTOOrError.value.organizations)
		};

		const s3 = new AWS.S3({
			accessKeyId: this.accessKeyId,
			secretAccessKey: this.secretAccessKey
		});

		try {
			await s3.upload(nodeParams).promise();
			await s3.upload(organizationParams).promise();
			return ok(undefined);
		} catch (e) {
			const s3Error = new CustomError('Error archiving to S3', 'S3_ERROR');
			if (e instanceof Error) s3Error.cause = e;
			return err(s3Error);
		}
	}
}
