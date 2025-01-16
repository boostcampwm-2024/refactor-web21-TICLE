import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';

import { Tag } from '../entity/tag.entity'; // Tag 엔티티 경로 확인
import { Ticle } from '../entity/ticle.entity'; // Ticle 엔티티 경로 확인

export const seedTags = async (dataSource: DataSource, count: number) => {
  const tagRepository = dataSource.getRepository(Tag);
  const ticleRepository = dataSource.getRepository(Ticle);

  // 기존 태그와 타이클을 가져옵니다.
  const existingTags = await tagRepository.find();
  const existingTagNames = new Set(existingTags.map((tag) => tag.name));
  const existingTicles = await ticleRepository.find();

  for (let i = 0; i < count; i++) {
    let name;
    do {
      name = faker.word.adjective(); // 랜덤한 단어 생성
    } while (existingTagNames.has(name)); // 중복 확인

    const tag = tagRepository.create({
      name,
    });

    // 태그 저장
    await tagRepository.save(tag);
    existingTagNames.add(name); // 새로 생성된 태그 이름 추가

    // 랜덤하게 타이클을 선택하고 연결합니다.
    if (existingTicles.length > 0) {
      const randomTicle = faker.helpers.arrayElement(existingTicles);
      // 이미 태그가 있으면 추가하고, 없으면 새로 만들어서 연결
      if (!randomTicle.tags) {
        randomTicle.tags = [];
      }
      randomTicle.tags.push(tag);
      await ticleRepository.save(randomTicle); // 수정된 타이클 저장
    }
  }

  console.log(`${count} tags seeded!`);
};
