import {HorizonError} from "./errors/horizon-error";
import axios from 'axios';
import {Node} from '@stellarbeat/js-stellar-domain';

export class HorizonService {

    protected _horizonUrl: string;
    protected _horizonInfoCache?: object;

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
        if(!this._horizonInfoCache) {
            this._horizonInfoCache = this.fetch(this._horizonUrl);
        }
        return this._horizonInfoCache;
    }

    protected async fetch(url: string): Promise<object | undefined> {
        try {
            let response = await axios.get(url,
                {
                    timeout: 2000,
                    headers: { 'User-Agent': 'stellarbeat.io' }
                });

            return response.data;
        } catch (e) {
            throw new HorizonError(e.message);
        }
    }
}