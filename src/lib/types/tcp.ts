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

export interface TcpReceivedMessage {
	message: string;
	timestamp: string;
	client_addr: string;
}

export interface TcpReceiveResult {
	success: boolean;
	messages: TcpReceivedMessage[];
	error?: string;
}

export interface TcpServerConfig {
	host: string;
	port: number;
}

export interface TcpConnection {
	id: string;
	host: string;
	port: number;
	connected: boolean;
	connectedAt: string;
}

export interface TcpConnectionResult {
	success: boolean;
	connection?: TcpConnection;
	error?: string;
}

export interface TcpConnectionRequest {
	host: string;
	port: number;
}

export interface TcpMessageOnConnection {
	connection_id: string;
	message: string;
}
