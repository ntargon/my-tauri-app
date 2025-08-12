export interface TcpMessage {
	host: string;
	port: number;
	message: string;
}

export interface TcpSendResult {
	success: boolean;
	message: string;
	error?: string;
}

export interface TcpConnectionInfo {
	host: string;
	port: number;
	connected: boolean;
	lastSent?: string;
	lastError?: string;
}
