import { inject, injectable } from 'inversify';
import { ConfirmSubscriptionDTO } from './ConfirmSubscriptionDTO';
import { err, ok, Result } from 'neverthrow';
import { SubscriberRepository } from '../../domain/subscription/SubscriberRepository';
import { PendingSubscriptionId } from '../../domain/subscription/PendingSubscription';
import { NoPendingSubscriptionFound } from './ConfirmSubscriptionError';

@injectable()
export class ConfirmSubscription {
	constructor(
		@inject('SubscriberRepository')
		protected SubscriberRepository: SubscriberRepository
	) {}

	async execute(dto: ConfirmSubscriptionDTO): Promise<Result<void, Error>> {
		const pendingSubscriptionIdResult = PendingSubscriptionId.create(
			dto.pendingSubscriptionId
		);
		if (pendingSubscriptionIdResult.isErr())
			return err(pendingSubscriptionIdResult.error);

		const subscriber =
			await this.SubscriberRepository.findOneByPendingSubscriptionId(
				pendingSubscriptionIdResult.value
			);
		if (subscriber === null) return err(new NoPendingSubscriptionFound());

		const result = subscriber.confirmPendingSubscription(
			pendingSubscriptionIdResult.value
		);
		if (result.isErr()) return err(result.error);

		await this.SubscriberRepository.save([subscriber]);

		return ok(undefined);
	}
}
