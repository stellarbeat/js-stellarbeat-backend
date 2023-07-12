import { mock } from 'jest-mock-extended';
import { createDummyPublicKeyString } from '../../../domain/node/__fixtures__/createDummyPublicKey';
import { ExceptionLogger } from '../../../../core/services/ExceptionLogger';
import { InvalidQuorumSetConfigError } from '../InvalidQuorumSetConfigError';
import { RepositoryError } from '../RepositoryError';
import { NetworkRepository } from '../../../domain/network/NetworkRepository';
import { UpdateNetwork } from '../UpdateNetwork';
import { Network } from '../../../domain/network/Network';
import { UpdateNetworkDTO } from '../UpdateNetworkDTO';
import { InvalidOverlayRangeError } from '../InvalidOverlayRangeError';
import { InvalidStellarCoreVersionError } from '../InvalidStellarCoreVersionError';
import { LoggerMock } from '../../../../core/services/__mocks__/LoggerMock';

describe('UpdateNetwork', function () {
	it('should create new configuration when none is present', async function () {
		const repo = mock<NetworkRepository>();
		const useCase = new UpdateNetwork(
			repo,
			new LoggerMock(),
			mock<ExceptionLogger>()
		);
		const dto = getDTO();
		const result = await useCase.execute(dto);
		expect(result.isOk()).toBeTruthy();
		expect(repo.save).toBeCalledTimes(1);
	});

	it('should update configuration when a change is found', async function () {
		const repo = mock<NetworkRepository>();
		const network = mock<Network>();
		repo.findActiveByNetworkId.mockResolvedValue(network);
		const useCase = new UpdateNetwork(
			repo,
			new LoggerMock(),
			mock<ExceptionLogger>()
		);
		const dto = getDTO();
		const result = await useCase.execute(dto);
		expect(result.isOk()).toBeTruthy();
		expect(network.updateMaxLedgerVersion).toBeCalledTimes(1);
		expect(network.updateName).toBeCalledTimes(1);
		expect(network.updateOverlayVersionRange).toBeCalledTimes(1);
		expect(network.updateQuorumSetConfiguration).toBeCalledTimes(1);
		expect(network.updateStellarCoreVersion).toBeCalledTimes(1);
	});

	it('should return error if QuorumSet is invalid', async function () {
		const useCase = new UpdateNetwork(
			mock<NetworkRepository>(),
			new LoggerMock(),
			mock<ExceptionLogger>()
		);
		const dto = getDTO();
		dto.networkQuorumSet = ['invalidPublicKey'];
		const result = await useCase.execute(dto);

		expect(result.isErr()).toBeTruthy();
		if (!result.isErr()) return;
		expect(result.error).toBeInstanceOf(InvalidQuorumSetConfigError);
	});

	it('should return error if fetching the network configuration fails', async function () {
		const repo = mock<NetworkRepository>();
		repo.findActiveByNetworkId.mockRejectedValue(new Error('Some error'));
		const useCase = new UpdateNetwork(
			repo,
			new LoggerMock(),
			mock<ExceptionLogger>()
		);
		const dto = getDTO();
		const result = await useCase.execute(dto);
		expect(result.isErr()).toBeTruthy();
		if (!result.isErr()) return;
		expect(result.error).toBeInstanceOf(RepositoryError);
	});

	it('should return error if persisting the network configuration fails', async function () {
		const repo = mock<NetworkRepository>();
		repo.findActiveByNetworkId.mockResolvedValue(null);
		repo.save.mockRejectedValue(new Error('Some error'));
		const useCase = new UpdateNetwork(
			repo,
			new LoggerMock(),
			mock<ExceptionLogger>()
		);
		const dto = getDTO();
		const result = await useCase.execute(dto);
		expect(result.isErr()).toBeTruthy();
		if (!result.isErr()) return;
		expect(result.error).toBeInstanceOf(RepositoryError);
	});

	it('should return error for invalid overlay version range', async function () {
		const useCase = new UpdateNetwork(
			mock<NetworkRepository>(),
			new LoggerMock(),
			mock<ExceptionLogger>()
		);
		const dto = getDTO();
		dto.overlayMinVersion = 10;
		dto.overlayVersion = 9;
		const result = await useCase.execute(dto);
		expect(result.isErr()).toBeTruthy();
		if (!result.isErr()) return;
		expect(result.error).toBeInstanceOf(InvalidOverlayRangeError);
	});

	it('should return error for invalid stellar version string', async function () {
		const useCase = new UpdateNetwork(
			mock<NetworkRepository>(),
			new LoggerMock(),
			mock<ExceptionLogger>()
		);
		const dto = getDTO();
		dto.stellarCoreVersion = 'invalidVersion';
		const result = await useCase.execute(dto);
		expect(result.isErr()).toBeTruthy();
		if (!result.isErr()) return;
		expect(result.error).toBeInstanceOf(InvalidStellarCoreVersionError);
	});

	function getDTO(): UpdateNetworkDTO {
		return {
			time: new Date(),
			name: 'Test network',
			networkId: 'test',
			networkQuorumSet: [createDummyPublicKeyString()],
			overlayVersion: 2,
			overlayMinVersion: 1,
			ledgerVersion: 1,
			stellarCoreVersion: '1.0.0',
			passphrase: 'passphrase'
		};
	}
});
