# Story Creation API - Példák

## Bevezetés

Ez a dokumentum **konkrét HTTP request példákat** tartalmaz a Story Creator API használatához.

**Base URL**: `http://localhost:3000/api`

**Authentikáció**: Minden endpoint JWT Bearer token-t igényel:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 1. Story Létrehozása

### Request

**POST** `/stories`

```json
{
  "title": "A Kincskeresés",
  "slug": "treasure-hunt",
  "synopsis": "Egy rövid kaland, ahol kincseket keresel és döntéseket hozol.",
  "genre": "kaland",
  "primaryLanguage": "hu"
}
```

### Response (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "treasure-hunt",
  "title": "A Kincskeresés",
  "synopsis": "Egy rövid kaland...",
  "genre": "kaland",
  "status": "draft",
  "createdBy": "user-uuid",
  "primaryLanguage": "hu",
  "createdAt": "2025-11-10T19:30:00.000Z"
}
```

---

## 2. Start Node Létrehozása

### Request

**POST** `/stories/:storyId/nodes`

```json
{
  "key": "start",
  "textMd": "# A Kezdet\n\nEgy régi térkép vezetett ide. Egy elhagyatott kastély előtt állsz.\n\nVan 50 aranyad és egy fáklya.",
  "mediaRef": "stories/treasure-hunt/castle_entrance.jpg",
  "layout": "image",
  "effects": [
    {
      "type": "wallet",
      "target": "gold",
      "operation": "set",
      "value": 50,
      "metadata": { "reason": "Kezdő összeg" }
    },
    {
      "type": "inventory",
      "target": "torch",
      "operation": "add",
      "value": 1,
      "metadata": { "reason": "Kezdő fáklya" }
    }
  ],
  "choices": [
    {
      "id": "enter_castle",
      "text": "Belépsz a kastélyba 🏰",
      "target_node_id": "main_hall",
      "conditions": [],
      "effects": []
    }
  ]
}
```

### Response (201 Created)

```json
{
  "id": "node-uuid-1",
  "storyId": "550e8400-e29b-41d4-a716-446655440000",
  "key": "start",
  "textMd": "# A Kezdet\n\n...",
  "mediaRef": "stories/treasure-hunt/castle_entrance.jpg",
  "layout": "image",
  "effects": [...],
  "choices": [...],
  "isTerminal": false,
  "createdAt": "2025-11-10T19:31:00.000Z"
}
```

---

## 3. Kincsesláda Node (Választásos Jutalom)

### Request

**POST** `/stories/:storyId/nodes`

```json
{
  "key": "treasure_chest",
  "textMd": "# Kincsesláda\n\nKinyitod a ládát. Benne két zsák van:\n- Az egyikben **100 arany** csillog\n- A másikban **2 ragyogó kristály** látható\n\n**Csak egyet választhatsz!**",
  "mediaRef": "stories/treasure-hunt/treasure_chest.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "take_gold",
      "text": "Veszed az aranyat (+100 gold) 🪙",
      "target_node_id": "after_chest",
      "conditions": [],
      "effects": [
        {
          "type": "wallet",
          "target": "gold",
          "operation": "add",
          "value": 100,
          "metadata": { "reason": "Kincsesládából vett arany" }
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
      "text": "Veszed a kristályokat (+2 crystal) 💎",
      "target_node_id": "after_chest",
      "conditions": [],
      "effects": [
        {
          "type": "inventory",
          "target": "crystal",
          "operation": "add",
          "value": 2,
          "metadata": { "reason": "Kincsesládából vett kristályok" }
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

---

## 4. Fegyverbolt Node (Feltételes Vásárlás)

### Request

**POST** `/stories/:storyId/nodes`

```json
{
  "key": "weapon_shop",
  "textMd": "# Fegyverbolt\n\nEgy kereskedő áll előtted.\n\n**Kínálat:**\n- 🛡️ Páncél: 80 arany\n- ⚔️ Kard: 50 arany",
  "mediaRef": "stories/treasure-hunt/weapon_shop.jpg",
  "layout": "image_left",
  "choices": [
    {
      "id": "buy_armor",
      "text": "Vásárolsz páncélt (80 arany) 🛡️",
      "target_node_id": "after_shop",
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
          "value": 80,
          "metadata": { "reason": "Páncél vásárlása" }
        },
        {
          "type": "inventory",
          "target": "armor",
          "operation": "add",
          "value": 1,
          "metadata": { "reason": "Vásárolt páncél" }
        }
      ]
    },
    {
      "id": "buy_sword",
      "text": "Vásárolsz kardot (50 arany) ⚔️",
      "target_node_id": "after_shop",
      "conditions": [
        {
          "logic": {
            ">=": [{ "var": "wallets.gold" }, 50]
          }
        }
      ],
      "effects": [
        {
          "type": "wallet",
          "target": "gold",
          "operation": "subtract",
          "value": 50
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
      "id": "leave_shop",
      "text": "Nem vásárolsz semmit",
      "target_node_id": "next_room",
      "conditions": [],
      "effects": []
    }
  ]
}
```

**Magyarázat:**
- A "Vásárolsz páncélt" gomb **csak akkor aktív**, ha van legalább 80 arany
- Ha nincs elég pénz → frontend **szürkére állítja** a gombot

---

## 5. Feltételes Ajtó (Páncél Szükséges)

### Request

**POST** `/stories/:storyId/nodes`

```json
{
  "key": "locked_door",
  "textMd": "# Zárt Ajtó\n\nEgy őr áll az ajtó előtt:\n\n*\"Csak páncéllal mehetsz be!\"*",
  "mediaRef": "stories/treasure-hunt/locked_door.jpg",
  "layout": "image",
  "choices": [
    {
      "id": "enter_with_armor",
      "text": "Belépsz páncélban 🛡️",
      "target_node_id": "treasure_vault",
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
      "id": "turn_back",
      "text": "Visszafordulsz (nincs páncélod)",
      "target_node_id": "bad_ending",
      "conditions": [],
      "effects": []
    }
  ]
}
```

**Működés:**
- Ha van `armor` az inventoryban → "Belépsz páncélban" gomb **zöld** (aktív)
- Ha nincs `armor` → gomb **szürke** (inaktív, nem kattintható)

---

## 6. Győzelmi Node (Terminal)

### Request

**POST** `/stories/:storyId/nodes`

```json
{
  "key": "victory",
  "textMd": "# 🎉 GYŐZELEM!\n\nMegtaláltad a kincseket! 500 aranyat kapsz!\n\n**Játék vége - Győzelem!**",
  "mediaRef": "stories/treasure-hunt/victory.jpg",
  "layout": "image",
  "effects": [
    {
      "type": "wallet",
      "target": "gold",
      "operation": "add",
      "value": 500,
      "metadata": { "reason": "Végső kincs" }
    },
    {
      "type": "flag",
      "target": "game_won",
      "operation": "set",
      "value": true
    }
  ],
  "choices": [],
  "isTerminal": true
}
```

**Fontos**: `isTerminal: true` → Ez egy végjáték node, nincs további choice.

---

## 7. Node Frissítése

### Request

**PATCH** `/stories/:storyId/nodes/:nodeId`

```json
{
  "textMd": "# Frissített Szöveg\n\nEz a node szövege megváltozott.",
  "choices": [
    {
      "id": "new_choice",
      "text": "Új választási lehetőség",
      "target_node_id": "some_other_node",
      "conditions": [],
      "effects": []
    }
  ]
}
```

---

## 8. Story Publikálása

### Request

**PATCH** `/stories/:storyId/publish`

```json
{}
```

### Response (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "published",
  "message": "Story published successfully"
}
```

**Fontos**: Csak published story-kat lehet játszani!

---

## 9. Node Listázása

### Request

**GET** `/stories/:storyId/nodes`

### Response (200 OK)

```json
{
  "nodes": [
    {
      "id": "node-uuid-1",
      "key": "start",
      "textMd": "# A Kezdet...",
      "mediaRef": "stories/treasure-hunt/castle_entrance.jpg",
      "layout": "image",
      "isTerminal": false,
      "createdAt": "2025-11-10T19:31:00.000Z"
    },
    {
      "id": "node-uuid-2",
      "key": "main_hall",
      "textMd": "# Főcsarnok...",
      "mediaRef": "stories/treasure-hunt/main_hall.jpg",
      "layout": "image",
      "isTerminal": false,
      "createdAt": "2025-11-10T19:32:00.000Z"
    }
  ],
  "total": 2
}
```

---

## 10. Média Feltöltés

### Request

**POST** `/media/upload?storyId=:storyId`

**Content-Type**: `multipart/form-data`

```
file: [Binary file data]
```

### Response (201 Created)

```json
{
  "fileId": "uuid-v4",
  "fileName": "stories/treasure-hunt/uuid.jpg",
  "fileUrl": "http://localhost:9000/cyoa-media/stories/treasure-hunt/uuid.jpg",
  "mimeType": "image/jpeg",
  "size": 245678
}
```

**Használat:**
A `fileName` értéket használd a node `mediaRef` mezőjében!

---

## 11. Játék Indítása (Tesztelés)

### Request

**POST** `/gameplay/start`

```json
{
  "storyId": "550e8400-e29b-41d4-a716-446655440000",
  "saveSlot": 0
}
```

### Response (201 Created)

```json
{
  "saveId": "save-uuid",
  "gameState": {
    "userId": "user-uuid",
    "storyId": "550e8400-e29b-41d4-a716-446655440000",
    "currentNodeId": "node-uuid-1",
    "stats": { "knowledge": 10, "dexterity": 10, ... },
    "wallets": { "gold": 50 },
    "inventory": { "torch": 1 },
    "flags": {},
    "visitedNodes": ["node-uuid-1"],
    "choicesHistory": []
  },
  "currentNode": {
    "id": "node-uuid-1",
    "key": "start",
    "textMd": "# A Kezdet...",
    "mediaRef": "stories/treasure-hunt/castle_entrance.jpg",
    "layout": "image",
    "choices": [...]
  },
  "availableChoices": [
    {
      "index": 0,
      "text": "Belépsz a kastélyba 🏰",
      "targetNodeId": "node-uuid-2",
      "available": true,
      "conditions": [],
      "effects": []
    }
  ]
}
```

---

## 12. Választás Megtétele

### Request

**POST** `/gameplay/saves/:saveId/choice`

```json
{
  "choiceIndex": 0
}
```

### Response (200 OK)

```json
{
  "transition": {
    "previousNodeId": "node-uuid-1",
    "newNodeId": "node-uuid-2",
    "appliedEffects": [
      {
        "type": "wallet",
        "target": "gold",
        "operation": "add",
        "value": 100
      }
    ]
  },
  "gameState": {
    "currentNodeId": "node-uuid-2",
    "wallets": { "gold": 150 },
    "inventory": { "torch": 1 },
    ...
  },
  "currentNode": {
    "id": "node-uuid-2",
    "key": "main_hall",
    "textMd": "# Főcsarnok...",
    ...
  },
  "availableChoices": [...]
}
```

---

## Összefoglalás

### Story Workflow

1. **POST** `/stories` - Story létrehozása
2. **POST** `/media/upload?storyId=X` - Képek feltöltése
3. **POST** `/stories/:storyId/nodes` - Node-ok létrehozása (start, majd többi)
4. **PATCH** `/stories/:storyId/publish` - Story publikálása
5. **POST** `/gameplay/start` - Tesztelés

### Legfontosabb Mezők

- **conditions**: `[{ "logic": { ">=": [{ "var": "wallets.gold" }, 100] } }]`
- **effects**: `[{ "type": "wallet", "target": "gold", "operation": "add", "value": 100 }]`
- **layout**: `"image"` | `"image_left"` | `"image_right"` | `"video"` | `"audio"`
- **isTerminal**: `true` → végjáték node

---

## Hibakezelés

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Invalid choice index",
  "error": "Bad Request"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "Choice conditions not met",
  "error": "Forbidden"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Story not found",
  "error": "Not Found"
}
```

---

**Kész vagy! Most már tudod, hogyan használd az API-t story-k készítéséhez!** 🎮
