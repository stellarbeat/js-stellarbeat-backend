import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetLatestNodeSnapshots } from '../GetLatestNodeSnapshots';
import { NodeSnapShotRepository } from '../../../domain/node/NodeSnapShotRepository';

it('should capture and return errors', async function () {
	const repo = mock<NodeSnapShotRepository>();
	repo.findLatest.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetLatestNodeSnapshots(repo, exceptionLogger);
	const result = await useCase.execute({
		at: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});
