import io from 'socket.io-client';

const SOCKET_URL = 'http://192.168.43.211:3001';
export const API_URL = 'http://192.168.43.211:3001';

export const socket = io(SOCKET_URL, {
  transports: ['websocket'],
});