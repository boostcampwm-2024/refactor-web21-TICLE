import { unlinkSync, writeFileSync } from 'fs';

import ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';
import { Consumer, PlainTransport, RtpParameters } from 'mediasoup/node/lib/types';

import { NcpService } from '@/ncp/ncp.service';

export class RecordInfo {
  plainTransport: PlainTransport;
  recordConsumers: Map<string, Consumer>;

  ncpService: NcpService;

  port: number;

  ffmpegProcess: FfmpegCommand;

  constructor(port: number, ncpService: NcpService) {
    this.port = port;
    this.ncpService = ncpService;
    this.recordConsumers = new Map();
  }

  setPlainTransport(plainTransport: PlainTransport) {
    this.plainTransport = plainTransport;
  }

  addRecordConsumer(recordConsumer: Consumer) {
    this.recordConsumers.set(recordConsumer.id, recordConsumer);
    recordConsumer.once('producerresume', () => {
      // todo : 실행중인지 판단하는 코드 추가한 뒤 전체에서 한번만 실행하게하기
      // if (!this.ffmpegProcess) {
      //   this.createFfmpegProcess(roomId);
      // }
    });
  }

  clearStream() {
    if (this.recordConsumers) {
      this.recordConsumers.forEach((consumer) => {
        consumer.close();
      });
      this.recordConsumers.clear();
    }
    if (this.plainTransport) {
      this.plainTransport.close();
      this.plainTransport = null;
    }
  }

  createFfmpegProcess(roomId: string) {
    if (this.ffmpegProcess) {
      return;
    }

    // todo : 대표적인 음성 rtpparameter를 가져옴
    const rtpParameter = this.recordConsumer.rtpParameters;
    const sdpString = this.createSdpText(this.port, rtpParameter);
    const sdpFilePath = `./record/${roomId}_${Date.now()}.sdp`;
    writeFileSync(sdpFilePath, sdpString);

    const filePath = `./record/${roomId}_${Date.now()}.mp3`;

    const remoteFileName = `uploads/${roomId}_${Date.now()}.mp3`;

    const ffmpegCommand = ffmpeg()
      .input(sdpFilePath)
      .inputFormat('sdp')
      .inputOptions(['-protocol_whitelist', 'pipe,udp,rtp,file'])
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .audioFrequency(48000)
      .audioChannels(2)
      .on('error', (err) => {
        // todo 예외처리
        console.log('FFmpeg error:1', err);
      })
      .on('end', () => {
        this.ncpService.uploadFile(filePath, remoteFileName, roomId);
        unlinkSync(sdpFilePath);
        this.ffmpegProcess = null;
        this.clearStream();
      })
      .save(filePath);

    this.ffmpegProcess = ffmpegCommand;
  }

  private createSdpText = (port: number, rtpParameters: RtpParameters) => {
    const { codecs } = rtpParameters;
    const payloadType = codecs[0].payloadType;
    return `v=0
o=- 0 0 IN IP4 127.0.0.1
s=FFmpeg
c=IN IP4 127.0.0.1
t=0 0
m=audio ${port} RTP/AVP ${payloadType}
a=rtpmap:${payloadType} opus/48000/2
a=fmtp:${payloadType} minptime=10;useinbandfec=1
a=sendrecv
`;
  };
}
