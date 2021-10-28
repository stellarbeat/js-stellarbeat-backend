export interface Mailer {
	send(body: string, title: string, contactId: string): Promise<void>;
}
