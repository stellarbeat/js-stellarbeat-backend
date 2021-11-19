import { Message } from '../domain/Message';
import { UserId } from '../../network-event-notifications/domain/subscription/UserId';
import { err, ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
import { IUserService } from '../domain/IUserService';
import { HttpService } from './HttpService';
import { CustomError } from '../errors/CustomError';
import { isObject, isString } from '../utilities/TypeGuards';
import { Url } from '../domain/Url';

export class UserServiceError extends CustomError {
	constructor(message: string, name: string, cause?: Error) {
		if (
			isObject(cause) &&
			isObject(cause.response) &&
			isObject(cause.response.data) &&
			isObject(cause.response.data.errors)
		) {
			message += `: ${JSON.stringify(cause.response.data.errors)}`;
		}

		super(message, name, cause);
	}
}

export class UserServiceFindOrCreateError extends UserServiceError {
	constructor(cause?: Error) {
		super(
			'Error finding or creating user',
			UserServiceFindOrCreateError.name,
			cause
		);
	}
}

export class UserServiceDeleteError extends UserServiceError {
	constructor(cause?: Error) {
		super('Error deleting user', UserServiceDeleteError.name, cause);
	}
}

export class UserServiceSendError extends UserServiceError {
	constructor(cause?: Error) {
		super('Error sending message to user', UserServiceSendError.name, cause);
	}
}

export interface AddressedMessage {
	to: UserId;
	message: Message;
}

export interface FailedSend {
	addressedMessage: AddressedMessage;
	cause: Error;
}

@injectable()
export class UserService implements IUserService {
	protected userResourceUrl: Url;

	constructor(
		protected baseUrl: string,
		protected username: string,
		protected password: string,
		@inject('HttpService') protected httpService: HttpService
	) {
		if (this.baseUrl.endsWith('/')) {
			this.baseUrl = this.baseUrl.slice(0, -1);
		}

		const userResourceUrlResult = Url.create(this.baseUrl + '/user');
		if (userResourceUrlResult.isErr()) throw userResourceUrlResult.error;

		this.userResourceUrl = userResourceUrlResult.value;
	}

	async findOrCreateUser(
		emailAddress: string
	): Promise<Result<UserId, UserServiceFindOrCreateError>> {
		const response = await this.httpService.post(
			this.userResourceUrl,
			{ emailAddress: emailAddress },
			{
				username: this.username,
				password: this.password
			},
			5000
		);

		if (response.isErr()) {
			return err(new UserServiceFindOrCreateError(response.error));
		}

		if (isObject(response.value.data) && isString(response.value.data.userId)) {
			const userIdResult = UserId.create(response.value.data.userId);
			if (userIdResult.isErr()) {
				return err(new UserServiceFindOrCreateError(userIdResult.error));
			}

			return ok(userIdResult.value);
		}
		return err(
			new UserServiceFindOrCreateError(
				new Error('Invalid data returned from service')
			)
		);
	}

	async deleteUser(userId: UserId): Promise<Result<void, Error>> {
		const response = await this.httpService.delete(
			this.userResourceUrl,
			{
				username: this.username,
				password: this.password
			},
			5000
		);

		if (response.isErr()) {
			return err(new UserServiceDeleteError(response.error));
		}

		return ok(undefined);
	}

	async send(userId: UserId, message: Message): Promise<Result<void, Error>> {
		const specificUserResourceUrlResult = Url.create(
			this.userResourceUrl.value + '/' + userId.value + '/message'
		);
		if (specificUserResourceUrlResult.isErr())
			return err(new UserServiceSendError(specificUserResourceUrlResult.error));

		const response = await this.httpService.post(
			specificUserResourceUrlResult.value,
			{
				title: message.title,
				body: message.body
			},
			{
				username: this.username,
				password: this.password
			},
			5000
		);

		if (response.isErr()) {
			return err(new UserServiceSendError(response.error));
		}

		return ok(undefined);
	}
}
