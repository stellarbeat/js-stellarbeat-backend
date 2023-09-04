import { Url } from '../domain/Url';
import { Result } from 'neverthrow';
import * as http from 'http';
import * as https from 'https';
import { CustomError } from '../errors/CustomError';

export function isHttpError(payload: unknown): payload is HttpError {
	return payload instanceof HttpError;
}

export type HttpResponse<T = unknown> = {
	data: T;
	status: number;
	statusText: string;
	headers: unknown;
};

export class HttpError<T = unknown> extends CustomError {
	code?: string;
	response?: HttpResponse<T>;
	constructor(message?: string, code?: string, response?: HttpResponse<T>) {
		super(message ?? '', HttpError.name);
		this.code = code;
		this.response = response;
		this.name = 'HttpError';
	}
}

export interface HttpOptions {
	auth?: {
		username: string;
		password: string;
	};
	socketTimeoutMs?: number;
	connectionTimeoutMs?: number; //if stream, this is time until stream is returned, if other, this is the time the whole operation can take
	maxContentLength?: number;
	responseType?: 'arraybuffer' | 'json' | 'stream';
	httpAgent?: http.Agent;
	httpsAgent?: https.Agent;
	abortSignal?: AbortSignal;
}

export interface HttpService {
	post(
		url: Url,
		data: Record<string, unknown>,
		httpOptions?: HttpOptions
	): Promise<Result<HttpResponse, HttpError>>;

	delete(
		url: Url,
		httpOptions?: HttpOptions
	): Promise<Result<HttpResponse, HttpError>>;

	get(
		url: Url,
		httpOptions?: HttpOptions
	): Promise<Result<HttpResponse, HttpError>>;

	head(
		url: Url,
		httpOptions?: HttpOptions
	): Promise<Result<HttpResponse, HttpError>>;
}
