import { MessageCreator } from '../MessageCreator';
import { createDummyPendingSubscriptionId } from '../../domain/subscription/__fixtures__/PendingSubscriptionId.fixtures';

it('should create confirm subscription message', async function () {
	const messageCreator = new MessageCreator('https://stellarbeat.io');
	const rawId = '76f18672-2fca-486e-a508-f0c2119c0798';
	const message = await messageCreator.createConfirmSubscriptionMessage(
		createDummyPendingSubscriptionId(rawId)
	);
	expect(message.title).toEqual('Confirm your Stellarbeat.io subscription');
	expect(message.body).toEqual(
		'<h3><a href="https://stellarbeat.io/76f18672-2fca-486e-a508-f0c2119c0798/confirm">Click here to confirm your subscription</a></h3>'
	);
});
