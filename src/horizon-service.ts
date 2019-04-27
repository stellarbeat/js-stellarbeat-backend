import {HorizonError} from "./errors/horizon-error";
import axios from 'axios';
import {Node} from '@stellarbeat/js-stellar-domain';

export class HorizonService {

    constructor() {
        if (!process.env.HORIZON_URL) {
            throw new HorizonError('Horizon not configured');
        }
    }

    async fetchAccount(node:Node): Promise<object | undefined> {
        try {
            let response = await axios.get(process.env.HORIZON_URL + '/accounts/' + node.publicKey,
                {
                    timeout: 2000
                });
            return response.data;

        } catch (e) {
            throw new HorizonError(e.message);
        }
    }
}