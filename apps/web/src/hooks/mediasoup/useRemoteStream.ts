import { useParams } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { SOCKET_EVENTS } from '@repo/mediasoup';
import type {
  RemoteStream,
  CreateProducerRes,
  CreateConsumerRes,
  ResumeConsumersRes,
} from '@repo/mediasoup/client';

import { useMediasoupState } from '@/contexts/mediasoup/context';

const useRemoteStream = () => {
  const { ticleId } = useParams({ from: '/_authenticated/live/$ticleId' });
  const { socketRef, transportsRef, deviceRef } = useMediasoupState();

  const [videoStreams, setVideoStreams] = useState<RemoteStream[]>([]);
  const [audioStreams, setAudioStreams] = useState<RemoteStream[]>([]);

  const setRemoteStream = useCallback((remoteStream: RemoteStream) => {
    const getNewStreams = (prevStreams: RemoteStream[]) => {
      const newStreams = [...prevStreams];

      const remoteStreamIdx = prevStreams.findIndex(
        (stream) => stream.socketId === remoteStream.socketId && !stream.stream
      );

      if (remoteStreamIdx !== -1) {
        newStreams[remoteStreamIdx] = remoteStream;
      } else {
        newStreams.push(remoteStream);
      }

      return newStreams;
    };

    if (remoteStream.kind === 'video') {
      setVideoStreams(getNewStreams);
    }

    if (remoteStream.kind === 'audio') {
      setAudioStreams(getNewStreams);
    }
  }, []);

  const createRemoteStream = useCallback(
    async (data: CreateConsumerRes) => {
      const recvTransport = transportsRef.current.recvTransport;

      if (!recvTransport) {
        throw new Error('recvTransport is not initialized');
      }

      const { consumerId, peerId, nickname, ...rest } = data;

      const consumer = await recvTransport.consume({ id: consumerId, ...rest });

      const stream = new MediaStream([consumer.track]);

      if (data.paused) {
        consumer.pause();
      }

      const newStream = {
        stream,
        consumer,
        nickname,
        socketId: peerId,
        kind: consumer.kind,
        paused: consumer.paused,
      };

      setRemoteStream(newStream);

      return newStream;
    },
    [transportsRef, setRemoteStream]
  );

  const consume = useCallback(
    async (data: CreateProducerRes) => {
      const { peerId, producerId, kind, paused, nickname, appData } = data;

      const socket = socketRef.current;
      const device = deviceRef.current;
      const { recvTransport } = transportsRef.current;

      if (!device || !recvTransport || !socket) return;

      const params = {
        kind,
        paused,
        appData,
        nickname,
        producerId,
        roomId: ticleId,
        transportId: recvTransport.id,
        rtpCapabilities: device.rtpCapabilities,
      };

      return new Promise<void>((resolve) => {
        socket.emit(SOCKET_EVENTS.consume, params, async (params: CreateConsumerRes) => {
          await createRemoteStream({ ...params, peerId });
          resolve();
        });
      });
    },
    [socketRef, deviceRef, transportsRef, ticleId, createRemoteStream]
  );

  const createConsumers = useCallback(async () => {
    const socket = socketRef.current;
    const recvTransport = transportsRef.current.recvTransport;
    const device = deviceRef.current;

    if (!socket || !recvTransport || !device) {
      throw new Error('socket, recvTransport, device is not initialized');
    }

    const params = {
      roomId: ticleId,
      transportId: recvTransport.id,
      rtpCapabilities: device.rtpCapabilities,
    };

    return new Promise<RemoteStream[]>((resolve) => {
      socket.emit(SOCKET_EVENTS.createConsumers, params, async (result: CreateConsumerRes[]) => {
        if (!result || !result.length) return;

        const remoteStreams = await Promise.all(result.map(createRemoteStream));

        resolve(remoteStreams);
      });
    });
  }, [socketRef, transportsRef, deviceRef, ticleId, createRemoteStream]);

  const resumeRemoteStream = useCallback(
    (producerId: string) => {
      const socket = socketRef.current;

      if (!socket) {
        throw new Error('socket is not initialized');
      }

      const getNewStreams = (prevStreams: RemoteStream[]) => {
        const newStreams = [...prevStreams];
        const stream = newStreams.find((stream) => stream.consumer?.producerId === producerId);

        if (!stream || stream.consumer?.closed) {
          return prevStreams;
        }

        socket.emit(SOCKET_EVENTS.resumeConsumers, {
          roomId: ticleId,
          consumerIds: [stream.consumer?.id],
        });

        stream.consumer?.resume();
        stream.paused = false;

        return newStreams;
      };

      setVideoStreams(getNewStreams);
      setAudioStreams(getNewStreams);
    },
    [socketRef, ticleId]
  );

  const pauseStreamByConsumerId = useCallback((consumerId: string) => {
    return (prevStreams: RemoteStream[]) => {
      const newStreams = prevStreams.map((stream) => {
        if (stream.consumer?.id === consumerId) {
          stream.consumer.pause();
          stream.paused = true;
        }

        return stream;
      });

      return newStreams;
    };
  }, []);

  const resumeStreamByConsumerId = useCallback((consumerId: string) => {
    return (prevStreams: RemoteStream[]) => {
      const newStreams = prevStreams.map((stream) => {
        if (stream.consumer?.id === consumerId) {
          stream.consumer.resume();
          stream.paused = false;
        }

        return stream;
      });

      return newStreams;
    };
  }, []);

  const resumeAudioConsumers = useCallback(
    (consumers: RemoteStream[]) => {
      const socket = socketRef.current;

      if (!socket) {
        throw new Error('socket is not initialized');
      }
      if (!consumers.length) return;

      const consumerIds = consumers
        .filter((consumer) => consumer.kind === 'audio')
        .map((consumer) => consumer.consumer?.id);

      const params = { roomId: ticleId, consumerIds };

      socket.emit(SOCKET_EVENTS.resumeConsumers, params, (data: ResumeConsumersRes[]) => {
        data.forEach((item) => {
          if (item.paused) return;

          resumeRemoteStream(item.producerId);
        });
      });
    },
    [socketRef, ticleId, resumeRemoteStream]
  );

  const resumeVideoConsumers = useCallback(
    (consumers: RemoteStream[]) => {
      const socket = socketRef.current;

      if (!socket) {
        throw new Error('socket is not initialized');
      }

      if (!consumers.length) return;

      const consumerIds = consumers
        .filter((consumer) => consumer.kind === 'video')
        .map((consumer) => consumer.consumer?.id);

      const params = { roomId: ticleId, consumerIds };

      socket.emit(SOCKET_EVENTS.resumeConsumers, params, (data: ResumeConsumersRes[]) => {
        data.forEach(({ paused, consumerId }) => {
          if (paused) return;

          setVideoStreams(resumeStreamByConsumerId(consumerId));
        });
      });
    },
    [socketRef, ticleId, resumeStreamByConsumerId, setVideoStreams]
  );

  const pauseVideoConsumers = useCallback(
    (consumers: RemoteStream[]) => {
      const socket = socketRef.current;

      if (!socket) {
        throw new Error('socket is not initialized');
      }

      if (!consumers.length) return;

      const consumerIds = consumers
        .filter((consumer) => consumer.kind === 'video')
        .map((consumer) => consumer.consumer?.id);

      const params = { roomId: ticleId, consumerIds };

      socket.emit(SOCKET_EVENTS.pauseConsumers, params, (data: ResumeConsumersRes[]) => {
        data.forEach(({ consumerId }) => setVideoStreams(pauseStreamByConsumerId(consumerId)));
      });
    },
    [socketRef, ticleId, pauseStreamByConsumerId]
  );
  const filterRemoteStream = useCallback(
    (cb: (remoteStream: RemoteStream) => boolean) => {
      const getNewStreams = (prevStreams: RemoteStream[]) => {
        const result = prevStreams.filter(cb);

        const deletedStreams = prevStreams.filter((stream) => !cb(stream));

        deletedStreams.forEach((stream) => stream.consumer?.close());

        return result;
      };

      setVideoStreams(getNewStreams);
      setAudioStreams(getNewStreams);
    },
    [setVideoStreams, setAudioStreams]
  );

  const pauseRemoteStream = useCallback(
    (producerId: string) => {
      const socket = socketRef.current;

      if (!socket) {
        throw new Error('socket is not initialized');
      }

      const getNewStreams = (prevStreams: RemoteStream[]) => {
        const newStreams = [...prevStreams];
        const stream = newStreams.find((stream) => stream.consumer?.producerId === producerId);

        if (!stream || stream.consumer?.closed) {
          return prevStreams;
        }

        socket.emit(SOCKET_EVENTS.pauseConsumers, {
          roomId: ticleId,
          consumerIds: [stream.consumer?.id],
        });

        stream.consumer?.pause();
        stream.paused = true;

        return newStreams;
      };

      setVideoStreams(getNewStreams);
      setAudioStreams(getNewStreams);
    },
    [socketRef, ticleId, setVideoStreams, setAudioStreams]
  );

  const addInitialRemoteStream = useCallback(
    (initialStream: Pick<RemoteStream, 'nickname' | 'socketId'>) => {
      setVideoStreams((prevStreams) => [...prevStreams, { ...initialStream }]);
    },
    [setVideoStreams]
  );

  const clearRemoteStream = useCallback(() => {
    setVideoStreams((prevStreams) => {
      prevStreams.forEach((stream) => stream.consumer?.close());
      return [];
    });
    setAudioStreams((prevStreams) => {
      prevStreams.forEach((stream) => stream.consumer?.close());
      return [];
    });
  }, [setVideoStreams, setAudioStreams]);

  return {
    videoStreams,
    audioStreams,
    consume,
    createConsumers,
    filterRemoteStream,
    pauseRemoteStream,
    resumeRemoteStream,
    resumeAudioConsumers,
    resumeVideoConsumers,
    addInitialRemoteStream,
    pauseVideoConsumers,
    clearRemoteStream,
  };
};

export default useRemoteStream;
