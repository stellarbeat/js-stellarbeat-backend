import axios from 'axios';

it('should create subscription', async function () {
	try {
		const result = await axios.post('http://localhost:3000/v1/subscription', {
			emailAddress: 'pj@pj.com',
			eventSourceIds: [{}]
		});
		console.log(result.data);
	} catch (e: unknown) {
		if (axios.isAxiosError(e)) console.log(e.response?.data);
	}
});
