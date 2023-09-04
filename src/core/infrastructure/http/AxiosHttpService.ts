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

@injectable()
export class AxiosHttpService implements HttpService {
	constructor(protected userAgent: string) {
		this.userAgent = userAgent;
	}

	async delete(
		url: Url,
		httpOptions?: HttpOptions
	): Promise<Result<HttpResponse, HttpError>> {
		return await this.performRequest(url, axios.delete, httpOptions);
	}

	async post(
		url: Url,
		data: Record<string, unknown>,
		httpOptions?: HttpOptions
	): Promise<Result<HttpResponse, HttpError>> {
		return await this.performRequest(url, axios.post, httpOptions, data);
	}

	async head(
		url: Url,
		httpOptions?: HttpOptions
	): Promise<Result<HttpResponse, HttpError>> {
		return await this.performRequest(url, axios.head, httpOptions);
	}

	async get(
		url: Url,
		httpOptions?: HttpOptions
	): Promise<Result<HttpResponse, HttpError>> {
		return await this.performRequest(url, axios.get, httpOptions);
	}

	protected mapHttpOptionsToAxiosRequestConfig(
		httpOptions?: HttpOptions
	): AxiosRequestConfig {
		if (!httpOptions) return {};

		const timeoutMs = httpOptions.socketTimeoutMs
			? httpOptions.socketTimeoutMs
			: 2000;
		const headers = { 'User-Agent': this.userAgent }; //could be expanded
		const auth = httpOptions.auth;
		const responseType = httpOptions.responseType
			? httpOptions.responseType
			: 'json';
		const maxContentLength = httpOptions.maxContentLength;

		return {
			timeout: timeoutMs,
			headers: headers,
			auth: auth,
			responseType: responseType,
			maxContentLength: maxContentLength,
			httpsAgent: httpOptions.httpsAgent,
			httpAgent: httpOptions.httpAgent,
			signal: httpOptions.abortSignal
		};
	}

	private async performRequest(
		url: Url,
		operation:
			| (<T = any, R = AxiosResponse<T, T>, D = any>(
					url: string,
					data?: D,
					config?: AxiosRequestConfig<D> | undefined
			  ) => Promise<R>)
			| (<T = any, R = AxiosResponse<T, T>, D = any>(
					url: string,
					config?: AxiosRequestConfig<D> | undefined
			  ) => Promise<R>),
		httpOptions?: HttpOptions,
		data?: unknown
	): Promise<Result<HttpResponse, HttpError>> {
		let connectionTimeout: NodeJS.Timeout | undefined;
		let connectionTimeoutMs: number;
		const socketTimeoutMs =
			httpOptions && httpOptions.socketTimeoutMs
				? httpOptions.socketTimeoutMs
				: 2000;

		if (httpOptions && httpOptions.connectionTimeoutMs) {
			connectionTimeoutMs = httpOptions.connectionTimeoutMs;
		} else {
			connectionTimeoutMs = socketTimeoutMs; //BC, should be removed in the future;
		}

		try {
			const source = axios.CancelToken.source();
			if (connectionTimeoutMs > 0) {
				connectionTimeout = setTimeout(() => {
					source.cancel('SB Connection time-out');
					// Timeout Logic
				}, connectionTimeoutMs);
			}
			const requestConfig =
				this.mapHttpOptionsToAxiosRequestConfig(httpOptions);
			requestConfig.cancelToken = source.token;

			let axiosResponse: AxiosResponse;
			if (data) axiosResponse = await operation(url.value, data, requestConfig);
			else axiosResponse = await operation(url.value, requestConfig);

			if (connectionTimeout) clearTimeout(connectionTimeout);
			return ok(this.mapAxiosResponseToHttpResponse(axiosResponse));
		} catch (error) {
			if (connectionTimeout) clearTimeout(connectionTimeout);
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
			return new HttpError(error.message, 'SB_CONN_TIMEOUT'); //this is our Cancel timeout
		return new HttpError('Error getting url: ' + url.value, 'UNKNOWN');
	}
}
