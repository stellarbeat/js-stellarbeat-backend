import { ErrorToTomlStateMapper } from '../ErrorToTomlStateMapper';
import { TomlParseError } from '../../../network/scan/TomlService';
import { TomlState } from '../TomlState';
import {
	HttpError,
	HttpResponse
} from '../../../../../core/services/HttpService';

describe('ErrorToTomlStateMapper', () => {
	it('should map TomlParseError to ParsingError', () => {
		const error = new TomlParseError(new Error('test'));
		expect(ErrorToTomlStateMapper.map(error)).toBe(TomlState.ParsingError);
	});

	it('should map generic error to UnspecifiedError', function () {
		const error = new Error('test');
		expect(ErrorToTomlStateMapper.map(error as TomlParseError)).toBe(
			TomlState.UnspecifiedError
		);
	});

	describe('HttpError', function () {
		it('should map code ECONNABORTED', function () {
			const error = new HttpError('test', 'ECONNABORTED');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.ConnectionTimeout
			);
		});

		it('should map code ENOTFOUND', function () {
			const error = new HttpError('test', 'ENOTFOUND');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.HostnameResolutionFailed
			);
		});

		it('should map code ETIMEDOUT', function () {
			const error = new HttpError('test', 'ETIMEDOUT');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.SocketTimeout
			);
		});

		it('should map code ECONNREFUSED', function () {
			const error = new HttpError('test', 'ECONNREFUSED');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.ConnectionRefused
			);
		});

		it('should map code ECONNRESET', function () {
			const error = new HttpError('test', 'ECONNRESET');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.ConnectionResetByPeer
			);
		});

		it('should map code EPIPE', function () {
			const error = new HttpError('test', 'EPIPE');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.SocketClosedPrematurely
			);
		});

		it('should map code ECONNREFUSED', function () {
			const error = new HttpError('test', 'ECONNREFUSED');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.ConnectionRefused
			);
		});

		it('should map code EHOSTUNREACH', function () {
			const error = new HttpError('test', 'EHOSTUNREACH');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.HostUnreachable
			);
		});

		it('should map code EAI_AGAIN', function () {
			const error = new HttpError('test', 'EAI_AGAIN');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.DNSLookupFailed
			);
		});

		it('should map code SB_CONN_TIMEOUT', function () {
			const error = new HttpError('test', 'SB_CONN_TIMEOUT');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.RequestTimeout
			);
		});

		it('should map other codes', function () {
			const error = new HttpError('test', 'OTHER');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.UnspecifiedError
			);
		});

		it('should map no code and no response to unspecified', function () {
			const error = new HttpError('test');
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.UnspecifiedError
			);
		});

		it('should map 404 to NotFound', function () {
			const error = new HttpError('test', undefined, {
				status: 404
			} as HttpResponse);
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.NotFound
			);
		});

		it('should map 403 to Forbidden', function () {
			const error = new HttpError('test', undefined, {
				status: 403
			} as HttpResponse);
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.Forbidden
			);
		});

		it('should map 401 to Forbidden', function () {
			const error = new HttpError('test', undefined, {
				status: 401
			} as HttpResponse);
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.Forbidden
			);
		});

		it('should map 500 to ServerError', function () {
			const error = new HttpError('test', undefined, {
				status: 500
			} as HttpResponse);
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.ServerError
			);
		});

		it('should map 503 to ServerError', function () {
			const error = new HttpError('test', undefined, {
				status: 503
			} as HttpResponse);
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.ServerError
			);
		});

		it('should map 502 to ServerError', function () {
			const error = new HttpError('test', undefined, {
				status: 502
			} as HttpResponse);
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.ServerError
			);
		});

		it('should map other status codes to UnspecifiedError', function () {
			const error = new HttpError('test', undefined, {
				status: 400
			} as HttpResponse);
			expect(ErrorToTomlStateMapper.map(error as HttpError)).toBe(
				TomlState.UnspecifiedError
			);
		});
	});
});
