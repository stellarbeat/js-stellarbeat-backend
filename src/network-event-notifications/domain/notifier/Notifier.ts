import { err, ok, Result } from 'neverthrow';
import { IUserService } from '../../../shared/domain/IUserService';
import { Notification } from '../subscription/Subscriber';
import { NotificationToMessageMapper } from './NotificationToMessageMapper';
import { queue } from 'async';
import { inject, injectable } from 'inversify';
import { Message } from '../../../shared/domain/Message';
import { CustomError } from '../../../shared/errors/CustomError';

export interface NotificationFailure {
	notification: Notification;
	cause: Error;
}
export interface NotifyResult {
	successfulNotifications: Notification[];
	failedNotifications: NotificationFailure[];
}

@injectable()
export class Notifier {
	constructor(@inject('UserService') protected userService: IUserService) {}

	async sendNotifications(
		notifications: Notification[]
	): Promise<NotifyResult> {
		const successFullNotifications: Notification[] = [];
		const failedNotifications: NotificationFailure[] = [];
		const q = queue(async (notification: Notification, callback) => {
			const result = await this.sendSingleNotification(notification);
			if (result.isErr())
				failedNotifications.push({
					notification: notification,
					cause: result.error
				});
			else successFullNotifications.push(notification);
			callback();
		}, 10);

		notifications.forEach((notification) => {
			q.push(notification);
		});

		await q.drain();

		return {
			successfulNotifications: successFullNotifications,
			failedNotifications: failedNotifications
		};
	}

	protected async sendSingleNotification(
		notification: Notification
	): Promise<Result<void, Error>> {
		const message = NotificationToMessageMapper.map(notification);
		const result = await this.userService.send(
			notification.subscriber.userId,
			new Message(message.body, message.title)
		);
		if (result.isErr())
			return err(
				new CustomError(
					`Notification of user with id ${notification.subscriber.userId} failed.`,
					'NotificationSendError',
					result.error
				)
			);
		return ok(undefined);
	}
}
