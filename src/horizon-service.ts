import {HorizonError} from "./errors/horizon-error";
import axios from 'axios';
import {Node} from '@stellarbeat/js-stellar-domain';
import Timeout = NodeJS.Timeout;

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
        let timeout:Timeout;
        try {
            let source = axios.CancelToken.source();
            timeout = setTimeout(() => {
                source.cancel('Connection time-out');
                // Timeout Logic
            }, 2050);
            let response = await axios.get(url,
                {
                    cancelToken: source.token,
                    timeout: 2000,
                    headers: { 'User-Agent': 'stellarbeat.io' }
                });
            clearTimeout(timeout);
            return response.data;
        } catch (e) {
            clearTimeout(timeout!);
            throw new HorizonError(e.message);
        }
    }
}