# Story Creator Guide - Történet Készítő Útmutató

## Áttekintés

Ez az útmutató bemutatja, hogyan hozz létre interaktív történeteket a CYOA platformon, **teljes példákkal** a YouTube-szerű admin felület logikájához.

## Felépítés (YouTube-szerű)

Minden story node 3 részből áll:

```
┌──────────────────────────────────┐
│  1. MÉDIA (felül)                │
│     - Kép, videó, hang           │
│     - Layout: image, video, audio│
├──────────────────────────────────┤
│  2. SZÖVEG (középen)             │
│     - Markdown formátum          │
│     - Leírás, dialógok           │
├──────────────────────────────────┤
│  3. VEZÉRLŐK (alul)              │
│     - Tovább gombok              │
│     - Interakciók (ládák, ajtók) │
│     - Feltételek és hatások      │
└──────────────────────────────────┘
```

---

## 1. Egyszerű Story Node

**Scenario**: Játékos belép egy szobába, talál egy ládát.

### API Request: Node létrehozása

**POST** `/stories/:storyId/nodes`

```json
{
  "key": "treasure_room_entrance",
  "textMd": "# Kincsesláda\n\nBelépsz egy félhomályos szobába. A sarokban egy régi, fából készült láda áll.",
  "mediaRef": "stories/my-adventure/treasure_chest.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "inspect_chest",
      "text": "Megvizsgálod a ládát",
      "target_node_id": "chest_inspection",
      "conditions": [],
      "effects": []
    },
    {
      "id": "leave_room",
      "text": "Távozol",
      "target_node_id": "previous_corridor",
      "conditions": [],
      "effects": []
    }
  ]
}
```

---

## 2. Láda Kinyitása - Jutalom Választás

**Scenario**: Játékos választhat: 100 arany VAGY 2 kristály

### Node: Láda kinyitása

```json
{
  "key": "chest_inspection",
  "textMd": "# A Láda\n\nKinyitod a ládát. Benne két zsák van:\n- Az egyikben **100 arany** csillog\n- A másikban **2 ragyogó kristály** látható\n\n**Csak egyet választhatsz!**",
  "mediaRef": "stories/my-adventure/open_chest.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "take_gold",
      "text": "Veszed az aranyat (100 gold)",
      "target_node_id": "after_chest_gold",
      "conditions": [],
      "effects": [
        {
          "type": "wallet",
          "target": "gold",
          "operation": "add",
          "value": 100,
          "metadata": {
            "reason": "Kincsesládából vett arany"
          }
        },
        {
          "type": "flag",
          "target": "chest_opened",
          "operation": "set",
          "value": true
        }
      ]
    },
    {
      "id": "take_crystals",
      "text": "Veszed a kristályokat (2 crystal)",
      "target_node_id": "after_chest_crystals",
      "conditions": [],
      "effects": [
        {
          "type": "inventory",
          "target": "crystal",
          "operation": "add",
          "value": 2,
          "metadata": {
            "reason": "Kincsesládából vett kristályok"
          }
        },
        {
          "type": "flag",
          "target": "chest_opened",
          "operation": "set",
          "value": true
        }
      ]
    }
  ]
}
```

### Node: Arany választás után

```json
{
  "key": "after_chest_gold",
  "textMd": "Begyűjtöd a **100 aranyat**. A zsák súlyosan rángatja le a tarisznyádat.\n\nMost folytathatod az utad.",
  "mediaRef": "stories/my-adventure/gold_collected.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "continue",
      "text": "Tovább",
      "target_node_id": "next_room",
      "conditions": [],
      "effects": []
    }
  ]
}
```

### Node: Kristály választás után

```json
{
  "key": "after_chest_crystals",
  "textMd": "Felveszed a **2 ragyogó kristályt**. Furcsa energiát árasztanak.\n\nMost folytathatod az utad.",
  "mediaRef": "stories/my-adventure/crystals_collected.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "continue",
      "text": "Tovább",
      "target_node_id": "next_room",
      "conditions": [],
      "effects": []
    }
  ]
}
```

---

## 3. Feltételes Ajtó - Páncél vagy Arany

**Scenario**: Ajtó csak akkor nyitható, ha van 1 páncél VAGY 100 arany

### Node: Zárt ajtó

