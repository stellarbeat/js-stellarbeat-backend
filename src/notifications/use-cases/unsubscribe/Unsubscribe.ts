import { inject, injectable } from 'inversify';
import { SubscriberRepository } from '../../domain/subscription/SubscriberRepository';
import { UnsubscribeDTO } from './UnsubscribeDTO';
import { SubscriberReference } from '../../domain/subscription/SubscriberReference';
import { err, ok, Result } from 'neverthrow';
import { IUserService } from '../../../core/domain/IUserService';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { PersistenceError, SubscriberNotFoundError } from './UnsubscribeError';
import { UserNotFoundError } from '../../../core/services/UserService';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';

@injectable()
export class Unsubscribe {
	constructor(
		@inject('SubscriberRepository')
		protected subscriberRepository: SubscriberRepository,
		@inject('UserService') protected userService: IUserService,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}

	async execute(dto: UnsubscribeDTO): Promise<Result<void, Error>> {
		try {
			const subscriberReferenceResult = SubscriberReference.createFromValue(
				dto.subscriberReference
			);
			if (subscriberReferenceResult.isErr())
				return err(subscriberReferenceResult.error);

			const subscriber =
				await this.subscriberRepository.findOneBySubscriberReference(
					subscriberReferenceResult.value
				);
			if (subscriber === null)
				return err(
					new SubscriberNotFoundError(subscriberReferenceResult.value.value)
				);

			const deleteUserResult = await this.userService.deleteUser(
				subscriber.userId
			);

			if (deleteUserResult.isErr()) {
				if (deleteUserResult.error instanceof UserNotFoundError) {
					this.exceptionLogger.captureException(deleteUserResult.error, {
						msg: 'User not found in user service, but subscription id still present in db'
					});
				} else return err(deleteUserResult.error);
			}

			await this.subscriberRepository.remove(subscriber);

			return ok(undefined);
		} catch (e) {
			return err(new PersistenceError(mapUnknownToError(e)));
		}
	}
}
