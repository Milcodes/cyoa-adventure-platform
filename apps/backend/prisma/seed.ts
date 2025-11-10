import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data (development only)
  await prisma.contentModeration.deleteMany();
  await prisma.minigameScore.deleteMany();
  await prisma.minigame.deleteMany();
  await prisma.roll.deleteMany();
  await prisma.save.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.userInventory.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.nodeTranslation.deleteMany();
  await prisma.storyTranslation.deleteMany();
  await prisma.storyNode.deleteMany();
  await prisma.story.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleaned existing data');

  // ==================== USERS ====================

  const passwordHash = await bcrypt.hash('password123', 10);

  const player1 = await prisma.user.create({
    data: {
      email: 'player@example.com',
      display_name: 'Demo Player',
      pw_hash: passwordHash,
      preferred_language: 'en',
      role: 'player',
    },
  });

  const author1 = await prisma.user.create({
    data: {
      email: 'author@example.com',
      display_name: 'Demo Author',
      pw_hash: passwordHash,
      preferred_language: 'en',
      role: 'author',
    },
  });

  const moderator1 = await prisma.user.create({
    data: {
      email: 'moderator@example.com',
      display_name: 'Demo Moderator',
      pw_hash: passwordHash,
      preferred_language: 'en',
      role: 'moderator',
    },
  });

  const admin1 = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      display_name: 'Demo Admin',
      pw_hash: passwordHash,
      preferred_language: 'en',
      role: 'admin',
    },
  });

  console.log('✅ Created users (player, author, moderator, admin)');

  // ==================== STORY ====================

  const story1 = await prisma.story.create({
    data: {
      slug: 'the-four-paths',
      title: 'The Four Paths',
      synopsis: 'A legendary quest with four starting paths. Choose your destiny!',
      genre: 'fantasy',
      cover_url: 'https://via.placeholder.com/400x600?text=Four+Paths',
      status: 'published',
      created_by: author1.id,
      primary_language: 'en',
      available_languages: ['en', 'hu', 'de'],
      metadata: {
        difficulty: 'medium',
        estimated_time: '30 minutes',
        tags: ['fantasy', 'adventure', 'choice-driven'],
      },
    },
  });

  console.log('✅ Created story: The Four Paths');

  // ==================== STORY TRANSLATIONS ====================

  await prisma.storyTranslation.create({
    data: {
      story_id: story1.id,
      locale: 'hu',
      title: 'A Négy Út',
      synopsis: 'Legendás küldetés négy kezdő úttal. Válaszd meg a sorsodat!',
      translation_status: 'complete',
      translated_by: author1.id,
    },
  });

  await prisma.storyTranslation.create({
    data: {
      story_id: story1.id,
      locale: 'de',
      title: 'Die Vier Wege',
      synopsis: 'Eine legendäre Quest mit vier Startpfaden. Wähle dein Schicksal!',
      translation_status: 'incomplete',
      translated_by: author1.id,
    },
  });

  console.log('✅ Created story translations (Hungarian, German)');

  // ==================== STORY NODES ====================

  // Start Node
  const startNode = await prisma.storyNode.create({
    data: {
      story_id: story1.id,
      key: 'start',
      text_md: `# The Crossroads

You stand at a legendary crossroads. Four paths lie before you, each leading to a different destiny.

The wind whispers ancient secrets as you contemplate your choice...`,
      media_ref: 'https://via.placeholder.com/800x600?text=Crossroads',
      layout: 'image',
      choices: [
        {
          id: 'to_mountain',
          label: 'Ascend the mountain path',
          target: 'mountain_pass',
          conditions: [],
          effects: [],
        },
        {
          id: 'to_forest',
          label: 'Enter the dark forest',
          target: 'forest_gate',
          conditions: [],
          effects: [],
        },
        {
          id: 'to_ocean',
          label: 'Follow the ocean road',
          target: 'harbor',
          conditions: [],
          effects: [
            { type: 'wallet', op: '+', value: 10, reason: 'Found coins on the road' },
          ],
        },
        {
          id: 'to_desert',
          label: 'Brave the desert wasteland',
          target: 'desert_edge',
          conditions: [{ type: 'stat', key: 'strength', op: '>=', value: 12 }],
          effects: [],
        },
      ],
      is_terminal: false,
    },
  });

  // Forest Gate Node
  const forestNode = await prisma.storyNode.create({
    data: {
      story_id: story1.id,
      key: 'forest_gate',
      text_md: `# The Forest Gate

You step into the edge of the dark forest. The trees tower above you, their branches forming a natural cathedral. A cool wind carries whispers of ancient magic.

In the distance, you see a dilapidated house through the trees.`,
      media_ref: 'https://via.placeholder.com/800x600?text=Dark+Forest',
      layout: 'image',
      dice_checks: [
        {
          id: 'perception_check',
          when: 'onEnter',
          formula: '1d20+knowledge',
          dc: 12,
          success: {
            log: 'Your keen senses detect a hidden path! +1 Knowledge',
            effects: [
              { type: 'stat', key: 'knowledge', op: '+', value: 1 },
              { type: 'flag', key: 'found_hidden_path', value: true },
            ],
          },
          fail: {
            log: 'You notice nothing special.',
            effects: [],
          },
        },
      ],
      choices: [
        {
          id: 'to_house',
          label: 'Approach the distant house',
          target: 'house_front',
          conditions: [],
          effects: [],
        },
        {
          id: 'back_to_start',
          label: 'Return to the crossroads',
          target: 'start',
          conditions: [],
          effects: [],
        },
      ],
      is_terminal: false,
    },
  });

  // House Front Node
  const houseNode = await prisma.storyNode.create({
    data: {
      story_id: story1.id,
      key: 'house_front',
      text_md: `# The Old House

You approach a ramshackle wooden house. The door hangs ajar, creaking in the wind. Dark windows stare at you like empty eye sockets.

Do you dare to enter?`,
      media_ref: 'https://via.placeholder.com/800x600?text=Old+House',
      layout: 'image',
      conditions: [],
      effects: [],
      choices: [
        {
          id: 'enter_house',
          label: 'Enter the house',
          target: 'house_interior',
          conditions: [],
          effects: [
            { type: 'flag', key: 'entered_house', value: true },
          ],
        },
        {
          id: 'search_outside',
          label: 'Search around the house',
          target: 'house_exterior',
          conditions: [],
          effects: [],
        },
        {
          id: 'back_to_forest',
          label: 'Return to the forest',
          target: 'forest_gate',
          conditions: [],
          effects: [],
        },
      ],
      is_terminal: false,
    },
  });

  // House Interior Node (with trap)
  const houseInteriorNode = await prisma.storyNode.create({
    data: {
      story_id: story1.id,
      key: 'house_interior',
      text_md: `# Inside the House

The floorboards creak ominously beneath your feet. Dust motes dance in the dim light filtering through broken windows.

Suddenly, you hear a **CLICK**...`,
      media_ref: 'https://via.placeholder.com/800x600?text=Dark+Interior',
      layout: 'image',
      dice_checks: [
        {
          id: 'trap_check',
          when: 'onEnter',
          formula: '1d20+dexterity',
          dc: 14,
          success: {
            log: 'You dodge the falling debris! Your quick reflexes saved you. +1 Dexterity',
            effects: [
              { type: 'stat', key: 'dexterity', op: '+', value: 1 },
            ],
          },
          fail: {
            log: 'A section of ceiling collapses on you! -15 HP',
            effects: [
              { type: 'hp', op: '-', value: 15 },
            ],
          },
        },
      ],
      choices: [
        {
          id: 'explore_deeper',
          label: 'Explore deeper into the house',
          target: 'treasure_room',
          conditions: [{ type: 'stat', key: 'hp', op: '>', value: 20 }],
          effects: [],
        },
        {
          id: 'escape_house',
          label: 'Get out of here!',
          target: 'house_front',
          conditions: [],
          effects: [],
        },
      ],
      is_terminal: false,
    },
  });

  // Treasure Room (Terminal - Good Ending)
  const treasureNode = await prisma.storyNode.create({
    data: {
      story_id: story1.id,
      key: 'treasure_room',
      text_md: `# The Hidden Treasure

Despite the danger, you press forward and discover a hidden room behind a rotting bookshelf.

Inside, you find an ancient chest filled with gold coins and a legendary sword!

**🎉 Congratulations! You've completed "The Four Paths" and discovered the treasure!**`,
      media_ref: 'https://via.placeholder.com/800x600?text=Treasure+Room',
      layout: 'image',
      effects: [
        { type: 'wallet', op: '+', value: 1000, reason: 'Treasure chest' },
        { type: 'item', op: 'add', key: 'legendary_sword', qty: 1 },
      ],
      choices: [],
      is_terminal: true,
    },
  });

  // House Exterior (alternative path)
  const houseExteriorNode = await prisma.storyNode.create({
    data: {
      story_id: story1.id,
      key: 'house_exterior',
      text_md: `# Around the House

You cautiously circle the old house, searching for anything useful.

Behind the house, you find an old well and a small herb garden. You gather some useful herbs.`,
      media_ref: 'https://via.placeholder.com/800x600?text=Garden',
      layout: 'image',
      effects: [
        { type: 'item', op: 'add', key: 'healing_herb', qty: 3 },
      ],
      choices: [
        {
          id: 'back_to_front',
          label: 'Return to the front door',
          target: 'house_front',
          conditions: [],
          effects: [],
        },
        {
          id: 'leave_forest',
          label: 'Leave the forest (end journey)',
          target: 'peaceful_ending',
          conditions: [],
          effects: [],
        },
      ],
      is_terminal: false,
    },
  });

  // Peaceful Ending (Terminal - Alternative Ending)
  const peacefulEndingNode = await prisma.storyNode.create({
    data: {
      story_id: story1.id,
      key: 'peaceful_ending',
      text_md: `# A Peaceful Journey

You decide that discretion is the better part of valor and leave the mysterious house behind.

As you exit the forest, the sun is setting, painting the sky in brilliant oranges and purples. You've survived your adventure and gained valuable experience.

**🌅 You've completed "The Four Paths" with a peaceful ending.**`,
      media_ref: 'https://via.placeholder.com/800x600?text=Sunset',
      layout: 'image',
      effects: [
        { type: 'stat', key: 'luck', op: '+', value: 2 },
      ],
      choices: [],
      is_terminal: true,
    },
  });

  // Placeholder nodes for other paths
  await prisma.storyNode.createMany({
    data: [
      {
        story_id: story1.id,
        key: 'mountain_pass',
        text_md: '# Mountain Pass\n\n(Work in progress - to be implemented)',
        is_terminal: true,
      },
      {
        story_id: story1.id,
        key: 'harbor',
        text_md: '# The Harbor\n\n(Work in progress - to be implemented)',
        is_terminal: true,
      },
      {
        story_id: story1.id,
        key: 'desert_edge',
        text_md: '# Desert Edge\n\n(Work in progress - to be implemented)',
        is_terminal: true,
      },
    ],
  });

  console.log('✅ Created story nodes (10 nodes total)');

  // ==================== NODE TRANSLATIONS ====================

  // Hungarian translations for key nodes
  await prisma.nodeTranslation.createMany({
    data: [
      {
        node_id: startNode.id,
        locale: 'hu',
        text_md: `# A Keresztút

Egy legendás keresztútnál állsz. Négy út áll előtted, mindegyik más sorsot ígér.

A szél ősi titkokat suttog, miközben elgondolkozol a választásodon...`,
        choices_labels: {
          to_mountain: 'Mássz fel a hegyi ösvényre',
          to_forest: 'Lépj be a sötét erdőbe',
          to_ocean: 'Kövesd az óceán útját',
          to_desert: 'Merészeld meg a sivatagi pusztaságot',
        },
        translation_status: 'complete',
        translated_by: author1.id,
      },
      {
        node_id: forestNode.id,
        locale: 'hu',
        text_md: `# Az Erdő Kapuja

Belépsz a sötét erdő szélére. A fák magasra nyúlnak fölötted, ágaik természetes katedrálist alkotnak. Hűvös szél hozza az ősi mágia suttogását.

A távolban egy rozoga házat látsz a fák között.`,
        choices_labels: {
          to_house: 'Közelítsd meg a távoli házat',
          back_to_start: 'Térj vissza a keresztúthoz',
        },
        translation_status: 'complete',
        translated_by: author1.id,
      },
      {
        node_id: houseNode.id,
        locale: 'hu',
        text_md: `# A Régi Ház

Egy rozoga faházhoz közeledel. Az ajtó résnyire nyitva lóg, nyikorogva a szélben. Sötét ablakok merednek rád, mint üres szemgödrök.

Mersz-e bemenni?`,
        choices_labels: {
          enter_house: 'Menj be a házba',
          search_outside: 'Kutasd át a ház körüli területet',
          back_to_forest: 'Térj vissza az erdőbe',
        },
        translation_status: 'complete',
        translated_by: author1.id,
      },
    ],
  });

  console.log('✅ Created node translations (Hungarian)');

  // ==================== INVENTORY ITEMS ====================

  await prisma.inventoryItem.createMany({
    data: [
      {
        story_id: story1.id,
        key: 'legendary_sword',
        name: 'Legendary Sword',
        description: 'An ancient blade of immense power. Glows with a faint blue light.',
        rarity: 'legendary',
        stackable: false,
        icon_url: 'https://via.placeholder.com/64x64?text=⚔️',
        meta: {
          damage: 50,
          durability: 100,
          special: 'critical_strike',
        },
      },
      {
        story_id: story1.id,
        key: 'healing_herb',
        name: 'Healing Herb',
        description: 'A common herb with medicinal properties. Restores 20 HP when consumed.',
        rarity: 'common',
        stackable: true,
        icon_url: 'https://via.placeholder.com/64x64?text=🌿',
        meta: {
          heal_amount: 20,
        },
      },
      {
        story_id: story1.id,
        key: 'torch',
        name: 'Torch',
        description: 'A simple torch that illuminates dark areas.',
        rarity: 'common',
        stackable: true,
        icon_url: 'https://via.placeholder.com/64x64?text=🔦',
      },
    ],
  });

  console.log('✅ Created inventory items');

  // ==================== DEMO PLAYER PROGRESS ====================

  // Create initial wallet for player
  await prisma.wallet.create({
    data: {
      user_id: player1.id,
      story_id: story1.id,
      balance: 100,
      currency: 'gold',
    },
  });

  // Player has a torch
  await prisma.userInventory.create({
    data: {
      user_id: player1.id,
      story_id: story1.id,
      item_key: 'torch',
      qty: 1,
    },
  });

  // Player's save at start
  await prisma.save.create({
    data: {
      user_id: player1.id,
      story_id: story1.id,
      slot: 0, // auto-save
      node_key: 'start',
      snapshot_json: {
        node_key: 'start',
        inventory: [{ key: 'torch', qty: 1 }],
        wallet: { balance: 100, currency: 'gold' },
        stats: {
          hp: 100,
          max_hp: 100,
          knowledge: 10,
          dexterity: 10,
          strength: 10,
          luck: 10,
        },
        flags: {},
        variables: {},
        history: ['start'],
        status_effects: [],
      },
    },
  });

  console.log('✅ Created demo player progress');

  // ==================== SUMMARY ====================

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Users: 4 (player, author, moderator, admin)`);
  console.log(`   - Stories: 1 (The Four Paths)`);
  console.log(`   - Story nodes: 10`);
  console.log(`   - Translations: 2 story + 3 node (Hungarian)`);
  console.log(`   - Inventory items: 3`);
  console.log('\n🔑 Demo credentials:');
  console.log('   - Player:    player@example.com / password123');
  console.log('   - Author:    author@example.com / password123');
  console.log('   - Moderator: moderator@example.com / password123');
  console.log('   - Admin:     admin@example.com / password123');
  console.log('\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
