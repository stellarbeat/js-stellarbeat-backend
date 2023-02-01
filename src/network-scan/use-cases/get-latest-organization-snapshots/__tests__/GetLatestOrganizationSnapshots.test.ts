import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetLatestOrganizationSnapshots } from '../GetLatestOrganizationSnapshots';
import { OrganizationSnapShotRepository } from '../../../domain/organization/OrganizationSnapShotRepository';

it('should capture and return errors', async function () {
	const repo = mock<OrganizationSnapShotRepository>();
	repo.findLatest.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetLatestOrganizationSnapshots(repo, exceptionLogger);
	const result = await useCase.execute({
		at: new Date()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});
