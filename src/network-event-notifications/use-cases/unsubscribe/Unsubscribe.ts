import { inject, injectable } from 'inversify';
import { SubscriberRepository } from '../../domain/subscription/SubscriberRepository';
import { UnsubscribeDTO } from './UnsubscribeDTO';
import { SubscriberReference } from '../../domain/subscription/SubscriberReference';
import { err, ok, Result } from 'neverthrow';
import { IUserService } from '../../../shared/domain/IUserService';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { SubscriberNotFoundError } from './UnsubscribeError';

@injectable()
export class Unsubscribe {
	constructor(
		@inject('SubscriberRepository')
		protected SubscriberRepository: SubscriberRepository,
		@inject('UserService') protected userService: IUserService,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger
	) {}

	async execute(dto: UnsubscribeDTO): Promise<Result<void, Error>> {
		const subscriberReferenceResult = SubscriberReference.createFromValue(
			dto.subscriberReference
		);
		if (subscriberReferenceResult.isErr())
			return err(subscriberReferenceResult.error);

		const subscriber =
			await this.SubscriberRepository.findOneBySubscriberReference(
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
			this.exceptionLogger.captureException(deleteUserResult.error);
			return err(deleteUserResult.error);
		}

		await this.SubscriberRepository.remove(subscriber);

		return ok(undefined);
	}
}
