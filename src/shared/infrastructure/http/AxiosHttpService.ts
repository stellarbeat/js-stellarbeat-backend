import { injectable } from 'inversify';
import { Url } from '../../domain/Url';
import { err, ok, Result } from 'neverthrow';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { isObject, isString } from '../../utilities/TypeGuards';
import {
	HttpError,
	HttpResponse,
	HttpService
} from '../../services/HttpService';
import * as http from 'http';
import * as https from 'https';

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 500 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 500 });

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
				headers: { 'User-Agent': this.userAgent },
				httpAgent: httpAgent,
				httpsAgent: httpsAgent
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
			if (isObject(error) && isString(error.message))
				return err(new Error(error.message)); //this is our Cancel timeout
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
				responseType: responseType,
				httpAgent: httpAgent,
				httpsAgent: httpsAgent
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
			if (isObject(error) && isString(error.message))
				return err(new Error(error.message)); //this is our Cancel timeout
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
