import { injectable } from 'inversify';
import { Url } from '../../domain/Url';
import { err, ok, Result } from 'neverthrow';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { isObject, isString } from '../../utilities/TypeGuards';
import {
	HttpError,
	HttpOptions,
	HttpResponse,
	HttpService
} from '../../services/HttpService';
import * as http from 'http';
import * as https from 'https';

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 500 }); //todo move to options
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 500 });

@injectable()
export class AxiosHttpService implements HttpService {
	constructor(protected userAgent: string) {
		this.userAgent = userAgent;
	}

	async delete(
		url: Url,
		httpOptions: HttpOptions
	): Promise<Result<HttpResponse, HttpError>> {
		return await this.performRequest(url, httpOptions, axios.delete);
	}

	async post(
		url: Url,
		data: Record<string, unknown>,
		httpOptions: HttpOptions
	): Promise<Result<HttpResponse, HttpError>> {
		return await this.performRequest(url, httpOptions, axios.post, data);
	}

	async head(
		url: Url,
		httpOptions: HttpOptions
	): Promise<Result<HttpResponse, HttpError>> {
		return await this.performRequest(url, httpOptions, axios.head);
	}

	async get(
		url: Url,
		httpOptions: HttpOptions
	): Promise<Result<HttpResponse, Error>> {
		return await this.performRequest(url, httpOptions, axios.get);
	}

	protected mapHttpOptionsToAxiosRequestConfig(
		httpOptions?: HttpOptions
	): AxiosRequestConfig {
		if (!httpOptions) return {};

		const timeoutMs = httpOptions.timeoutMs ? httpOptions.timeoutMs : 2000;
		const headers = { 'User-Agent': this.userAgent }; //could be expanded
		const auth = httpOptions.auth;
		const responseType = httpOptions.responseType
			? httpOptions.responseType
			: 'json';
		const maxContentLength = httpOptions.maxContentLength;

		const config: AxiosRequestConfig = {
			timeout: timeoutMs,
			headers: headers,
			auth: auth,
			responseType: responseType,
			maxContentLength: maxContentLength
		};

		if (httpOptions.keepalive === true) {
			config.httpAgent = httpAgent;
			config.httpsAgent = httpsAgent;
		}

		return config;
	}

	private async performRequest(
		url: Url,
		httpOptions: HttpOptions,
		operation: <T = unknown, R = AxiosResponse<T, unknown>, D = unknown>(
			url: string,
			data?: D,
			config?: AxiosRequestConfig<D> | undefined
		) => Promise<R>,
		data?: unknown
	): Promise<Result<HttpResponse, HttpError>> {
		let timeout: NodeJS.Timeout | undefined;
		const timeoutMs =
			httpOptions && httpOptions.timeoutMs ? httpOptions.timeoutMs : 2000;
		try {
			const source = axios.CancelToken.source();
			timeout = setTimeout(() => {
				source.cancel('Connection time-out');
				// Timeout Logic
			}, timeoutMs + 50);

			const requestConfig =
				this.mapHttpOptionsToAxiosRequestConfig(httpOptions);
			requestConfig.cancelToken = source.token;

			let axiosResponse: AxiosResponse;
			if (data) axiosResponse = await operation(url.value, data, requestConfig);
			else axiosResponse = await operation(url.value, requestConfig);

			clearTimeout(timeout);
			return ok(this.mapAxiosResponseToHttpResponse(axiosResponse));
		} catch (error) {
			if (timeout) clearTimeout(timeout);
			return err(this.mapErrorToHttpError(error, url));
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

	protected mapErrorToHttpError(error: unknown, url: Url): HttpError {
		if (axios.isAxiosError(error)) {
			return new HttpError(error.message, error.code, error.response);
		}
		if (error instanceof Error) return new HttpError(error.message);
		if (isObject(error) && isString(error.message))
			return new HttpError(error.message, 'TIMEOUT'); //this is our Cancel timeout
		return new HttpError('Error getting url: ' + url.value, 'UNKNOWN');
	}
}
