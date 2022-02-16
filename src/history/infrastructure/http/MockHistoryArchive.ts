import { Server } from 'net';
import * as express from 'express';

export class MockHistoryArchive {
	private server?: Server;
	private api = express();

	async listen(port = 3000) {
		return new Promise<void>((resolve, reject) => {
			this.api.head(
				'*',
				async (req: express.Request, res: express.Response) => {
					res.status(200).send('go');
				}
			);

			this.server = this.api.listen(port, () => resolve());
		});
	}

	async stop() {
		return new Promise<void>((resolve, reject) => {
			if (!this.server) return;
			this.server.close(async () => {
				resolve();
			});
		});
	}
}
