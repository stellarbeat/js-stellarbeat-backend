import { Result } from 'neverthrow';
import { UserId } from '../../network-event-notifications/domain/subscription/UserId';
import { CustomError } from '../errors/CustomError';
import { Message } from './Message';

export class CreateUserError extends CustomError {
	constructor(cause?: Error) {
		super('Could not create user', 'CreateUserError', cause);
	}
}

export interface IUserService {
	send(message: Message, userId: UserId): Promise<Result<void, Error>>;

	findOrCreateUser(emailAddress: string): Promise<Result<UserId, Error>>;

	deleteUser(userId: UserId): Promise<Result<void, Error>>;
}