```json
{
  "key": "locked_door",
  "textMd": "# Zárt Ajtó\n\nEgy masszív vasakkal megerősített ajtó előtt állsz. Az őr hideg tekintettel néz rád:\n\n*\"Ha be akarsz menni, vagy fizetsz 100 aranyat, vagy viselned kell páncélt. Védtelen civilek nem mehetnek be.\"*",
  "mediaRef": "stories/my-adventure/locked_door.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "enter_with_armor",
      "text": "Belépsz páncélban 🛡️",
      "target_node_id": "inside_fortress",
      "conditions": [
        {
          "logic": {
            ">=": [{ "var": "inventory.armor" }, 1]
          }
        }
      ],
      "effects": []
    },
    {
      "id": "pay_gold",
      "text": "Megfizeted az őrt (100 arany) 💰",
      "target_node_id": "inside_fortress",
      "conditions": [
        {
          "logic": {
            ">=": [{ "var": "wallets.gold" }, 100]
          }
        }
      ],
      "effects": [
        {
          "type": "wallet",
          "target": "gold",
          "operation": "subtract",
          "value": 100,
          "metadata": {
            "reason": "Belépési díj a várba"
          }
        }
      ]
    },
    {
      "id": "turn_back",
      "text": "Visszafordulsz",
      "target_node_id": "previous_corridor",
      "conditions": [],
      "effects": []
    }
  ]
}
```

**Fontos**: A frontend automatikusan **szürkére állítja** azokat a gombokat, ahol a `conditions` false értéket ad vissza!

---

## 4. Kulcsos Ajtó

**Scenario**: Ajtó kulccsal nyitható

### Node: Kulcsos ajtó

```json
{
  "key": "secret_door",
  "textMd": "# Titkos Ajtó\n\nEgy régi, rozsdás ajtó. A zárvány egy különleges kulcsot igényel.",
  "mediaRef": "stories/my-adventure/secret_door.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "unlock_with_key",
      "text": "Kinyitod a régi kulccsal 🗝️",
      "target_node_id": "secret_chamber",
      "conditions": [
        {
          "logic": {
            "in": ["ancient_key", { "var": "inventory" }]
          }
        }
      ],
      "effects": [
        {
          "type": "inventory",
          "target": "ancient_key",
          "operation": "subtract",
          "value": 1,
          "metadata": {
            "reason": "Kulcs elhasználva a titkos ajtóhoz"
          }
        }
      ]
    },
    {
      "id": "search_for_key",
      "text": "Keresed a kulcsot a közelben",
      "target_node_id": "search_area",
      "conditions": [],
      "effects": []
    },
    {
      "id": "leave",
      "text": "Visszamész",
      "target_node_id": "main_hall",
      "conditions": [],
      "effects": []
    }
  ]
}
```

---

## 5. Boltban Vásárlás

**Scenario**: Játékos vásárolhat páncélt 150 aranyért

### Node: Fegyverbolt

```json
{
  "key": "weapon_shop",
  "textMd": "# Fegyverbolt\n\nBelépek a kovácsműhelybe. A falakat fegyverek és páncélok díszítik.\n\n**Kínálat:**\n- Páncél: 150 arany\n- Kard: 80 arany\n- Íj: 60 arany",
  "mediaRef": "stories/my-adventure/weapon_shop.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "buy_armor",
      "text": "Vásárolsz páncélt (150 arany) 🛡️",
      "target_node_id": "shop_armor_bought",
      "conditions": [
        {
          "logic": {
            ">=": [{ "var": "wallets.gold" }, 150]
          }
        }
      ],
      "effects": [
        {
          "type": "wallet",
          "target": "gold",
          "operation": "subtract",
          "value": 150
        },
        {
          "type": "inventory",
          "target": "armor",
          "operation": "add",
          "value": 1
        }
      ]
    },
    {
      "id": "buy_sword",
      "text": "Vásárolsz kardot (80 arany) ⚔️",
      "target_node_id": "shop_sword_bought",
      "conditions": [
        {
          "logic": {
            ">=": [{ "var": "wallets.gold" }, 80]
          }
        }
      ],
      "effects": [
        {
          "type": "wallet",
          "target": "gold",
          "operation": "subtract",
          "value": 80
        },
        {
          "type": "inventory",
          "target": "sword",
          "operation": "add",
          "value": 1
        }
      ]
    },
    {
      "id": "buy_bow",
      "text": "Vásárolsz íjat (60 arany) 🏹",
      "target_node_id": "shop_bow_bought",
      "conditions": [
        {
          "logic": {
            ">=": [{ "var": "wallets.gold" }, 60]
          }
        }
      ],
      "effects": [
        {
          "type": "wallet",
          "target": "gold",
          "operation": "subtract",
          "value": 60
        },
        {
          "type": "inventory",
          "target": "bow",
          "operation": "add",
          "value": 1
        }
      ]
    },
    {
      "id": "leave_shop",
      "text": "Távozol",
      "target_node_id": "town_square",
      "conditions": [],
      "effects": []
    }
  ]
}
```

