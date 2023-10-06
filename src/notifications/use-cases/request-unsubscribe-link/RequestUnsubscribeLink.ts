import {
	EventSourceIdDTO,
	RequestUnsubscribeLinkDTO
} from './RequestUnsubscribeLinkDTO';
import { err, ok, Result } from 'neverthrow';
import { SubscriberRepository } from '../../domain/subscription/SubscriberRepository';
import { inject, injectable } from 'inversify';
import { IUserService } from '../../../core/domain/IUserService';
import { mapUnknownToError } from '../../../core/utilities/mapUnknownToError';
import { TYPES } from '../../infrastructure/di/di-types';
import { MessageCreator } from '../../domain/notifier/MessageCreator';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { Logger } from '../../../core/services/PinoLogger';
import 'reflect-metadata';

export interface FailedSubscription {
	eventSourceId: EventSourceIdDTO;
	error: Error;
}

@injectable()
export class RequestUnsubscribeLink {
	constructor(
		@inject(TYPES.MessageCreator) private messageCreator: MessageCreator,
		@inject('SubscriberRepository')
		private subscriberRepository: SubscriberRepository,
		@inject('UserService') private userService: IUserService,
		@inject('ExceptionLogger') private exceptionLogger: ExceptionLogger,
		@inject('Logger') private logger: Logger
	) {}

	async execute(dto: RequestUnsubscribeLinkDTO): Promise<Result<void, Error>> {
		try {
			const userIdResult = await this.userService.findUser(dto.emailAddress);
			if (userIdResult.isErr()) return err(userIdResult.error);

			if (userIdResult.value === null) {
				this.logger.info(
					'Unsubscribe link requested for unknown email address'
				);
				return ok(undefined);
			}

			const subscriber = await this.subscriberRepository.findOneByUserId(
				userIdResult.value
			);

			if (subscriber === null) {
				this.exceptionLogger.captureException(
					new Error(
						`User with id ${userIdResult.value.value} not found in subscriber repository`
					)
				);
				return ok(undefined);
			}

			const message = await this.messageCreator.createUnsubscribeMessage(
				subscriber.subscriberReference,
				dto.time
			);

			const result = await this.userService.send(userIdResult.value, message);
			if (result.isErr()) {
				this.exceptionLogger.captureException(result.error);
				return err(result.error);
			}

			return ok(undefined);
		} catch (e) {
			this.exceptionLogger.captureException(mapUnknownToError(e));
			return err(mapUnknownToError(e));
		}
	}
}
