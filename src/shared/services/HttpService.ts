import { Url } from '../domain/Url';
import axios, { AxiosError, AxiosResponse } from 'axios';
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
	get(
		url: Url,
		maxContentLength?: number
	): Promise<Result<HttpResponse, Error>>;
}

@injectable()
export class AxiosHttpService implements HttpService {
	constructor(protected userAgent: string) {
		this.userAgent = userAgent;
	}

	async get(
		url: Url,
		maxContentLength?: number
	): Promise<Result<HttpResponse, Error>> {
		let timeout: NodeJS.Timeout | undefined;
		try {
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, 2050);

			const config: Record<string, unknown> = {
				cancelToken: source.token,
				timeout: 2000,
				headers: { 'User-Agent': this.userAgent }
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
