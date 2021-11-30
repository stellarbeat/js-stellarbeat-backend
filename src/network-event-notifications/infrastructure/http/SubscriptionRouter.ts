import * as express from 'express';
import { body, param, validationResult } from 'express-validator';
import Kernel from '../../../shared/core/Kernel';
import { ConfirmSubscription } from '../../use-cases/confirm-subscription/ConfirmSubscription';
import { Subscribe } from '../../use-cases/subscribe/Subscribe';
import { UnmuteNotification } from '../../use-cases/unmute-notification/UnmuteNotification';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
import { NoPendingSubscriptionFound } from '../../use-cases/confirm-subscription/ConfirmSubscriptionError';
import { Unsubscribe } from '../../use-cases/unsubscribe/Unsubscribe';
import { SubscriberNotFoundError } from '../../use-cases/unsubscribe/UnsubscribeError';
import { Throttler } from '../../../shared/infrastructure/http/Throttler';
const subscriptionRouter = express.Router();

const subscriptionThrottler = new Throttler(5, 1000 * 60);

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

		subscriptionThrottler.processRequest(req.ip, new Date());
		if (subscriptionThrottler.throttled(req.ip))
			return res.status(429).json({ msg: 'Too many requests' });

		const kernel = await Kernel.getInstance();
		const subscribe = kernel.container.get(Subscribe);
		const exceptionLogger =
			kernel.container.get<ExceptionLogger>('ExceptionLogger');
		const result = await subscribe.execute({
			time: new Date(),
			emailAddress: req.body.emailAddress,
			eventSourceIds: req.body.eventSourceIds
		});

		if (result.isOk()) {
			return res.status(200).json({ message: 'Success' });
		} else {
			exceptionLogger.captureException(result.error);
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

		const kernel = await Kernel.getInstance();
		const exceptionLogger =
			kernel.container.get<ExceptionLogger>('ExceptionLogger');
		const confirmSubscription = kernel.container.get(ConfirmSubscription);
		const result = await confirmSubscription.execute({
			pendingSubscriptionId: req.params.pendingSubscriptionId
		});

		if (result.isOk()) {
			return res.status(200).json({ message: 'Success' });
		} else {
			if (result.error instanceof NoPendingSubscriptionFound)
				return res.status(404).json({ message: 'Not found' });

			exceptionLogger.captureException(result.error);
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

		const kernel = await Kernel.getInstance();
		const exceptionLogger =
			kernel.container.get<ExceptionLogger>('ExceptionLogger');
		const unmuteNotification = kernel.container.get(UnmuteNotification);
		const result = await unmuteNotification.execute({
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
			exceptionLogger.captureException(result.error);
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

		const kernel = await Kernel.getInstance();
		const exceptionLogger =
			kernel.container.get<ExceptionLogger>('ExceptionLogger');
		const unsubscribe = kernel.container.get(Unsubscribe);
		const result = await unsubscribe.execute({
			subscriberReference: req.params.subscriberRef
		});

		if (result.isOk()) {
			return res.status(200).json({ message: 'Success' });
		} else {
			if (result.error instanceof SubscriberNotFoundError)
				return res.status(404).json({ msg: 'Subscriber not found' });
			else {
				exceptionLogger.captureException(result.error);
				return res.status(500).json({ error: 'something went wrong' });
			}
		}
	}
);

export { subscriptionRouter };
