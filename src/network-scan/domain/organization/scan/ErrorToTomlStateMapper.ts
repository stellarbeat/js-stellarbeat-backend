import { TomlParseError } from '../../network/scan/TomlService';
import { TomlState } from './TomlState';
import { HttpError } from '../../../../core/services/HttpService';

export class ErrorToTomlStateMapper {
	static map(error: TomlParseError | HttpError): TomlState {
		if (error instanceof TomlParseError) {
			return TomlState.ParsingError;
		}
		if (error instanceof HttpError) {
			return ErrorToTomlStateMapper.mapHttpError(error);
		}

		return TomlState.UnspecifiedError;
	}

	static mapHttpError(error: HttpError): TomlState {
		if (error.code)
			return ErrorToTomlStateMapper.mapHttpConnectionError(error.code);

		if (!error.response) return TomlState.UnspecifiedError;

		switch (error.response.status) {
			case 404:
				return TomlState.NotFound;
			case 403:
				return TomlState.Forbidden;
			case 401:
				return TomlState.Forbidden;
			case 500:
				return TomlState.ServerError;
			case 503:
				return TomlState.ServerError;
			case 502:
				return TomlState.ServerError;
			default:
				return TomlState.UnspecifiedError;
		}
	}

	static mapHttpConnectionError(code: string): TomlState {
		switch (code) {
			case 'ECONNABORTED':
				return TomlState.ConnectionTimeout;
			case 'ENOTFOUND':
				return TomlState.HostnameResolutionFailed;
			case 'ETIMEDOUT':
				return TomlState.SocketTimeout;
			case 'ECONNREFUSED':
				return TomlState.ConnectionRefused;
			case 'ECONNRESET':
				return TomlState.ConnectionResetByPeer;
			case 'EPIPE':
				return TomlState.SocketClosedPrematurely;
			case 'EHOSTUNREACH':
				return TomlState.HostUnreachable;
			case 'EAI_AGAIN':
				return TomlState.DNSLookupFailed;
			case 'SB_CONN_TIMEOUT':
				return TomlState.RequestTimeout;

			default:
				return TomlState.UnspecifiedError;
		}
	}
}
