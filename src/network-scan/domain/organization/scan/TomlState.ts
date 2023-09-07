export enum TomlState {
	Unknown,
	Ok,
	RequestTimeout,
	DNSLookupFailed,
	HostnameResolutionFailed,
	ConnectionTimeout,
	ConnectionRefused,
	ConnectionResetByPeer,
	SocketClosedPrematurely,
	SocketTimeout,
	HostUnreachable,
	NotFound,
	ParsingError,
	Forbidden,
	ServerError,
	UnsupportedVersion
}
