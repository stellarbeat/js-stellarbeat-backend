import { EventNotifier } from '../EventNotifier';
import { Contact } from '../../domain/Contact';
import { Event, EventData } from '../../domain/Event';
import { ok, Result } from 'neverthrow';
import * as Sentry from '@sentry/node';
import { injectable } from 'inversify';

@injectable()
export class SentryEventNotifier implements EventNotifier {
	constructor(sentryDSN: string) {
		Sentry.init({
			dsn: sentryDSN
		});
	}

	async notify(
		contact: Contact,
		events: Event<EventData>[]
	): Promise<Result<void, Error>> {
		let message = '[';
		events.forEach((event) => {
			message += `${event.time} - ${event.source.type} - ${event.source.id} - ${event.type}, `;
		});
		message += ']';
		Sentry.captureMessage(
			`Contact ${contact.id} notified of events: ${message}`
		);

		return ok(undefined);
	}
}
