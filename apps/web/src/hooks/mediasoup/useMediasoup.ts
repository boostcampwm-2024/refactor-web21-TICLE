import { useCallback, useEffect } from 'react';
import { SOCKET_EVENTS } from '@repo/mediasoup';
import type { CreateProducerRes } from '@repo/mediasoup/client';

import { useLocalStreamAction } from '@/contexts/localStream/context';
import { useMediasoupAction, useMediasoupState } from '@/contexts/mediasoup/context';
import { useRemoteStreamAction } from '@/contexts/remoteStream/context';

import useRoom from './useRoom';

import type { Device } from 'mediasoup-client/lib/Device';

interface NewPeerRes {
  peerId: string;
  nickname: string;
}

interface PeerLeftRes {
  peerId: string;
}

interface ProducerClosedRes {
  peerId: string;
  producerId: string;
}

const useMediasoup = () => {
  const { socketRef, isConnected, isError } = useMediasoupState();

  const { connectRoom } = useRoom();
  const { createRecvTransport, createSendTransport, createDevice, clearMediasoup } =
    useMediasoupAction();
  const {
    consume,
    createConsumers,
    filterRemoteStream,
    pauseRemoteStream,
    resumeRemoteStream,
    resumeAudioConsumers,
    clearRemoteStream,
    addInitialRemoteStream,
  } = useRemoteStreamAction();

  const { startCameraStream, startMicStream, clearLocalStream } = useLocalStreamAction();

  const setLocalStream = useCallback(
    async (device: Device) => {
      await createSendTransport(device);

      Promise.all([startCameraStream(), startMicStream()]);
    },
    [createSendTransport, startCameraStream, startMicStream]
  );

  const setRemoteStream = useCallback(
    async (device: Device) => {
      await createRecvTransport(device);

      const consumers = await createConsumers();

      resumeAudioConsumers(consumers);
    },
    [createRecvTransport, createConsumers, resumeAudioConsumers]
  );

  const initMediasoup = useCallback(async () => {
    const socket = socketRef.current;

    if (!socket) return;

    const rtpCapabilities = await connectRoom();

    if (!rtpCapabilities) return;

    const device = await createDevice(rtpCapabilities);

    setLocalStream(device);
    setRemoteStream(device);
  }, [socketRef, connectRoom, createDevice, setLocalStream, setRemoteStream]);

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || !isConnected || isError) return;

    // TODO: state 업데이트 변경
    const handleNewPeer = ({ peerId, nickname }: NewPeerRes) => {
      addInitialRemoteStream({ socketId: peerId, nickname });
    };

    const handlePeerLeft = ({ peerId }: PeerLeftRes) => {
      filterRemoteStream((rs) => rs.socketId !== peerId);
    };

    const handleProducerClosed = ({ producerId, peerId }: ProducerClosedRes) => {
      filterRemoteStream((rs) => rs.consumer?.producerId !== producerId);
    };

    const handleProducerPaused = ({ producerId, peerId }: ProducerClosedRes) => {
      pauseRemoteStream(producerId);
    };

    const handleProducerResumed = ({ producerId, peerId }: ProducerClosedRes) => {
      resumeRemoteStream(producerId);
    };

    const handleNewProducer = (data: CreateProducerRes) => {
      if (socket.id === data.peerId) return;

      consume(data);
    };

    socket.on(SOCKET_EVENTS.newPeer, handleNewPeer);
    socket.on(SOCKET_EVENTS.peerLeft, handlePeerLeft);
    socket.on(SOCKET_EVENTS.producerClosed, handleProducerClosed);
    socket.on(SOCKET_EVENTS.producerPaused, handleProducerPaused);
    socket.on(SOCKET_EVENTS.producerResumed, handleProducerResumed);
    socket.on(SOCKET_EVENTS.newProducer, handleNewProducer);

    return () => {
      socket.off(SOCKET_EVENTS.newPeer, handleNewPeer);
      socket.off(SOCKET_EVENTS.peerLeft, handlePeerLeft);
      socket.off(SOCKET_EVENTS.producerClosed, handleProducerClosed);
      socket.off(SOCKET_EVENTS.producerPaused, handleProducerPaused);
      socket.off(SOCKET_EVENTS.producerResumed, handleProducerResumed);
      socket.off(SOCKET_EVENTS.newProducer, handleNewProducer);
    };
  }, [
    socketRef,
    isConnected,
    isError,
    consume,
    filterRemoteStream,
    pauseRemoteStream,
    resumeRemoteStream,
    addInitialRemoteStream,
  ]);

  useEffect(() => {
    if (!isConnected || isError) return;
    initMediasoup();
  }, [initMediasoup, isConnected, isError]);

  useEffect(() => {
    const clearAll = () => {
      clearRemoteStream();
      clearLocalStream();
      clearMediasoup();
    };

    window.addEventListener('unload', clearAll);

    return () => {
      clearAll();
      window.removeEventListener('unload', clearAll);
    };
  }, []);
};

export default useMediasoup;
