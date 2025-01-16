import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { SortType } from './sortType.enum';
import { TicleService } from './ticle.service'; // 서비스 경로에 맞게 수정
import { Applicant } from '../entity/applicant.entity';
import { Summary } from '../entity/summary.entity';
import { Tag } from '../entity/tag.entity';
import { Ticle } from '../entity/ticle.entity';
import { User } from '../entity/user.entity';

describe('TicleService', () => {
  let service: TicleService;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: '123',
          database: 'ticle_test',
          entities: [Ticle, User, Applicant, Summary, Tag],
          synchronize: true, // 테스트 환경에서는 true로 설정
        }),
        TypeOrmModule.forFeature([Ticle, User, Applicant, Summary, Tag]),
      ],
      providers: [TicleService], // TicleService를 providers에 추가
    }).compile();

    service = module.get<TicleService>(TicleService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy(); // DB 연결 종료
  });

  it('should measure query performance', async () => {
    const query = {
      page: 1,
      pageSize: 10,
      isOpen: true,
      sort: SortType.OLDEST, // 원하는 정렬 타입으로 수정
    };

    const startTime = Date.now();
    const result = await service.getTicleList(query);
    const duration = Date.now() - startTime;

    console.log(`Query executed in: ${duration}ms`);

    expect(result).toHaveProperty('ticles');
    expect(Number(result.meta.totalItems)).toBeGreaterThan(0); // 적어도 결과가 있어야 함
  });
});
