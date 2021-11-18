import { injectable } from 'inversify';
import { PendingSubscriptionId } from '../domain/subscription/PendingSubscription';
import * as ejs from 'ejs';
import { Message } from '../../shared/domain/Message';
import 'reflect-metadata';

@injectable()
export class MessageCreator {
	constructor(protected frontendBaseUrl: string) {}

	async createConfirmSubscriptionMessage(
		pendingSubscriptionId: PendingSubscriptionId
	) {
		const body = await ejs.renderFile(
			__dirname + '/../templates/confirm-subscription-notification.ejs',
			{
				confirmUrl: `${this.frontendBaseUrl}/${pendingSubscriptionId.value}/confirm`
			}
		);

		return new Message(body, 'Confirm your Stellarbeat.io subscription');
	}
}
