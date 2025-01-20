import fs from 'fs';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { PlainTransport, Producer, RtpCapabilities } from 'mediasoup/node/lib/types';
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

    const audioProducers = room.getAllAudioProducers();

    const recordInfo = this.createRecordInfo(
      port,
      plainTransport,
      audioProducers,
      router.rtpCapabilities
    );
    this.recordInfos.set(roomId, recordInfo);

    //todo : 방에있는 하나의 음성이라도 있으면 ffmpeg process 생성
    if (!audioProducers) {
      recordInfo.createFfmpegProcess(roomId);
    }
  }

  private createRecordInfo(
    port: number,
    plainTransport: PlainTransport,
    audioProducers: Producer[],
    rtpCapabilities: RtpCapabilities
  ) {
    const recordInfo = new RecordInfo(port, this.ncpService);
    recordInfo.setPlainTransport(plainTransport);
    audioProducers.forEach(async (producer) => {
      const consumer = await this.mediasoupService.createRecordConsumer(
        plainTransport,
        producer.id,
        rtpCapabilities,
        producer.paused
      );
      recordInfo.addRecordConsumer(consumer);
    });

    return recordInfo;
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

//todo : 방장 마이크 키기 전까지 ffmepg실행안되게하기
//todo : 방장 마이크 키면 ffmpeg실행
//todo : 새로운 사용자 입장 시 consumer 추가
//todo : 사용자 나가기 시 consumer 삭제
//todo :
