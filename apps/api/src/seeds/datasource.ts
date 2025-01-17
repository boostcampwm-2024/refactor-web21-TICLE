import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { Applicant } from '../entity/applicant.entity';
import { Summary } from '../entity/summary.entity';
import { Tag } from '../entity/tag.entity';
import { Ticle } from '../entity/ticle.entity';
import { User } from '../entity/user.entity';

// 데이터 소스 초기화
export const AppDataSource = new DataSource({
  type: 'mysql', // 사용할 데이터베이스 종류
  host: 'localhost', // 데이터베이스 호스트
  port: 3306, // 데이터베이스 포트
  username: 'root', // 사용자 이름
  password: '123', // 비밀번호
  database: 'ticle_test', // 데이터베이스 이름
  synchronize: true, // 개발 중에는 true로 설정 (생성된 엔티티에 따라 테이블을 동기화)
  logging: true, // 쿼리 로깅
  entities: [User, Ticle, Tag, Applicant, Summary], // 사용할 엔티티 목록
});
