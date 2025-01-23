import { useParams } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { SOCKET_EVENTS } from '@repo/mediasoup';

import { useMediasoupState } from '@/contexts/mediasoup/context';
import useAuthStore from '@/stores/useAuthStore';

import type { RtpCapabilities } from 'mediasoup-client/lib/RtpParameters';

interface JoinRoomRes {
  rtpCapabilities: RtpCapabilities;
}
const useRoom = () => {
  const { socketRef } = useMediasoupState();
  const { ticleId: roomId } = useParams({ from: '/_authenticated/live/$ticleId' });
  const nickname = useAuthStore.getState().authInfo?.nickname;

  const [connected, setConnected] = useState(false);

  const createRoom = useCallback(async () => {
    const socket = socketRef.current;

    if (!socket || connected) return;

    return new Promise<RtpCapabilities>((resolve) => {
      socket.emit(SOCKET_EVENTS.createRoom, { roomId }, resolve);
    });
  }, [connected, roomId, socketRef]);

  const joinRoom = useCallback(async () => {
    const socket = socketRef.current;

    if (!socket || connected) return;

    return new Promise<RtpCapabilities>((resolve) => {
      socket.emit(
        SOCKET_EVENTS.joinRoom,
        { roomId, nickname },
        ({ rtpCapabilities }: JoinRoomRes) => {
          resolve(rtpCapabilities);
        }
      );
    });
  }, [connected, nickname, roomId, socketRef]);

  const connectRoom = useCallback(async () => {
    const socket = socketRef.current;

    if (!socket || connected) return;

    await createRoom();
    const rtpCapabilities = await joinRoom();

    setConnected(true);

    return rtpCapabilities;
  }, [connected, createRoom, joinRoom, socketRef]);

  return { connectRoom };
};

export default useRoom;
