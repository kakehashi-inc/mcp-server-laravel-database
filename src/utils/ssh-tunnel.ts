import { Client, ConnectConfig } from 'ssh2';
import { createServer, Server as NetServer } from 'net';
import { readFileSync } from 'fs';
import { SSHConfig } from '../types/index.js';

export interface TunnelConfig {
    localHost: string;
    localPort: number;
    remoteHost: string;
    remotePort: number;
}

export class SSHTunnel {
    private sshClient: Client;
    private server: NetServer | null = null;
    private config: SSHConfig;
    private tunnelConfig: TunnelConfig;
    private connections: Set<any> = new Set();

    constructor(sshConfig: SSHConfig, tunnelConfig: TunnelConfig) {
        this.sshClient = new Client();
        this.config = sshConfig;
        this.tunnelConfig = tunnelConfig;
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            const connectConfig: ConnectConfig = {
                host: this.config.host,
                port: this.config.port,
                username: this.config.username,
            };

            if (this.config.password) {
                connectConfig.password = this.config.password;
            }

            if (this.config.privateKey) {
                try {
                    const key = readFileSync(this.config.privateKey, 'utf-8');
                    connectConfig.privateKey = key;

                    if (this.config.passphrase) {
                        connectConfig.passphrase = this.config.passphrase;
                    }
                } catch (error) {
                    reject(new Error(`Failed to read SSH private key: ${error}`));
                    return;
                }
            }

            this.sshClient
                .on('ready', () => {
                    this.createTunnel()
                        .then(() => resolve())
                        .catch(reject);
                })
                .on('error', err => {
                    reject(new Error(`SSH connection error: ${err.message}`));
                })
                .connect(connectConfig);
        });
    }

    private async createTunnel(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = createServer(clientSocket => {
                this.connections.add(clientSocket);

                this.sshClient.forwardOut(
                    this.tunnelConfig.localHost,
                    this.tunnelConfig.localPort,
                    this.tunnelConfig.remoteHost,
                    this.tunnelConfig.remotePort,
                    (err, stream) => {
                        if (err) {
                            clientSocket.end();
                            this.connections.delete(clientSocket);
                            return;
                        }

                        clientSocket.pipe(stream).pipe(clientSocket);

                        clientSocket.on('close', () => {
                            stream.end();
                            this.connections.delete(clientSocket);
                        });

                        stream.on('close', () => {
                            clientSocket.end();
                        });
                    }
                );
            });

            this.server.listen(this.tunnelConfig.localPort, this.tunnelConfig.localHost, () => {
                resolve();
            });

            this.server.on('error', err => {
                reject(new Error(`Tunnel server error: ${err.message}`));
            });
        });
    }

    async close(): Promise<void> {
        // Close all active connections
        for (const conn of this.connections) {
            conn.destroy();
        }
        this.connections.clear();

        // Close the server
        if (this.server) {
            await new Promise<void>(resolve => {
                this.server!.close(() => resolve());
            });
            this.server = null;
        }

        // Close SSH connection
        this.sshClient.end();
    }

    getLocalPort(): number {
        return this.tunnelConfig.localPort;
    }

    getLocalHost(): string {
        return this.tunnelConfig.localHost;
    }
}

export async function createSSHTunnel(
    sshConfig: SSHConfig,
    remoteHost: string,
    remotePort: number
): Promise<SSHTunnel> {
    const tunnelConfig: TunnelConfig = {
        localHost: '127.0.0.1',
        localPort: 0, // Let OS assign a free port
        remoteHost,
        remotePort,
    };

    const tunnel = new SSHTunnel(sshConfig, tunnelConfig);
    await tunnel.connect();
    return tunnel;
}
