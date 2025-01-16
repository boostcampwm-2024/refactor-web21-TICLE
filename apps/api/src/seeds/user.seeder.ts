import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';

import { User } from '../entity/user.entity';

export const seedUsers = async (dataSource: DataSource, count: number) => {
  const userRepository = dataSource.getRepository(User);

  for (let i = 0; i < count; i++) {
    const user = userRepository.create({
      username: faker.internet.userName(),
      password: faker.internet.password(),
      nickname: faker.name.firstName(),
      email: faker.internet.email(),
      introduce: faker.lorem.sentence(),
      profileImageUrl: faker.image.avatar(),
      provider: 'local',
    });
    await userRepository.save(user);
  }

  console.log('Users seeded!');
};