---

## 6. Összetett Feltételek

### 6.1. ÉS kapcsolat (AND)

"Csak akkor mehetsz tovább, ha van legalább 50 aranyad ÉS van fáklyád"

```json
{
  "conditions": [
    {
      "logic": {
        "and": [
          { ">=": [{ "var": "wallets.gold" }, 50] },
          { ">=": [{ "var": "inventory.torch" }, 1] }
        ]
      }
    }
  ]
}
```

### 6.2. VAGY kapcsolat (OR)

"Belépés: vagy 100 arany, VAGY van kulcsod"

```json
{
  "conditions": [
    {
      "logic": {
        "or": [
          { ">=": [{ "var": "wallets.gold" }, 100] },
          { ">=": [{ "var": "inventory.door_key" }, 1] }
        ]
      }
    }
  ]
}
```

### 6.3. Meglátogatott Node Ellenőrzés

"Csak akkor látható, ha már jártál a 'dragon_cave' node-nál"

```json
{
  "conditions": [
    {
      "logic": {
        "in": ["dragon_cave", { "var": "visitedNodes" }]
      }
    }
  ]
}
```

### 6.4. Flag Ellenőrzés

"Csak akkor nyílik ki, ha már legyőzted a sárkányt"

```json
{
  "conditions": [
    {
      "logic": {
        "==": [{ "var": "flags.dragon_defeated" }, true]
      }
    }
  ]
}
```

---

## 7. Automatikus Loot (Node Belépéskor)

**Scenario**: Amikor a játékos belép egy node-ba, automatikusan kap valamit

### Node: Kincskamra

```json
{
  "key": "treasure_vault",
  "textMd": "# Kincskamra\n\nBelépesz a kincskamrába! Arany és drágakövek hevernek mindenütt!\n\n*Automatikusan megkapsz:*\n- 200 aranyat\n- 5 kristályt",
  "mediaRef": "stories/my-adventure/treasure_vault.jpg",
  "layout": "image",
  "effects": [
    {
      "type": "wallet",
      "target": "gold",
      "operation": "add",
      "value": 200
    },
    {
      "type": "inventory",
      "target": "crystal",
      "operation": "add",
      "value": 5
    },
    {
      "type": "flag",
      "target": "vault_visited",
      "operation": "set",
      "value": true
    }
  ],
  "choices": [
    {
      "id": "take_loot_and_leave",
      "text": "Távozol a kincsekkel",
      "target_node_id": "exit_vault",
      "conditions": [],
      "effects": []
    }
  ]
}
```

---

## 8. Inventory Item Használat

**Scenario**: Játékos használ egy életerő italt

### Node: Harc után

```json
{
  "key": "after_battle",
  "textMd": "# Harc Után\n\nLegyőzted a szörnyet, de sebesült vagy (HP: 20/100).\n\nVan 3 életerő italod. Használsz egyet?",
  "mediaRef": "stories/my-adventure/wounded_hero.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "use_potion",
      "text": "Megivod az életerő italt (+30 HP) 🧪",
      "target_node_id": "healed",
      "conditions": [
        {
          "logic": {
            ">=": [{ "var": "inventory.health_potion" }, 1]
          }
        }
      ],
      "effects": [
        {
          "type": "inventory",
          "target": "health_potion",
          "operation": "subtract",
          "value": 1
        },
        {
          "type": "stat",
          "target": "hp",
          "operation": "add",
          "value": 30
        }
      ]
    },
    {
      "id": "rest_naturally",
      "text": "Pihenve gyógyulsz (+10 HP)",
      "target_node_id": "rested",
      "conditions": [],
      "effects": [
        {
          "type": "stat",
          "target": "hp",
          "operation": "add",
          "value": 10
        }
      ]
    }
  ]
}
```

---

## 9. Media Layout Opciók

### 9.1. Kép Felül (image)

```json
{
  "key": "example_node",
  "mediaRef": "stories/my-story/image.jpg",
  "layout": "image",
  "textMd": "Szöveg a kép alatt..."
}
```

### 9.2. Kép Bal Oldalt (image_left)

```json
{
  "key": "dialogue_node",
  "mediaRef": "stories/my-story/character.jpg",
  "layout": "image_left",
  "textMd": "A karakter beszél... (szöveg jobbra)"
}
```

