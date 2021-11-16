import { Message } from '../domain/Message';
import { UserId } from '../../network-event-notifications/domain/subscription/UserId';
import { err, ok, Result } from 'neverthrow';
import { injectable } from 'inversify';
import { IUserService } from '../domain/IUserService';

@injectable()
export class UserService implements IUserService {
	send(message: Message, contactId: UserId): Promise<Result<void, Error>> {
		console.log(contactId);
		console.log(message.title);
		console.log(message.body);
		return Promise.resolve(ok(undefined));
	}

	findOrCreateUser(email: string): Promise<Result<UserId, Error>> {
		return Promise.resolve(err(new Error('not yet implemented')));
	}

	deleteUser(userId: UserId): Promise<Result<void, Error>> {
		console.log('Deleting user with id', userId.value);
		return Promise.resolve(ok(undefined));
	}
}
