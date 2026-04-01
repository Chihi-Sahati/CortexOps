import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';

export type SocketServer = Server;

let io: Server | null = null;

export function initSocketServer(httpServer: HTTPServer): Server {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join-workflow', (workflowId: string) => {
      socket.join(`workflow:${workflowId}`);
      console.log(`Client ${socket.id} joined workflow:${workflowId}`);
    });

    socket.on('join-execution', (executionId: string) => {
      socket.join(`execution:${executionId}`);
      console.log(`Client ${socket.id} joined execution:${executionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitExecutionEvent(executionId: string, event: string, data: unknown) {
  if (!io) return;
  io.to(`execution:${executionId}`).emit(event, data);
}

export function emitWorkflowEvent(workflowId: string, event: string, data: unknown) {
  if (!io) return;
  io.to(`workflow:${workflowId}`).emit(event, data);
}
