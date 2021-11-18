import * as express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Kernel from '../../../shared/core/Kernel';
import { ConfirmSubscription } from '../../use-cases/confirm-subscription/ConfirmSubscription';
import { Subscribe } from '../../use-cases/subscribe/Subscribe';
import { UnmuteNotification } from '../../use-cases/unmute-notification/UnmuteNotification';
import { ExceptionLogger } from '../../../shared/services/ExceptionLogger';
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
			return res.status(200);
		} else {
			exceptionLogger.captureException(result.error);
			return res.status(500);
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
			return res.status(200);
		} else {
			exceptionLogger.captureException(result.error);
			return res.status(500);
		}
	}
);

/**
 eventSourceType: 'node' | 'organization' | 'network';
 eventSourceId: string;
 eventType: string;
 */
subscriptionRouter.get(
	'/:subscriberRef/unmute',
	[
		param('subscriberRef').isUUID('4'),
		query('eventSourceId').isString().notEmpty(),
		query('eventType').isString().notEmpty(),
		query('eventSourceType').isIn(['node', 'organization', 'network'])
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
			eventType: req.query.eventType as string,
			eventSourceId: req.query.eventSourceId as string,
			eventSourceType: req.query.eventSourceType as
				| 'node'
				| 'organization'
				| 'network'
		});

		if (result.isOk()) {
			return res.status(200);
		} else {
			exceptionLogger.captureException(result.error);
			return res.status(500);
		}
	}
);

export { subscriptionRouter };
