import { MediaType } from '../types';

import type {
  Consumer,
  DtlsParameters,
  IceCandidate,
  IceParameters,
  MediaKind,
  ProducerOptions,
  RtpParameters,
  Transport,
} from 'mediasoup-client/lib/types';

export type BaseTransport = Transport;

export interface ConsumerTransports {
  consumer: Consumer;
  producerId: string;
  consumerTransport: BaseTransport;
  consumerTransportId: BaseTransport;
}
export interface CreateProducerRes {
  kind: MediaKind;
  peerId: string;
  nickname: string;
  producerId: string;
  paused: boolean;
  appData?: { mediaType: MediaType; nickname: string };
}

export interface CreateTransportRes {
  transportId: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
}

export interface CreateConsumerRes {
  peerId: string;
  consumerId: string;
  producerId: string;
  paused: boolean;
  kind: MediaKind;
  nickname: string;
  rtpParameters: RtpParameters;
  appData?: { mediaType: MediaType; nickname: string };
}

export interface RemoteStream {
  socketId: string;
  stream?: MediaStream | null;
  consumer?: Consumer<{ mediaType: MediaType; nickname: string }>;
  kind?: MediaKind;
  paused?: boolean;
  nickname: string;
  mediaType?: string;
}

export interface GetProducersRes {
  producerId: string;
  kind: MediaKind;
  peerId: string;
}

export interface ResumeConsumersRes {
  consumerId: string;
  producerId: string;
  paused: boolean;
}

export const VIDEO_PRODUCER_OPTIONS: ProducerOptions = {
  encodings: [
    {
      rid: 'r0',
      maxBitrate: 750000,
      maxFramerate: 30,
    },
    {
      rid: 'r1',
      maxBitrate: 2000000,
      maxFramerate: 30,
    },
    {
      rid: 'r2',
      maxBitrate: 3500000,
      maxFramerate: 30,
    },
  ],
  codecOptions: {
    videoGoogleStartBitrate: 100000,
    opusDtx: true,
  },
};

export const AUDIO_PRODUCER_OPTIONS: ProducerOptions = {
  encodings: [{ maxBitrate: 64000 }],
  codecOptions: {},
};
