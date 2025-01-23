import { createContext, useContext } from 'react';
import { CreateProducerRes, RemoteStream } from '@repo/mediasoup/client';

interface RemoteStreamState {
  videoStreams: RemoteStream[];
  audioStreams: RemoteStream[];
}

interface MediasoupActionContextProps {
  consume: (data: CreateProducerRes) => Promise<void>;
  createConsumers: () => Promise<RemoteStream[]>;

  resumeAudioConsumers: (consumers: RemoteStream[]) => void;
  resumeVideoConsumers: (consumers: RemoteStream[]) => void;

  pauseVideoConsumers: (consumers: RemoteStream[]) => void;

  filterRemoteStream: (cb: (remoteStream: RemoteStream) => boolean) => void;
  pauseRemoteStream: (producerId: string) => void;
  resumeRemoteStream: (producerId: string) => void;
  clearRemoteStream: () => void;
  addInitialRemoteStream: (initialStream: Pick<RemoteStream, 'nickname' | 'socketId'>) => void;
}

export const RemoteStreamStateContext = createContext<RemoteStreamState | undefined>(undefined);
export const RemoteStreamActionContext = createContext<MediasoupActionContextProps | undefined>(
  undefined
);

export const useRemoteStreamState = (): RemoteStreamState => {
  const state = useContext(RemoteStreamStateContext);

  if (!state) {
    throw new Error('useRemoteStreamState must be used within a RemoteStreamProvider');
  }

  return state;
};

export const useRemoteStreamAction = (): MediasoupActionContextProps => {
  const actions = useContext(RemoteStreamActionContext);

  if (!actions) {
    throw new Error('useRemoteStreamAction must be used within a RemoteStreamProvider');
  }

  return actions;
};
