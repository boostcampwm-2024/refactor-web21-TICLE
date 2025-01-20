import fs from 'fs';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { ErrorMessage } from '@repo/types';

import { MediasoupService } from '@/mediasoup/mediasoup.service';
import { NcpService } from '@/ncp/ncp.service';
import { RoomService } from '@/room/room.service';

import { RecordInfo } from './recordInfo';

@Injectable()
export class RecordService {
  private recordInfos: Map<string, RecordInfo> = new Map();
  private recordPath = './record';
  private usedPorts: Set<number> = new Set();

  constructor(
    private mediasoupService: MediasoupService,
    private roomService: RoomService,
    private configService: ConfigService,
    private ncpService: NcpService
  ) {
    if (!fs.existsSync(this.recordPath)) {
      fs.mkdirSync(this.recordPath);
    }
  }

  async startRecord(roomId: string) {
    const room = this.roomService.getRoom(roomId);
    if (!room) {
      return;
    }
    const router = room.router;
    const port = this.getPort();

    const plainTransport = await this.mediasoupService.createPlainTransport(router);
    plainTransport.connect({
      ip: '127.0.0.1',
      port,
    });

    const masterPeer = room.getPeer(room.masterSocketId);
    const masterPeerAudioProducer = masterPeer.getAudioProducer();
    const audioProducers = room.getAllAudioProducers();

    const recordInfo = new RecordInfo(port, this.ncpService, plainTransport);
    this.recordInfos.set(roomId, recordInfo);

    audioProducers.forEach(async (producer) => {
      const consumer = await this.mediasoupService.createRecordConsumer(
        plainTransport,
        producer.id,
        router.rtpCapabilities,
        producer.paused
      );
      if (producer.id === masterPeerAudioProducer.id) {
        recordInfo.setMasterConsumerRtpParameters(consumer.rtpParameters);
        if (producer.paused) {
          consumer.once('producerresume', () => {
            recordInfo.createFfmpegProcess(roomId);
            console.log('master consumer resume');
          });
          return;
        }
        recordInfo.createFfmpegProcess(roomId);
      }
      recordInfo.addRecordConsumer(consumer);
    });
  }

  stopRecord(roomId: string) {
    const recordInfo = this.recordInfos.get(roomId);
    if (!recordInfo) {
      return;
    }
    this.releasePort(recordInfo.port);
    recordInfo.clearStream();
    this.recordInfos.delete(roomId);
  }

  private getPort() {
    const minPort = Number(this.configService.get('RECORD_MIN_PORT'));
    const maxPort = Number(this.configService.get('RECORD_MAX_PORT'));
    const totalPorts = maxPort - minPort + 1;

    if (this.usedPorts.size >= totalPorts) {
      throw new WsException(ErrorMessage.NO_AVAILABLE_PORT);
    }

    let port: number;
    do {
      port = Math.floor(Math.random() * totalPorts) + minPort;
    } while (this.usedPorts.has(port));

    this.usedPorts.add(port);
    return port;
  }

  private releasePort(port: number): void {
    this.usedPorts.delete(port);
  }

  getIsRecording(roomId: string) {
    return this.recordInfos.has(roomId);
  }
}

//todo : 새로운 사용자 입장 시 consumer 추가
//todo : 사용자 나가기 시 consumer 삭제
