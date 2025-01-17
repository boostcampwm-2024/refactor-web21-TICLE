import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';
import { TicleStatus } from '@repo/types'; // TicleStatus enum 경로 확인

import { Ticle } from '../entity/ticle.entity';
import { User } from '../entity/user.entity';

export const seedTicles = async (dataSource: DataSource, count: number) => {
  const ticleRepository = dataSource.getRepository(Ticle);
  const userRepository = dataSource.getRepository(User);

  // 사용자 목록을 가져옵니다.
  const users = await userRepository.find();

  for (let i = 0; i < count; i++) {
    // 임의의 사용자 선택
    const randomUser = users[Math.floor(Math.random() * users.length)];

    const ticle = ticleRepository.create({
      speaker: randomUser,
      speakerName: randomUser.nickname, // 사용자 이름 사용
      speakerEmail: randomUser.email, // 사용자 이메일 사용
      speakerIntroduce: faker.lorem.sentence(),
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(),
      startTime: faker.date.future(),
      endTime: faker.date.future(),
      ticleStatus: TicleStatus.OPEN,
      createdAt: new Date(),
      profileImageUrl: faker.image.avatar(),
    });
    await ticleRepository.save(ticle);
  }

  console.log('Ticles seeded!');
};
