import { Url } from '../domain/Url';
import axios, { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios';
import { err, ok, Result } from 'neverthrow';
import { injectable } from 'inversify';

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

export interface HttpService {
	post(
		url: Url,
		data: Record<string, unknown>,
		auth?: {
			username: string;
			password: string;
		},
		timeoutMs?: number
	): Promise<Result<HttpResponse, HttpError>>;

	delete(
		url: Url,
		auth?: {
			username: string;
			password: string;
		},
		timeoutMs?: number
	): Promise<Result<HttpResponse, HttpError>>;

	get(
		url: Url,
		maxContentLength?: number,
		responseType?: 'arraybuffer' | 'json',
		timeoutMs?: number
	): Promise<Result<HttpResponse, HttpError>>;

	head(url: Url, timeoutMs?: number): Promise<Result<HttpResponse, HttpError>>;
}

@injectable()
export class AxiosHttpService implements HttpService {
	constructor(protected userAgent: string) {
		this.userAgent = userAgent;
	}

	async delete(
		url: Url,
		auth?: { username: string; password: string },
		timeoutMs = 2000
	): Promise<Result<HttpResponse, HttpError>> {
		let timeout: NodeJS.Timeout | undefined;
		try {
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, timeoutMs + 50);

			const config: Record<string, unknown> = {
				cancelToken: source.token,
				timeout: timeoutMs,
				headers: { 'User-Agent': this.userAgent },
				auth: auth ? auth : undefined
			};

			const axiosResponse = await axios.delete(url.value, config);
			clearTimeout(timeout);
			return ok(this.mapAxiosResponseToHttpResponse(axiosResponse));
		} catch (error) {
			if (timeout) clearTimeout(timeout);
			if (axios.isAxiosError(error)) {
				return err(this.mapAxiosErrorToHttpError(error));
			}
			if (error instanceof Error)
				return err(new HttpError(error.message, '500'));
			return err(new HttpError('Error getting url: ' + url.value, '500'));
		}
	}

	async post(
		url: Url,
		data: Record<string, unknown>,
		auth?: {
			username: string;
			password: string;
		},
		timeoutMs = 2000
	): Promise<Result<HttpResponse, HttpError>> {
		let timeout: NodeJS.Timeout | undefined;
		try {
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, timeoutMs + 50);

			const config: Record<string, unknown> = {
				cancelToken: source.token,
				timeout: timeoutMs,
				headers: { 'User-Agent': this.userAgent },
				auth: auth ? auth : undefined
			};

			const axiosResponse = await axios.post(url.value, data, config);
			clearTimeout(timeout);
			return ok(this.mapAxiosResponseToHttpResponse(axiosResponse));
		} catch (error) {
			if (timeout) clearTimeout(timeout);
			if (axios.isAxiosError(error)) {
				return err(this.mapAxiosErrorToHttpError(error));
			}
			if (error instanceof Error)
				return err(new HttpError(error.message, '500'));
			return err(new HttpError('Error getting url: ' + url.value, '500'));
		}
	}

	async head(
		url: Url,
		timeoutMs = 2000
	): Promise<Result<HttpResponse, HttpError>> {
		let timeout: NodeJS.Timeout | undefined;
		try {
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, timeoutMs + 50);

			const config: AxiosRequestConfig = {
				cancelToken: source.token,
				timeout: timeoutMs,
				headers: { 'User-Agent': this.userAgent }
			};

			const axiosResponse = await axios.head(url.value, config);
			clearTimeout(timeout);
			return ok(this.mapAxiosResponseToHttpResponse(axiosResponse));
		} catch (error) {
			if (timeout) clearTimeout(timeout);
			if (axios.isAxiosError(error)) {
				return err(this.mapAxiosErrorToHttpError(error));
			}
			if (error instanceof Error) return err(error);
			return err(new Error('Error sending head request to: ' + url.value));
		}
	}

	async get(
		url: Url,
		maxContentLength?: number,
		responseType: 'arraybuffer' | 'json' = 'json',
		timeoutMs = 2000
	): Promise<Result<HttpResponse, Error>> {
		let timeout: NodeJS.Timeout | undefined;
		try {
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, timeoutMs + 50);

			const config: AxiosRequestConfig = {
				cancelToken: source.token,
				timeout: timeoutMs,
				headers: { 'User-Agent': this.userAgent },
				responseType: responseType
			};
			if (maxContentLength !== undefined)
				config['maxContentLength'] = maxContentLength;

			const axiosResponse = await axios.get(url.value, config);
			clearTimeout(timeout);
			return ok(this.mapAxiosResponseToHttpResponse(axiosResponse));
		} catch (error) {
			if (timeout) clearTimeout(timeout);
			if (axios.isAxiosError(error)) {
				return err(this.mapAxiosErrorToHttpError(error));
			}
			if (error instanceof Error) return err(error);
			return err(new Error('Error getting url: ' + url.value));
		}
	}

	protected mapAxiosResponseToHttpResponse(axiosResponse: AxiosResponse) {
		return {
			data: axiosResponse.data,
			status: axiosResponse.status,
			statusText: axiosResponse.statusText,
			headers: axiosResponse.headers
		};
	}
	protected mapAxiosErrorToHttpError(axiosError: AxiosError): HttpError {
		return new HttpError(
			axiosError.message,
			axiosError.code,
			axiosError.response
		);
	}
}
