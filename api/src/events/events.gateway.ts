import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(private jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      const payload = await this.jwt.verifyAsync(token);
      client.join(`campus:${payload.campusId}`);
    } catch {
      client.disconnect(true);
    }
  }

  emitToCampus(campusId: string, event: string, data: unknown) {
    this.server.to(`campus:${campusId}`).emit(event, data);
  }
}