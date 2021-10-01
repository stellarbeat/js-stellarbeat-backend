import { Container, decorate, injectable } from 'inversify';
import { asyncBindings, bindings } from './container-bindings';
import { Connection, Repository } from 'typeorm';

export default class Kernel {
	protected _container?: Container;

	constructor() {
		decorate(injectable(), Repository);
		decorate(injectable(), Connection);
	}

	async initializeContainer(): Promise<void> {
		this._container = new Container();
		await this._container.loadAsync(asyncBindings);
		this._container.load(bindings);
	}

	get container(): Container {
		if (this._container === undefined)
			throw new Error('Kernel not initialized');

		return this._container;
	}
}
