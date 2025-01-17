import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';

import { Applicant } from '../entity/applicant.entity'; // Applicant 엔티티 경로 확인
import { Ticle } from '../entity/ticle.entity'; // Ticle 엔티티 경로 확인
import { User } from '../entity/user.entity'; // User 엔티티 경로 확인

export const seedApplicants = async (dataSource: DataSource, count: number) => {
  const applicantRepository = dataSource.getRepository(Applicant);
  const ticleRepository = dataSource.getRepository(Ticle);
  const userRepository = dataSource.getRepository(User);

  const existingTicles = await ticleRepository.find();
  const existingUsers = await userRepository.find();

  for (let i = 0; i < count; i++) {
    // 랜덤한 타이클과 사용자 선택
    const randomTicle = faker.helpers.arrayElement(existingTicles);
    const randomUser = faker.helpers.arrayElement(existingUsers);

    const applicant = applicantRepository.create({
      ticle: randomTicle,
      user: randomUser,
    });

    try {
      await applicantRepository.save(applicant);
    } catch (error) {
      console.error(
        `Error seeding applicant for Ticle ID ${randomTicle.id} and User ID ${randomUser.id}:`,
        error
      );
    }
  }

  console.log(`${count} applicants seeded!`);
};
