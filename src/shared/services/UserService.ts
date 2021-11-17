import { Message } from '../domain/Message';
import { UserId } from '../../network-event-notifications/domain/subscription/UserId';
import { err, ok, Result } from 'neverthrow';
import { inject, injectable } from 'inversify';
import { IUserService } from '../domain/IUserService';
import { HttpService } from './HttpService';
import { CustomError } from '../errors/CustomError';
import { isObject, isString } from '../utilities/TypeGuards';
import { Url } from '../domain/Url';

export class UserServiceFindOrCreateError extends CustomError {
	constructor(cause?: Error) {
		super(
			'Error finding or creating user',
			UserServiceFindOrCreateError.name,
			cause
		);
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
		console.log(this.baseUrl);
		if (this.baseUrl.endsWith('/')) {
			this.baseUrl = this.baseUrl.slice(0, -1);
		}
		console.log(this.baseUrl);

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
			}
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
		const response = await this.httpService.delete(this.userResourceUrl, {
			username: this.username,
			password: this.password
		});

		if (response.isErr()) {
			return err(new UserServiceFindOrCreateError(response.error));
		}

		return ok(undefined);
	}

	async send(userId: UserId, message: Message): Promise<Result<void, Error>> {
		const specificUserResourceUrlResult = Url.create(
			this.userResourceUrl.value + '/' + userId.value
		);
		if (specificUserResourceUrlResult.isErr())
			return err(specificUserResourceUrlResult.error);

		const response = await this.httpService.post(
			specificUserResourceUrlResult.value,
			{
				title: message.title,
				message: message.body
			},
			{
				username: this.username,
				password: this.password
			}
		);

		if (response.isErr()) {
			return err(new UserServiceFindOrCreateError(response.error));
		}

		return ok(undefined);
	}
}
