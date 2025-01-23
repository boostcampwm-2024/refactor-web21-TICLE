import { createContext, MutableRefObject, useContext } from 'react';
import { Socket } from 'socket.io-client';
import { MediaType } from '@repo/mediasoup';
import { CreateProducerRes } from '@repo/mediasoup/client';

import type { Transport, Producer, Device, RtpCapabilities } from 'mediasoup-client/lib/types';

export interface MediasoupState {
  isConnected: boolean;
  isError: Error | null;
  socketRef: MutableRefObject<Socket | null>;
  deviceRef: MutableRefObject<Device | null>;
  transportsRef: MutableRefObject<{
    sendTransport: Transport | null;
    recvTransport: Transport | null;
  }>;
  producersRef: MutableRefObject<{
    audio: Producer | null;
    video: Producer | null;
    screen: Producer | null;
  }>;
}

interface MediasoupActionContextProps {
  clearMediasoup: () => void;
  createDevice: (rtpCapabilities: RtpCapabilities) => Promise<Device>;
  createSendTransport: (device: Device) => Promise<void>;
  createRecvTransport: (device: Device) => Promise<void>;
  createProducer: (type: MediaType, track: MediaStreamTrack) => void;
  closeProducer: (type: MediaType) => void;
  pauseProducer: (type: MediaType) => void;
  resumeProducer: (type: MediaType) => void;
  connectExistProducer: () => Promise<CreateProducerRes[]>;
}

export const MediasoupStateContext = createContext<MediasoupState | undefined>(undefined);
export const MediasoupActionContext = createContext<MediasoupActionContextProps | undefined>(
  undefined
);

export const useMediasoupState = (): MediasoupState => {
  const state = useContext(MediasoupStateContext);
  if (!state) {
    throw new Error('useMediasoupContext must be used within a MediasoupProvider');
  }

  return state;
};

export const useMediasoupAction = (): MediasoupActionContextProps => {
  const actions = useContext(MediasoupActionContext);

  if (!actions) {
    throw new Error('useMediasoupAction must be used within a MediasoupProvider');
  }

  return actions;
};
