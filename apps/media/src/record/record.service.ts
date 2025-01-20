import fs from 'fs';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { types } from 'mediasoup';
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
    // 방에있는 모든 audio producer 가져오기
    const audioProducers = room.getAllAudioProducers();

    const port = this.getPort();
    const recordInfo = this.setRecordInfo(roomId, port);
    const plainTransport = await this.addPlainTransport(recordInfo, router);
    plainTransport.connect({
      ip: '127.0.0.1',
      port,
    });

    // 모든 consumer를 생성하게 하기
    await this.addConsumer();

    //todo : 방에있는 하나의 음성이라도 있으면 ffmpeg process 생성
    if (!audioProducers) {
      recordInfo.createFfmpegProcess(roomId);
    }
  }

  private setRecordInfo(roomId: string, port: number) {
    const recordInfo = new RecordInfo(port, this.ncpService);
    this.recordInfos.set(roomId, recordInfo);
    return recordInfo;
  }

  private async addPlainTransport(recordInfo: RecordInfo, router: types.Router) {
    const plainTransport = await this.mediasoupService.createPlainTransport(router);
    recordInfo.setPlainTransport(plainTransport);
    return plainTransport;
  }

  private async addConsumer() {}

  pauseRecord(roomId: string) {
    //todo: ffmpeg process pause
  }

  resumeRecord(roomId: string) {
    //todo: ffmpeg process resume
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
