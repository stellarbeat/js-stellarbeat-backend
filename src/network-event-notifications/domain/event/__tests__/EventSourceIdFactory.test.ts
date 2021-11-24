import { EventSourceIdFactory } from '../EventSourceIdFactory';
import { EventSourceService } from '../EventSourceService';
import { Result, ok } from 'neverthrow';
import { EventSourceId, PublicKey } from '../EventSourceId';

it('should create PublicKey', async function () {
	jest.mock('../EventSourceService', () => {
		return jest.fn().mockImplementation(() => {
			return { isEventSourceIdKnown: jest.fn().mockResolvedValue(true) };
		});
	});
	const eventSourceService: EventSourceService = {
		isEventSourceIdKnown(
			eventSourceId: EventSourceId,
			time: Date
		): Promise<Result<boolean, Error>> {
			return Promise.resolve(ok(true));
		}
	} as EventSourceService;
	const factory = new EventSourceIdFactory(eventSourceService);

	const publicKeyResult = await factory.create(
		'node',
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB',
		new Date()
	);
	expect(publicKeyResult.isErr()).toBeFalsy();
	if (publicKeyResult.isErr()) return;
	expect(publicKeyResult.value).toBeInstanceOf(PublicKey);
	expect(publicKeyResult.value.value).toEqual(
		'GCFXHS4GXL6BVUCXBWXGTITROWLVYXQKQLF4YH5O5JT3YZXCYPAFBJZB'
	);
});
