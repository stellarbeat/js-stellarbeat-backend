import * as express from 'express';
import { body, param, validationResult } from 'express-validator';
import { ConfirmSubscription } from '../../use-cases/confirm-subscription/ConfirmSubscription';
import { Subscribe } from '../../use-cases/subscribe/Subscribe';
import { UnmuteNotification } from '../../use-cases/unmute-notification/UnmuteNotification';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { NoPendingSubscriptionFound } from '../../use-cases/confirm-subscription/ConfirmSubscriptionError';
import { Unsubscribe } from '../../use-cases/unsubscribe/Unsubscribe';
import { SubscriberNotFoundError } from '../../use-cases/unsubscribe/UnsubscribeError';
import { Throttler } from '../../../core/infrastructure/http/Throttler';
import { Router } from 'express';
import { RequestUnsubscribeLink } from '../../use-cases/request-unsubscribe-link/RequestUnsubscribeLink';

const subscriptionThrottler = new Throttler(5, 1000 * 60);

export interface SubscriptionRouterConfig {
	subscribe: Subscribe;
	exceptionLogger: ExceptionLogger;
	confirmSubscription: ConfirmSubscription;
	unmuteNotification: UnmuteNotification;
	unsubscribe: Unsubscribe;
	requestUnsubscribeLink: RequestUnsubscribeLink;
}

const subscriptionRouterWrapper = (
	config: SubscriptionRouterConfig
): Router => {
	const subscriptionRouter = express.Router();

	//create new subscription
	subscriptionRouter.post(
		'/',
		[
			body('emailAddress').isEmail().normalizeEmail(),
			body('eventSourceIds').isArray({ min: 1 })
		],
		async function (req: express.Request, res: express.Response) {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			if (req.ip) {
				subscriptionThrottler.processRequest(req.ip, new Date());
				if (subscriptionThrottler.throttled(req.ip))
					return res.status(429).json({ msg: 'Too many requests' });
			}

			const result = await config.subscribe.execute({
				time: new Date(),
				emailAddress: req.body.emailAddress,
				eventSourceIds: req.body.eventSourceIds
			});

			if (result.isOk()) {
				return res.status(200).json({ message: 'Success' });
			} else {
				config.exceptionLogger.captureException(result.error);
				return res.status(500).json({ error: 'something went wrong' });
			}
		}
	);

	subscriptionRouter.post(
		'/request-unsubscribe',
		[body('emailAddress').isEmail().normalizeEmail()],
		async function (req: express.Request, res: express.Response) {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			if (req.ip) {
				subscriptionThrottler.processRequest(req.ip, new Date());
				if (subscriptionThrottler.throttled(req.ip))
					return res.status(429).json({ msg: 'Too many requests' });
			}

			const result = await config.requestUnsubscribeLink.execute({
				time: new Date(),
				emailAddress: req.body.emailAddress
			});

			if (result.isOk()) {
				return res.status(200).json({ message: 'Success' });
			} else {
				config.exceptionLogger.captureException(result.error);
				return res.status(500).json({ error: 'something went wrong' });
			}
		}
	);

	subscriptionRouter.post(
		'/:pendingSubscriptionId/confirm',
		[param('pendingSubscriptionId').isUUID('4')],
		async function (req: express.Request, res: express.Response) {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const result = await config.confirmSubscription.execute({
				pendingSubscriptionId: req.params.pendingSubscriptionId
			});

			if (result.isOk()) {
				return res.status(200).json({ message: 'Success' });
			} else {
				if (result.error instanceof NoPendingSubscriptionFound)
					return res.status(404).json({ message: 'Not found' });

				config.exceptionLogger.captureException(result.error);
				return res.status(500).json({ error: 'something went wrong' });
			}
		}
	);

	/**
	 eventSourceType: 'node' | 'organization' | 'network';
	 eventSourceId: string;
	 eventType: string;
	 */
	subscriptionRouter.post(
		'/:subscriberRef/unmute',
		[
			param('subscriberRef').isUUID('4'),
			body('eventSourceId').isString().notEmpty(),
			body('eventType').isString().notEmpty(),
			body('eventSourceType').isIn(['node', 'organization', 'network'])
		],
		async function (req: express.Request, res: express.Response) {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const result = await config.unmuteNotification.execute({
				subscriberReference: req.params.subscriberRef,
				eventType: req.body.eventType as string,
				eventSourceId: req.body.eventSourceId as string,
				eventSourceType: req.body.eventSourceType as
					| 'node'
					| 'organization'
					| 'network'
			});

			if (result.isOk()) {
				return res.status(200).json({ message: 'Success' });
			} else {
				config.exceptionLogger.captureException(result.error);
				return res.status(500).json({ error: 'something went wrong' });
			}
		}
	);

	/**
	 eventSourceType: 'node' | 'organization' | 'network';
	 eventSourceId: string;
	 eventType: string;
	 */
	subscriptionRouter.delete(
		'/:subscriberRef',
		[param('subscriberRef').isUUID('4')],
		async function (req: express.Request, res: express.Response) {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const result = await config.unsubscribe.execute({
				subscriberReference: req.params.subscriberRef
			});

			if (result.isOk()) {
				return res.status(200).json({ message: 'Success' });
			} else {
				if (result.error instanceof SubscriberNotFoundError)
					return res.status(404).json({ msg: 'Subscriber not found' });
				else {
					config.exceptionLogger.captureException(result.error);
					return res.status(500).json({ error: 'something went wrong' });
				}
			}
		}
	);

	return subscriptionRouter;
};

export { subscriptionRouterWrapper as subscriptionRouter };
