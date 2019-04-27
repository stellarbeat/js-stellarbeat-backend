import {HorizonError} from "./errors/horizon-error";
import axios from 'axios';
import {Node} from '@stellarbeat/js-stellar-domain';

export class HorizonService {

    protected _horizonUrl: string;

    constructor() {
        if (!process.env.HORIZON_URL) {
            throw new HorizonError('Horizon not configured');
        }

        this._horizonUrl = process.env.HORIZON_URL;
    }

    async fetchAccount(node: Node): Promise<object | undefined> {
        return this.fetch(this._horizonUrl + '/accounts/' + node.publicKey);
    }

    async fetchHorizonInfo(): Promise<object | undefined> {
        return this.fetch(this._horizonUrl);
    }

    protected async fetch(url: string): Promise<object | undefined> {
        try {
            let response = await axios.get(url,
                {
                    timeout: 2000
                });

            return response.data;
        } catch (e) {
            throw new HorizonError(e.message);
        }
    }
}