### 9.3. Videó (video)

```json
{
  "key": "cinematic",
  "mediaRef": "stories/my-story/intro.mp4",
  "layout": "video",
  "textMd": "Bevezető videó után szöveg..."
}
```

### 9.4. Háttérzene (audio)

```json
{
  "key": "ambient_scene",
  "mediaRef": "stories/my-story/background_music.mp3",
  "layout": "audio",
  "textMd": "Szöveg háttérzenével..."
}
```

---

## 10. Effect Típusok Referencia

### 10.1. Wallet (Pénztárca)

```json
// Arany hozzáadása
{
  "type": "wallet",
  "target": "gold",
  "operation": "add",
  "value": 100
}

// Arany elvétele
{
  "type": "wallet",
  "target": "gold",
  "operation": "subtract",
  "value": 50
}

// Arany beállítása
{
  "type": "wallet",
  "target": "gold",
  "operation": "set",
  "value": 0
}
```

### 10.2. Inventory (Leltár)

```json
// Tárgy hozzáadása
{
  "type": "inventory",
  "target": "sword",
  "operation": "add",
  "value": 1
}

// Tárgy elvétele
{
  "type": "inventory",
  "target": "health_potion",
  "operation": "subtract",
  "value": 1
}
```

### 10.3. Stat (Képesség)

```json
// Stat növelése
{
  "type": "stat",
  "target": "strength",
  "operation": "add",
  "value": 5
}

// Stat csökkentése
{
  "type": "stat",
  "target": "hp",
  "operation": "subtract",
  "value": 20
}

// Stat beállítása
{
  "type": "stat",
  "target": "hp",
  "operation": "set",
  "value": 100
}
```

### 10.4. Flag (Esemény jelző)

```json
// Flag beállítása
{
  "type": "flag",
  "target": "dragon_defeated",
  "operation": "set",
  "value": true
}

// Számláló flag
{
  "type": "flag",
  "target": "quest_count",
  "operation": "set",
  "value": 5
}
```

---

## 11. Condition Típusok Referencia

### 11.1. Egyszerű Összehasonlítások

```json
// Legalább 100 arany
{ ">=": [{ "var": "wallets.gold" }, 100] }

// Pontosan 5 kristály
{ "==": [{ "var": "inventory.crystal" }, 5] }

// Kevesebb mint 50 HP
{ "<": [{ "var": "stats.hp" }, 50] }
```

### 11.2. Tárgy Létezik

```json
// Van-e "sword" az inventoryban (bármennyi)
{ "in": ["sword", { "var": "inventory" }] }

// Van legalább 1 sword
{ ">=": [{ "var": "inventory.sword" }, 1] }
```

### 11.3. ÉS, VAGY, NEM

```json
// ÉS (AND)
{
  "and": [
    { ">=": [{ "var": "wallets.gold" }, 50] },
    { ">=": [{ "var": "inventory.torch" }, 1] }
  ]
}

// VAGY (OR)
{
  "or": [
    { ">=": [{ "var": "wallets.gold" }, 100] },
    { "in": ["vip_pass", { "var": "inventory" }] }
  ]
}

// NEM (NOT)
{
  "!": { "in": ["dragon_defeated", { "var": "flags" }] }
}
```

### 11.4. Látogatott Node-ok

```json
// Jártál már a "castle_gate" node-nál?
{ "in": ["castle_gate", { "var": "visitedNodes" }] }
```

---

## 12. Teljes Példa Story: "A Kincskeresés"

### Story Metadata

```json
{
  "title": "A Kincskeresés",
  "slug": "treasure-hunt",
  "synopsis": "Egy rövid kaland, ahol kincseket keresel és döntéseket hozol.",
  "genre": "kaland",
  "primaryLanguage": "hu",
  "status": "draft"
}
```

### Node 1: Start

```json
{
  "key": "start",
  "textMd": "# A Kezdet\n\nEgy régi térkép vezetett ide. Egy elhagyatott kastély előtt állsz.\n\nVan 50 aranyad és egy fáklya.",
  "mediaRef": "stories/treasure-hunt/castle_entrance.jpg",
  "layout": "image",
  "effects": [
    { "type": "wallet", "target": "gold", "operation": "set", "value": 50 },
    { "type": "inventory", "target": "torch", "operation": "add", "value": 1 }
  ],
  "choices": [
    {
      "id": "enter",
      "text": "Belépsz a kastélyba",
      "target_node_id": "main_hall",
      "conditions": [],
      "effects": []
    }
  ]
}
```

