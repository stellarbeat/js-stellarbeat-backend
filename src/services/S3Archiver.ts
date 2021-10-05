import { injectable } from 'inversify';
import { Node, Organization } from '@stellarbeat/js-stellar-domain';
import * as AWS from 'aws-sdk';
import { PutObjectRequest } from 'aws-sdk/clients/s3';
import { err, ok, Result } from 'neverthrow';

export interface JSONArchiver {
	archive(
		nodes: Node[],
		organizations: Organization[],
		time: Date
	): Promise<Result<void, Error>>;
}

@injectable()
export class DummyJSONArchiver implements JSONArchiver {
	archive(
		nodes: Node[],
		organizations: Organization[],
		time: Date
	): Promise<Result<void, Error>> {
		console.log(
			'Dummy archival of ',
			nodes.length,
			' nodes and ',
			organizations.length,
			' organizations at time ',
			time.toISOString()
		);
		return new Promise<Result<void, Error>>((resolve) =>
			resolve(ok(undefined))
		);
	}
}

@injectable()
export class S3Archiver implements JSONArchiver {
	protected accessKeyId: string;
	protected secretAccessKey: string;
	protected bucketName: string;
	protected environment: string;

	constructor(
		accessKeyId: string,
		secretAccessKey: string,
		bucketName: string,
		environment: string
	) {
		this.accessKeyId = accessKeyId;
		this.secretAccessKey = secretAccessKey;
		this.bucketName = bucketName;
		this.environment = environment;
	}

	async archive(
		nodes: Node[],
		organizations: Organization[],
		time: Date
	): Promise<Result<void, Error>> {
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
			Body: JSON.stringify(nodes)
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
			Body: JSON.stringify(organizations)
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
			if (e instanceof Error) return err(e);
			return err(new Error('Error archiving to s3'));
		}
	}
}
