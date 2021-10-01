import { injectable } from 'inversify';
import { Node, Organization } from '@stellarbeat/js-stellar-domain';
import * as AWS from 'aws-sdk';
import { PutObjectRequest } from 'aws-sdk/clients/s3';
import { isString } from '../utilities/TypeGuards';
import { err, ok, Result } from 'neverthrow';

export interface JSONArchiver {
	archive(
		nodes: Node[],
		organizations: Organization[],
		time: Date
	): Promise<Result<void, Error>>;
}

@injectable()
export class S3Archiver implements JSONArchiver {
	async archive(
		nodes: Node[],
		organizations: Organization[],
		time: Date
	): Promise<Result<void, Error>> {
		const accessKeyId = process.env.AWS_ACCESS_KEY;
		const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
		const bucketName = process.env.AWS_BUCKET_NAME;
		const environment = process.env.NODE_ENV;

		if (!accessKeyId) {
			return err(new Error('[MAIN] Not archiving, s3 not configured'));
		} //todo move to config class. Todo: make S3 Archival optional through config

		if (!isString(bucketName)) throw new Error('bucketname not a string');

		const nodeParams: PutObjectRequest = {
			Bucket: bucketName,
			Key:
				environment +
				'/' +
				time.getFullYear() +
				'/' +
				time.toLocaleString('en-us', { month: 'short' }) +
				'/' +
				time.toISOString() +
				'-nodes.json',
			Body: JSON.stringify(nodes)
		};

		const organizationParams: PutObjectRequest = {
			Bucket: bucketName,
			Key:
				environment +
				'/' +
				time.getFullYear() +
				'/' +
				time.toLocaleString('en-us', { month: 'short' }) +
				'/' +
				time.toISOString() +
				'-organization.json',
			Body: JSON.stringify(organizations)
		};

		const s3 = new AWS.S3({
			accessKeyId: accessKeyId,
			secretAccessKey: secretAccessKey
		});

		try {
			await s3.upload(nodeParams).promise();
			await s3.upload(organizationParams).promise();
			return ok(undefined);
		} catch (e) {
			if (e instanceof Error) return err(e);
			return err(new Error('Error archiving to s3'));
		}
	}
}
