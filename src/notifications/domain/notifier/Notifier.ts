import { err, ok, Result } from 'neverthrow';
import { IUserService } from '../../../core/domain/IUserService';
import { queue } from 'async';
import { inject, injectable } from 'inversify';
import { CustomError } from '../../../core/errors/CustomError';
import { Notification } from '../subscription/Notification';
import { MessageCreator } from './MessageCreator';
import { TYPES } from '../../infrastructure/di/di-types';

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
	constructor(
		@inject('UserService') protected userService: IUserService,
		@inject(TYPES.MessageCreator) protected messageCreator: MessageCreator
	) {}

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
		const message = await this.messageCreator.createNotificationMessage(
			notification
		);
		const result = await this.userService.send(
			notification.subscriber.userId,
			message
		);
		if (result.isErr())
			return err(
				new CustomError(
					`Notification of user with id ${notification.subscriber.userId.value} failed.`,
					'NotificationSendError',
					result.error
				)
			);
		return ok(undefined);
	}
}
