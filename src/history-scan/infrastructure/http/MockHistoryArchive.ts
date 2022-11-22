import { Server } from 'net';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

export class MockHistoryArchive {
	private server?: Server;
	private api = express();

	async listen(port = 3000) {
		return new Promise<void>((resolve, reject) => {
			this.api.get(
				'*.json',
				async (req: express.Request, res: express.Response) => {
					const file = path.join(
						__dirname,
						'/__fixtures__/',
						path.basename(req.path)
					);
					const content = fs.readFileSync(file, { encoding: 'utf8' });
					res.send(content);
				}
			);
			this.api.get(
				'*.xdr.gz',
				async (req: express.Request, res: express.Response) => {
					const file = path.join(
						__dirname,
						'/__fixtures__/',
						path.basename(req.path)
					);
					fs.createReadStream(file).pipe(res);
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
