import { Url } from '../domain/Url';
import { Result } from 'neverthrow';

export function isHttpError(payload: unknown): payload is HttpError {
	return payload instanceof HttpError;
}

export type HttpResponse<T = unknown> = {
	data: T;
	status: number;
	statusText: string;
	headers: unknown;
};

export class HttpError<T = unknown> extends Error {
	code?: string;
	response?: HttpResponse<T>;
	constructor(message?: string, code?: string, response?: HttpResponse<T>) {
		super(message);
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
	timeoutMs?: number;
	maxContentLength?: number;
	responseType?: 'arraybuffer' | 'json';
	keepalive?: boolean;
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
