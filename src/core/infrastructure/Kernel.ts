import 'reflect-metadata';
import { Container, decorate, injectable } from 'inversify';
import { Connection, createConnection, Repository } from 'typeorm';
import { Config, getConfigFromEnv } from '../config/Config';
import { load as loadHistory } from '../../history-scan/infrastructure/di/container';
import { load as loadNetworkScan } from '../../network-scan/infrastructure/di/container';
import { load as loadNetworkEventNotifications } from '../../notifications/infrastructure/di/container';
import { load as loadCore } from '../infrastructure/di/container';

export default class Kernel {
	private static instance?: Kernel;
	protected _container?: Container;
	public config!: Config;

	private constructor() {
		try {
			decorate(injectable(), Connection);
			decorate(injectable(), Repository);
			// eslint-disable-next-line no-empty
		} catch (e) {}
		//a second getInstance cannot redecorate the above classes
	}

	static async getInstance(config?: Config) {
		if (!Kernel.instance) {
			if (!config) {
				const configResult = getConfigFromEnv();
				if (configResult.isErr()) {
					throw configResult.error;
				}

				config = configResult.value;
			}
			Kernel.instance = new Kernel();
			Kernel.instance.config = config;
			await Kernel.instance.initializeContainer(config);
		}

		return Kernel.instance;
	}

	async close() {
		await this.container.get(Connection).close();
		Kernel.instance = undefined;
	}

	private async initializeContainer(config: Config): Promise<void> {
		this._container = new Container();
		let connectionName: string | undefined = undefined;
		if (config.nodeEnv === 'test') connectionName = 'test';

		await this.loadDatabase(config, connectionName);
		loadCore(this.container, connectionName, config);
		loadNetworkScan(this.container, connectionName, config);
		if (config.enableNotifications) {
			loadNetworkEventNotifications(this.container, connectionName, config);
		}
		loadHistory(this.container, connectionName, config);
	}

	get container(): Container {
		if (this._container === undefined)
			throw new Error('Kernel not initialized');

		return this._container;
	}

	async shutdown() {
		const connection = this.container.get(Connection);
		await connection.close();
	}

	async loadDatabase(config: Config, connectionName: string | undefined) {
		let connection: Connection;
		if (connectionName) {
			connection = await createConnection(connectionName);
		} else connection = await createConnection();

		this.container
			.bind<Connection>(Connection)
			.toDynamicValue(() => {
				return connection;
			})
			.inRequestScope();
	}
}
