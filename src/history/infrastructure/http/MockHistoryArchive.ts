import { Server } from 'net';
import * as express from 'express';

export class MockHistoryArchive {
	private server?: Server;
	private api = express();

	async listen(port = 3000) {
		return new Promise<void>((resolve, reject) => {
			this.api.get(
				'/.well-known/stellar-history.json',
				async (req: express.Request, res: express.Response) => {
					const has = JSON.stringify({
						version: 1,
						server:
							'stellar-core 18.3.0 (2f9ce11b2e7eba7d7d38b123ee6da9e0144249f8)',
						currentLedger: 200,
						networkPassphrase: 'Test SDF Network ; September 2015',
						currentBuckets: [
							{
								curr: '3cb6cd408d76ddee1f1c47b6c04184f256449f30130021c33db24a77a534c5eb',
								next: {
									state: 0
								},
								snap: 'ca1b62a33d8ea05710328e4c8e6ee95980cf41d3304474f2af5550b49497420e'
							}
						]
					});
					res.send(has);
				}
			);
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
