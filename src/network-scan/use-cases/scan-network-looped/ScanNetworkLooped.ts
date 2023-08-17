import { inject, injectable } from 'inversify';
import { Logger } from '../../../core/services/PinoLogger';
import { ScanNetworkLoopedDTO } from './ScanNetworkLoopedDTO';
import { ScanNetwork } from '../scan-network/ScanNetwork';
import { ExceptionLogger } from '../../../core/services/ExceptionLogger';
import { asyncSleep } from '../../../core/utilities/asyncSleep';
import { LoopTimer } from '../../../core/services/LoopTimer';
import { err, ok, Result } from 'neverthrow';

@injectable()
export class ScanNetworkLooped {
	private aborted = false;

	constructor(
		private scanNetworkUseCase: ScanNetwork,
		private loopTimer: LoopTimer,
		@inject('ExceptionLogger') protected exceptionLogger: ExceptionLogger,
		@inject('Logger') protected logger: Logger
	) {}

	async execute(
		dto: ScanNetworkLoopedDTO,
		tick?: () => void
	): Promise<Result<void, Error>> {
		let firstRun = true;
		let error: Error | undefined;

		while (!this.aborted) {
			const result = await this.scanNetwork(firstRun, dto);
			if (result.isErr()) {
				this.exceptionLogger.captureException(result.error);
				this.aborted = true;
				error = result.error;
			}
			if (tick) tick();
			firstRun = false;
		}

		if (error) return err(error);
		return ok(undefined);
	}

	private async scanNetwork(
		firstRun: boolean,
		dto: ScanNetworkLoopedDTO
	): Promise<Result<void, Error>> {
		this.loopTimer.start(dto.loopIntervalMs);
		const result = await this.scanNetworkUseCase.execute({
			updateNetwork: firstRun,
			dryRun: dto.dryRun
		});
		this.loopTimer.stop();
		if (result.isErr()) {
			return err(result.error);
		}

		this.logger.info(
			'Scan network took ' + this.loopTimer.getElapsedTime() + 'ms'
		);

		if (this.loopTimer.loopExceededMaxTime()) {
			this.exceptionLogger.captureException(
				new Error('Network update exceeding expected run time')
			);
		}

		if (this.loopTimer.getRemainingTime() > 0) {
			await asyncSleep(this.loopTimer.getRemainingTime());
		}

		return ok(undefined);
	}

	public shutDown(callback: () => void) {
		this.aborted = true;
		this.scanNetworkUseCase.shutDown(callback);
	}
}
