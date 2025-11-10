import { PrismaClient, StoryStatus, MediaLayout, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed Example Stories
 *
 * Példa történetek a rendszer működésének demonstrálására
 */
async function seedExampleStories() {
  console.log('🎮 Seeding example stories...');

  // 1. Példa felhasználó (author)
  const author = await prisma.user.upsert({
    where: { email: 'example.author@cyoa.hu' },
    update: {},
    create: {
      email: 'example.author@cyoa.hu',
      display_name: 'ExampleAuthor',
      role: UserRole.author,
      pw_hash: '$2b$10$example', // Példa hash
      preferred_language: 'hu',
    },
  });

  console.log(`✅ Author created: ${author.email}`);

  // 2. "A Kincskeresés" Story
  const treasureHuntStory = await prisma.story.upsert({
    where: { slug: 'treasure-hunt' },
    update: {},
    create: {
      slug: 'treasure-hunt',
      title: 'A Kincskeresés',
      synopsis:
        'Egy rövid kaland, ahol kincseket keresel, döntéseket hozol, és megtanulod használni az inventár és wallet rendszert.',
      genre: 'kaland',
      cover_url: 'stories/treasure-hunt/cover.jpg',
      status: StoryStatus.published,
      created_by: author.id,
      primary_language: 'hu',
      available_languages: ['hu'],
      metadata: {
        difficulty: 'easy',
        estimated_time: '10-15 perc',
        tags: ['példa', 'tutorial', 'kincs', 'inventory'],
      },
    },
  });

  console.log(`✅ Story created: ${treasureHuntStory.title}`);

  // 3. Story Nodes
  const nodes = [
    // Node 1: Start
    {
      story_id: treasureHuntStory.id,
      key: 'start',
      text_md: `# A Kezdet

Egy régi, viharvert térkép vezetett ide. Egy elhagyatott kastély tornyai magasodnak előtted a holdfényben.

A zsebedben **50 arany** csörren, és egy **fáklya** van a kezedben.

Mi lesz a döntésed?`,
      media_ref: 'stories/treasure-hunt/castle_entrance.jpg',
      layout: MediaLayout.image,
      effects: [
        {
          type: 'wallet',
          target: 'gold',
          operation: 'set',
          value: 50,
          metadata: { reason: 'Kezdő összeg' },
        },
        {
          type: 'inventory',
          target: 'torch',
          operation: 'add',
          value: 1,
          metadata: { reason: 'Kezdő fáklya' },
        },
      ],
      choices: [
        {
          id: 'enter_castle',
          text: 'Belépsz a kastélyba 🏰',
          target_node_id: 'main_hall',
          conditions: [],
          effects: [],
        },
      ],
      is_terminal: false,
    },
    // Node 2: Főcsarnok
    {
      story_id: treasureHuntStory.id,
      key: 'main_hall',
      text_md: `# Főcsarnok

Belépesz a hatalmas főcsarnokba. A fáklya fénye megvilágítja a falakat, ahol régi festmények lógnak.

Két ajtót látsz:
- **Bal oldali ajtó**: Nyikorgó hang hallatszik mögüle
- **Jobb oldali ajtó**: Fény szűrődik ki alóla

Melyik irányba indulsz?`,
      media_ref: 'stories/treasure-hunt/main_hall.jpg',
      layout: MediaLayout.image,
      effects: [],
      choices: [
        {
          id: 'go_left',
          text: 'Bal oldali ajtó ⬅️',
          target_node_id: 'left_room_chest',
          conditions: [],
          effects: [],
        },
        {
          id: 'go_right',
          text: 'Jobb oldali ajtó ➡️',
          target_node_id: 'right_room_shop',
          conditions: [],
          effects: [],
        },
      ],
      is_terminal: false,
    },
    // Node 3: Bal szoba - Kincsesláda
    {
      story_id: treasureHuntStory.id,
      key: 'left_room_chest',
      text_md: `# Kincsesláda

Belépve egy poros szobát találsz. A sarokban egy régi, fából készült láda áll.

Kinyitod, és két zsákot találsz benne:
- 🪙 **100 arany** csillog az egyik zsákban
- 💎 **2 ragyogó kristály** látható a másikban

**Csak egyet választhatsz!** Melyiket viszed magaddal?`,
      media_ref: 'stories/treasure-hunt/treasure_chest.jpg',
      layout: MediaLayout.image,
      effects: [],
      choices: [
        {
          id: 'take_gold',
          text: 'Veszed az aranyat (+100 gold) 🪙',
          target_node_id: 'after_chest',
          conditions: [],
          effects: [
            {
              type: 'wallet',
              target: 'gold',
              operation: 'add',
              value: 100,
              metadata: { reason: 'Kincsesládából vett arany' },
            },
            {
              type: 'flag',
              target: 'chest_opened',
              operation: 'set',
              value: true,
            },
            {
              type: 'flag',
              target: 'chose_gold',
              operation: 'set',
              value: true,
            },
          ],
        },
        {
          id: 'take_crystals',
          text: 'Veszed a kristályokat (+2 crystal) 💎',
          target_node_id: 'after_chest',
          conditions: [],
          effects: [
            {
              type: 'inventory',
              target: 'crystal',
              operation: 'add',
              value: 2,
              metadata: { reason: 'Kincsesládából vett kristályok' },
            },
            {
              type: 'flag',
              target: 'chest_opened',
              operation: 'set',
              value: true,
            },
            {
              type: 'flag',
              target: 'chose_crystals',
              operation: 'set',
              value: true,
            },
          ],
        },
      ],
      is_terminal: false,
    },
    // Node 4: Láda után
    {
      story_id: treasureHuntStory.id,
      key: 'after_chest',
      text_md: `# Zsákmány Összegyűjtve

Begyűjtötted a kincseket. Most folytathatod az utat a kastélyban.

Visszamész a főcsarnokba, és a jobb oldali ajtón keresztül tovább indulsz.`,
      media_ref: 'stories/treasure-hunt/collected_loot.jpg',
      layout: MediaLayout.image,
      effects: [],
      choices: [
        {
          id: 'continue_to_shop',
          text: 'Tovább a jobb oldali szobába ➡️',
          target_node_id: 'right_room_shop',
          conditions: [],
          effects: [],
        },
      ],
      is_terminal: false,
    },
    // Node 5: Jobb szoba - Fegyverbolt
    {
      story_id: treasureHuntStory.id,
      key: 'right_room_shop',
      text_md: `# Fegyverbolt

Egy meglepő látvány tárul eléd: egy idős kereskedő áll egy asztal mellett, amely tele van fegyverekkel és páncélokkal.

*"Üdvözöllek, vándor! Van árut eladni:"*

- 🛡️ **Páncél**: 80 arany
- ⚔️ **Kard**: 50 arany
- 🏹 **Íj**: 40 arany

**Fontos**: A végső ajtóhoz páncél kell!`,
      media_ref: 'stories/treasure-hunt/weapon_shop.jpg',
      layout: MediaLayout.image,
      effects: [],
      choices: [
        {
          id: 'buy_armor',
          text: 'Vásárolsz páncélt (80 arany) 🛡️',
          target_node_id: 'after_shop',
          conditions: [
            {
              logic: {
                '>=': [{ var: 'wallets.gold' }, 80],
              },
            },
          ],
          effects: [
            {
              type: 'wallet',
              target: 'gold',
              operation: 'subtract',
              value: 80,
              metadata: { reason: 'Páncél vásárlása' },
            },
            {
              type: 'inventory',
              target: 'armor',
              operation: 'add',
              value: 1,
              metadata: { reason: 'Fegyverboltból vásárolt páncél' },
            },
            {
              type: 'flag',
              target: 'bought_armor',
              operation: 'set',
              value: true,
            },
          ],
        },
        {
          id: 'buy_sword',
          text: 'Vásárolsz kardot (50 arany) ⚔️',
          target_node_id: 'after_shop',
          conditions: [
            {
              logic: {
                '>=': [{ var: 'wallets.gold' }, 50],
              },
            },
          ],
          effects: [
            {
              type: 'wallet',
              target: 'gold',
              operation: 'subtract',
              value: 50,
              metadata: { reason: 'Kard vásárlása' },
            },
            {
              type: 'inventory',
              target: 'sword',
              operation: 'add',
              value: 1,
              metadata: { reason: 'Fegyverboltból vásárolt kard' },
            },
          ],
        },
        {
          id: 'buy_bow',
          text: 'Vásárolsz íjat (40 arany) 🏹',
          target_node_id: 'after_shop',
          conditions: [
            {
              logic: {
                '>=': [{ var: 'wallets.gold' }, 40],
              },
            },
          ],
          effects: [
            {
              type: 'wallet',
              target: 'gold',
              operation: 'subtract',
              value: 40,
              metadata: { reason: 'Íj vásárlása' },
            },
            {
              type: 'inventory',
              target: 'bow',
              operation: 'add',
              value: 1,
              metadata: { reason: 'Fegyverboltból vásárolt íj' },
            },
          ],
        },
        {
          id: 'leave_shop',
          text: 'Nem vásárolsz semmit, tovább mész',
          target_node_id: 'final_door',
          conditions: [],
          effects: [],
        },
      ],
      is_terminal: false,
    },
    // Node 6: Bolt után
    {
      story_id: treasureHuntStory.id,
      key: 'after_shop',
      text_md: `# Vásárlás Után

Megvetted a tárgyakat, és most folytathatod az utad.

A kereskedő int, hogy tovább mehetsz a következő ajtón keresztül.`,
      media_ref: 'stories/treasure-hunt/after_shop.jpg',
      layout: MediaLayout.image,
      effects: [],
      choices: [
        {
          id: 'continue_to_door',
          text: 'Tovább a végső ajtóhoz 🚪',
          target_node_id: 'final_door',
          conditions: [],
          effects: [],
        },
      ],
      is_terminal: false,
    },
    // Node 7: Végső ajtó (feltételes)
    {
      story_id: treasureHuntStory.id,
      key: 'final_door',
      text_md: `# Zárt Ajtó

Egy masszív vasakkal megerősített ajtó előtt állsz. Az ajtó előtt egy őr áll.

*"Csak páncéllal mehetsz be! Védtelen civilek nem léphetnek a kincskamrába."*

Van páncélod?`,
      media_ref: 'stories/treasure-hunt/final_door.jpg',
      layout: MediaLayout.image,
      effects: [],
      choices: [
        {
          id: 'enter_with_armor',
          text: 'Belépsz páncélban 🛡️',
          target_node_id: 'victory',
          conditions: [
            {
              logic: {
                '>=': [{ var: 'inventory.armor' }, 1],
              },
            },
          ],
          effects: [],
        },
        {
          id: 'cannot_enter',
          text: 'Visszafordulsz (nincs páncélod)',
          target_node_id: 'bad_ending',
          conditions: [],
          effects: [],
        },
      ],
      is_terminal: false,
    },
    // Node 8: Győzelem
    {
      story_id: treasureHuntStory.id,
      key: 'victory',
      text_md: `# 🎉 GYŐZELEM!

Belépve a kincskamrába megtalálod a legendás kincseket!

**Megkapsz:**
- 🪙 **500 aranyat**
- 💎 **10 kristályt**
- 👑 **Királyi koronát**

Sikeresen teljesítetted a küldetést! Gazdag vagy, és a koronával visszatérsz a civilizációba hősként!

---

**Játék vége - Győzelem!**`,
      media_ref: 'stories/treasure-hunt/victory.jpg',
      layout: MediaLayout.image,
      effects: [
        {
          type: 'wallet',
          target: 'gold',
          operation: 'add',
          value: 500,
          metadata: { reason: 'Végső kincs' },
        },
        {
          type: 'inventory',
          target: 'crystal',
          operation: 'add',
          value: 10,
          metadata: { reason: 'Végső kincs' },
        },
        {
          type: 'inventory',
          target: 'royal_crown',
          operation: 'add',
          value: 1,
          metadata: { reason: 'Végső jutalom' },
        },
        {
          type: 'flag',
          target: 'game_won',
          operation: 'set',
          value: true,
        },
      ],
      choices: [],
      is_terminal: true,
    },
    // Node 9: Rossz vég
    {
      story_id: treasureHuntStory.id,
      key: 'bad_ending',
      text_md: `# 😞 Vereség

Visszafordulsz, mert nincs páncélod. Az őr nem enged be a kincskamrába.

Kilépve a kastélyból, eszembe jut: **ha vásároltam volna páncélt a boltban, sikerült volna!**

---

**Játék vége - Próbáld újra!**

💡 **Tipp**: A bal szobában találhatsz extra aranyat a páncél megvásárlásához!`,
      media_ref: 'stories/treasure-hunt/bad_ending.jpg',
      layout: MediaLayout.image,
      effects: [
        {
          type: 'flag',
          target: 'game_lost',
          operation: 'set',
          value: true,
        },
      ],
      choices: [],
      is_terminal: true,
    },
  ];

  // Node-ok létrehozása
  for (const nodeData of nodes) {
    await prisma.storyNode.upsert({
      where: {
        story_id_key: {
          story_id: nodeData.story_id,
          key: nodeData.key,
        },
      },
      update: {},
      create: nodeData,
    });

    console.log(`  ✅ Node created: ${nodeData.key}`);
  }

  // Target node ID-k frissítése (második pass)
  // Most már léteznek az összes node-ok, frissítjük a choice-ok target_node_id-jét
  for (const nodeData of nodes) {
    const node = await prisma.storyNode.findUnique({
      where: {
        story_id_key: {
          story_id: nodeData.story_id,
          key: nodeData.key,
        },
      },
    });

    if (node && nodeData.choices.length > 0) {
      // Frissítjük a choice-okat a valódi UUID-kkal
      const updatedChoices = await Promise.all(
        nodeData.choices.map(async (choice) => {
          const targetNode = await prisma.storyNode.findUnique({
            where: {
              story_id_key: {
                story_id: nodeData.story_id,
                key: choice.target_node_id,
              },
            },
          });

          return {
            ...choice,
            target_node_id: targetNode?.id || choice.target_node_id,
          };
        }),
      );

      await prisma.storyNode.update({
        where: { id: node.id },
        data: {
          choices: updatedChoices as any,
        },
      });
    }
  }

  console.log('✅ All nodes updated with correct target_node_ids');

  console.log('\n🎮 Example story seeding complete!');
  console.log(`\n📖 Story: ${treasureHuntStory.title}`);
  console.log(`🔗 Slug: ${treasureHuntStory.slug}`);
  console.log(`👤 Author: ${author.display_name}`);
}

async function main() {
  try {
    await seedExampleStories();
  } catch (error) {
    console.error('❌ Error seeding examples:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
