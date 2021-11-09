import { ok, Result } from 'neverthrow';
import { Mailer } from '../../../shared/domain/Mailer';
import { ContactNotification } from '../contact/Contact';
import { ContactNotificationToMailMapper } from './ContactNotificationToMailMapper';
import { queue } from 'async';
import { inject, injectable } from 'inversify';

export interface NotificationFailure {
	contactNotification: ContactNotification;
	cause: Error;
}
export interface NotifyContactsResult {
	successfulNotifications: ContactNotification[];
	failedNotifications: NotificationFailure[];
}

@injectable()
export class EmailNotifier {
	constructor(@inject('Mailer') protected mailer: Mailer) {}

	async sendContactNotifications(
		contactNotifications: ContactNotification[]
	): Promise<NotifyContactsResult> {
		const successFullNotifications: ContactNotification[] = [];
		const failedNotifications: NotificationFailure[] = [];
		const q = queue(
			async (contactNotification: ContactNotification, callback) => {
				const result = await this.sendSingleNotification(contactNotification);
				if (result.isErr())
					failedNotifications.push({
						contactNotification: contactNotification,
						cause: result.error
					});
				else successFullNotifications.push(contactNotification);
				callback();
			},
			10
		);

		contactNotifications.forEach((contactNotification) => {
			q.push(contactNotification);
		});

		await q.drain();

		return {
			successfulNotifications: successFullNotifications,
			failedNotifications: failedNotifications
		};
	}

	protected async sendSingleNotification(
		contactNotification: ContactNotification
	): Promise<Result<void, Error>> {
		const mail = ContactNotificationToMailMapper.map(contactNotification);
		const result = await this.mailer.send(
			mail.body,
			mail.title,
			contactNotification.contact.contactId
		);
		/*if (result.isErr())
			return new CustomError(
				`Notification of contact with id ${contact.contactId} failed.`,
				'ContactMailNotificationError',
				result.error
			); */
		return ok(undefined);
	}
}
