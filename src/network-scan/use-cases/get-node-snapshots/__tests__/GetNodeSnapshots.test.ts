import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetNodeSnapshots } from '../GetNodeSnapshots';
import { ExceptionLoggerMock } from '../../../../core/services/__mocks__/ExceptionLoggerMock';
import { createDummyPublicKeyString } from '../../../domain/node/__fixtures__/createDummyPublicKey';
import { NodeSnapShotRepository } from '../../../domain/node/NodeSnapShotRepository';

it('should capture and return errors', async function () {
	const repo = mock<NodeSnapShotRepository>();
	repo.findLatest.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetNodeSnapshots(repo, exceptionLogger);
	const result = await useCase.execute({
		at: new Date(),
		publicKey: createDummyPublicKeyString()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});

it('should fetch latest node snapshots', async () => {
	const repo = mock<NodeSnapShotRepository>();
	repo.findLatestByPublicKey.mockResolvedValue([]);

	const useCase = new GetNodeSnapshots(repo, new ExceptionLoggerMock());
	const result = await useCase.execute({
		at: new Date(),
		publicKey: createDummyPublicKeyString()
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
});
