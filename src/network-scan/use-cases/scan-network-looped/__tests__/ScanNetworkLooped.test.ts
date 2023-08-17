import * as asyncSleep from '../../../../core/utilities/asyncSleep';
import { ScanNetworkLooped } from '../ScanNetworkLooped';
import { mock } from 'jest-mock-extended';
import { ScanNetwork } from '../../scan-network/ScanNetwork';
import { LoopTimer } from '../../../../core/services/LoopTimer';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { Logger } from '../../../../core/services/PinoLogger';
import { err, ok } from 'neverthrow';

describe('ScanNetworkLooped', () => {
	it('should loop network scans and only request to update the network config the first time', function (done) {
		const { scanNetwork, useCase, loopTimer } = setupSUT();

		let executeCount = 0;
		const expectedExecuteCount = 2;
		useCase.execute(
			{
				loopIntervalMs: 10,
				dryRun: true
			},
			() => {
				executeCount++;
				if (executeCount === expectedExecuteCount)
					useCase.shutDown(() => {
						expect(scanNetwork.execute).toBeCalledTimes(expectedExecuteCount);
						expect(loopTimer.start).toBeCalledTimes(expectedExecuteCount);
						expect(loopTimer.stop).toBeCalledTimes(expectedExecuteCount);
						expect(scanNetwork.execute).toBeCalledWith({
							updateNetwork: true,
							dryRun: true
						});
						expect(scanNetwork.execute).toHaveBeenLastCalledWith({
							updateNetwork: false,
							dryRun: true
						});
						done();
					});
			}
		);
	});

	it('should capture exception when network update exceeds expected run time', function () {
		const SUT = setupSUT();
		SUT.loopTimer.loopExceededMaxTime.mockReturnValue(true);
		SUT.useCase.execute(
			{
				loopIntervalMs: 10,
				dryRun: true
			},
			() => {
				SUT.useCase.shutDown(() => {
					expect(SUT.exceptionLogger.captureException).toBeCalledWith(
						new Error('Network update exceeding expected run time')
					);
				});
			}
		);
	});

	it('should return error when network scan fails', async function () {
		const SUT = setupSUT();
		SUT.scanNetwork.execute.mockResolvedValue(err(new Error()));
		const result = await SUT.useCase.execute({
			loopIntervalMs: 10,
			dryRun: true
		});

		expect(result.isErr()).toBe(true);
	});

	it('should sleep when network update is less then expected run time', async function () {
		const spy = jest.spyOn(asyncSleep, 'asyncSleep').mockReturnThis();
		const SUT = setupSUT();
		SUT.loopTimer.loopExceededMaxTime.mockReturnValue(false);
		SUT.loopTimer.getRemainingTime.mockReturnValue(100);

		SUT.useCase.execute(
			{
				loopIntervalMs: 10,
				dryRun: true
			},
			() => {
				SUT.useCase.shutDown(() => {
					expect(spy).toBeCalledWith(100);
				});
			}
		);
	});

	function setupSUT() {
		const scanNetwork = mock<ScanNetwork>();
		scanNetwork.execute.mockResolvedValue(ok(undefined));
		scanNetwork.shutDown.mockImplementation((callback) => callback());
		const loopTimer = mock<LoopTimer>();
		const exceptionLogger = mock<ExceptionLogger>();
		const useCase = new ScanNetworkLooped(
			scanNetwork,
			loopTimer,
			exceptionLogger,
			mock<Logger>()
		);
		return { scanNetwork, useCase, loopTimer, exceptionLogger };
	}
});
