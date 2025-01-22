import { useParams } from '@tanstack/react-router';
import { MutableRefObject, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { MediaType, SOCKET_EVENTS } from '@repo/mediasoup';
import {
  CreateProducerRes,
  AUDIO_PRODUCER_OPTIONS,
  VIDEO_PRODUCER_OPTIONS,
} from '@repo/mediasoup/client';

import type { Producer } from 'mediasoup-client/lib/Producer';
import type { MediaKind } from 'mediasoup-client/lib/RtpParameters';
import type { Transport } from 'mediasoup-client/lib/Transport';

interface Transports {
  sendTransport: Transport | null;
  recvTransport: Transport | null;
}

interface UseProducerProps {
  socketRef: MutableRefObject<Socket | null>;
  transportsRef: MutableRefObject<Transports>;
}

const useProducer = ({ socketRef, transportsRef }: UseProducerProps) => {
  const { ticleId: roomId } = useParams({ from: '/_authenticated/live/$ticleId' });

  const producersRef = useRef<{ [key in MediaType]: Producer | null }>({
    video: null,
    audio: null,
    screen: null,
  });

  const closeProducer = (type: MediaType) => {
    const socket = socketRef.current;
    const producer = producersRef.current[type];

    if (!socket || !producer) return;

    socket.emit(SOCKET_EVENTS.closeProducer, { producerId: producer.id, roomId });
    producer.close();
    producersRef.current[type] = null;
  };

  const pauseProducer = (type: MediaType) => {
    const socket = socketRef.current;
    const producer = producersRef.current[type];

    if (!socket || !producer) return;

    producer.pause();

    socket.emit(SOCKET_EVENTS.producerStatusChange, {
      producerId: producer.id,
      status: 'pause',
      roomId,
    });
  };

  const resumeProducer = (type: MediaType) => {
    const socket = socketRef.current;
    const producer = producersRef.current[type];

    if (!socket || !producer) return;

    producer.resume();

    socket.emit(SOCKET_EVENTS.producerStatusChange, {
      producerId: producer.id,
      status: 'resume',
      roomId,
    });
  };

  const createProducer = async (type: MediaType, track: MediaStreamTrack) => {
    const transport = transportsRef.current.sendTransport;
    if (!transport || !track) {
      return null;
    }

    const kind = track.kind as MediaKind;

    const producerOptions = kind === 'video' ? VIDEO_PRODUCER_OPTIONS : AUDIO_PRODUCER_OPTIONS;

    const producer = await transport.produce({
      track,
      appData: { mediaType: type },
      ...producerOptions,
    });

    producersRef.current[type] = producer;

    if (type !== 'screen') {
      pauseProducer(type);
    }

    return producer;
  };

  const connectExistProducer = async () => {
    const socket = socketRef.current;

    if (!socket) return [];

    const params = { roomId };

    return new Promise<CreateProducerRes[]>((resolve) => {
      socket.emit(SOCKET_EVENTS.getProducers, params, (result: CreateProducerRes[]) => {
        const producers = producersRef.current;

        const producerIds = Object.values(producers)
          .map((producer) => producer?.id)
          .filter(Boolean);

        const filteredResult = result.filter(({ producerId }) => !producerIds.includes(producerId));

        resolve(filteredResult);
      });
    });
  };

  return {
    producersRef,
    createProducer,
    closeProducer,
    pauseProducer,
    resumeProducer,
    connectExistProducer,
  };
};

export default useProducer;