### Node 2: Főcsarnok

```json
{
  "key": "main_hall",
  "textMd": "# Főcsarnok\n\nHatalmas csarnok tárja elénk képeit. Két ajtó: bal és jobb.",
  "mediaRef": "stories/treasure-hunt/main_hall.jpg",
  "layout": "image",
  "choices": [
    { "id": "left", "text": "Bal oldali ajtó", "target_node_id": "left_room", "conditions": [], "effects": [] },
    { "id": "right", "text": "Jobb oldali ajtó", "target_node_id": "right_room", "conditions": [], "effects": [] }
  ]
}
```

### Node 3: Bal Szoba (Láda)

```json
{
  "key": "left_room",
  "textMd": "# Bal Szoba\n\nEgy kincsesláda! Benne: 100 arany vagy 2 kristály.",
  "mediaRef": "stories/treasure-hunt/chest.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "take_gold",
      "text": "Vedd az aranyat",
      "target_node_id": "after_left",
      "effects": [{ "type": "wallet", "target": "gold", "operation": "add", "value": 100 }]
    },
    {
      "id": "take_crystal",
      "text": "Vedd a kristályt",
      "target_node_id": "after_left",
      "effects": [{ "type": "inventory", "target": "crystal", "operation": "add", "value": 2 }]
    }
  ]
}
```

### Node 4: Jobb Szoba (Bolt)

```json
{
  "key": "right_room",
  "textMd": "# Fegyverbolt\n\nEgy kereskedő páncélt árul 80 aranyért.",
  "mediaRef": "stories/treasure-hunt/shop.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "buy_armor",
      "text": "Vásárolj páncélt (80 arany)",
      "target_node_id": "after_right",
      "conditions": [{ "logic": { ">=": [{ "var": "wallets.gold" }, 80] } }],
      "effects": [
        { "type": "wallet", "target": "gold", "operation": "subtract", "value": 80 },
        { "type": "inventory", "target": "armor", "operation": "add", "value": 1 }
      ]
    },
    {
      "id": "leave",
      "text": "Tovább",
      "target_node_id": "final_door",
      "conditions": [],
      "effects": []
    }
  ]
}
```

### Node 5: Végső Ajtó (Feltételes)

```json
{
  "key": "final_door",
  "textMd": "# Zárt Ajtó\n\nA kincskamra ajtaja. Csak páncéllal mehetsz be!",
  "mediaRef": "stories/treasure-hunt/final_door.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "enter_vault",
      "text": "Belépés páncéllal 🛡️",
      "target_node_id": "victory",
      "conditions": [{ "logic": { ">=": [{ "var": "inventory.armor" }, 1] } }],
      "effects": []
    },
    {
      "id": "cannot_enter",
      "text": "Nem tudsz bemenni",
      "target_node_id": "bad_ending",
      "conditions": [],
      "effects": []
    }
  ]
}
```

### Node 6: Győzelem

```json
{
  "key": "victory",
  "textMd": "# GYŐZELEM!\n\nMegtaláltad a kincseskamrát! 500 arany vár!",
  "mediaRef": "stories/treasure-hunt/victory.jpg",
  "layout": "image",
  "effects": [
    { "type": "wallet", "target": "gold", "operation": "add", "value": 500 }
  ],
  "isTerminal": true,
  "choices": []
}
```

---

## 13. API Endpoint Összefoglaló

### Story létrehozása

**POST** `/stories`

```json
{
  "title": "A Kincskeresés",
  "slug": "treasure-hunt",
  "synopsis": "Kaland...",
  "genre": "kaland"
}
```

### Node létrehozása

**POST** `/stories/:storyId/nodes`

```json
{
  "key": "start",
  "textMd": "# Szöveg",
  "mediaRef": "path/to/media.jpg",
  "layout": "image",
  "choices": [...],
  "effects": [...]
}
```

### Story publikálása

**PATCH** `/stories/:storyId/publish`

---

## Összefoglalás

✅ **Média**: `mediaRef` + `layout`
✅ **Szöveg**: `textMd` (markdown)
✅ **Vezérlők**: `choices` array
✅ **Feltételek**: `conditions` (JSONLogic)
✅ **Hatások**: `effects` (wallet, inventory, stat, flag)
✅ **Inaktív gombok**: Ha `conditions` = false → frontend szürkére állítja

**A rendszer teljes mértékben támogatja a YouTube-szerű felépítést!**
