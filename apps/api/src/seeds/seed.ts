import { seedApplicants } from './applicant.seeder';
import { AppDataSource } from './datasource';
import { seedTags } from './tag.seeder';
import { seedTicles } from './ticle.seeder';
import { seedUsers } from './user.seeder';

const seedDatabase = async () => {
  try {
    // 데이터 소스 초기화
    await AppDataSource.initialize();
    console.log('Database connected successfully!');

    // User 데이터를 Seed
    // await seedUsers(AppDataSource, 1000);
    // await seedTicles(AppDataSource, 3_000_000);
    // await seedTags(AppDataSource, 100);
    // await seedApplicants(AppDataSource, 1000);

    console.log('Seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
