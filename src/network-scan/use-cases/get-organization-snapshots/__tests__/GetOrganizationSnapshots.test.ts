import { mock } from 'jest-mock-extended';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { GetOrganizationSnapshots } from '../GetOrganizationSnapshots';
import { ExceptionLoggerMock } from '../../../../core/services/__mocks__/ExceptionLoggerMock';
import { createDummyOrganizationIdString } from '../../../domain/organization/__fixtures__/createDummyOrganizationId';
import { OrganizationSnapShotRepository } from '../../../domain/organization/OrganizationSnapShotRepository';

it('should capture and return errors', async function () {
	const repo = mock<OrganizationSnapShotRepository>();
	repo.findLatestByOrganizationId.mockRejectedValue(new Error('test'));
	const exceptionLogger = mock<ExceptionLogger>();
	const useCase = new GetOrganizationSnapshots(repo, exceptionLogger);
	const result = await useCase.execute({
		at: new Date(),
		organizationId: createDummyOrganizationIdString()
	});
	expect(result.isErr()).toBe(true);
	expect(exceptionLogger.captureException).toBeCalledTimes(1);
});

it('should fetch latest snapshots', async () => {
	const repo = mock<OrganizationSnapShotRepository>();
	repo.findLatestByOrganizationId.mockResolvedValue([]);

	const useCase = new GetOrganizationSnapshots(repo, new ExceptionLoggerMock());
	const result = await useCase.execute({
		at: new Date(),
		organizationId: createDummyOrganizationIdString()
	});
	expect(result.isOk()).toBe(true);
	if (!result.isOk()) return;
});
