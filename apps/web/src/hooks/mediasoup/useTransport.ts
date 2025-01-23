import { useParams } from '@tanstack/react-router';
import { MutableRefObject, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { SOCKET_EVENTS, TRANSPORT_EVENTS } from '@repo/mediasoup';
import type { CreateTransportRes } from '@repo/mediasoup/client';

import type { Device } from 'mediasoup-client/lib/Device';
import type { Transport } from 'mediasoup-client/lib/Transport';

interface TransportRef {
  sendTransport: Transport | null;
  recvTransport: Transport | null;
}

const useTransport = (socketRef: MutableRefObject<Socket | null>) => {
  const { ticleId: roomId } = useParams({ from: '/_authenticated/live/$ticleId' });

  const transportsRef = useRef<TransportRef>({
    sendTransport: null,
    recvTransport: null,
  });

  const createSendTransport = async (device: Device) => {
    const socket = socketRef.current;

    if (!socket) return;

    return new Promise<void>((resolve) => {
      socket.emit(SOCKET_EVENTS.createTransport, { roomId }, async (result: CreateTransportRes) => {
        const { transportId, ...rest } = result;

        const transport = device.createSendTransport({ id: transportId, ...rest });

        transportsRef.current.sendTransport = transport;

        connectTransport(transport, transportId);
        produceTransport(transport, transportId);

        resolve();
      });
    });
  };

  const createRecvTransport = async (device: Device) => {
    const socket = socketRef.current;

    if (!socket) return;

    return new Promise<void>((resolve) => {
      socket.emit(SOCKET_EVENTS.createTransport, { roomId }, async (result: CreateTransportRes) => {
        const { transportId, ...rest } = result;

        const transport = device.createRecvTransport({ id: transportId, ...rest });

        transportsRef.current.recvTransport = transport;

        connectTransport(transport, transportId);

        resolve();
      });
    });
  };

  const connectTransport = async (transport: Transport, transportId: string) => {
    const socket = socketRef.current;

    if (!socket) return;

    transport.on(TRANSPORT_EVENTS.connect, ({ dtlsParameters }, callback) => {
      socket.emit(SOCKET_EVENTS.connectTransport, { dtlsParameters, transportId, roomId });
      callback();
    });
  };

  const produceTransport = async (transport: Transport, transportId: string) => {
    const socket = socketRef.current;

    if (!socket) return;

    transport.on(TRANSPORT_EVENTS.produce, ({ rtpParameters, kind, appData }, callback) => {
      const data = { rtpParameters, kind, transportId, roomId, appData };
      socket.emit(SOCKET_EVENTS.produce, data, ({ producerId }: { producerId: string }) => {
        callback({ id: producerId });
      });
    });
  };

  return {
    transportsRef,
    createSendTransport,
    createRecvTransport,
  };
};

export default useTransport;
