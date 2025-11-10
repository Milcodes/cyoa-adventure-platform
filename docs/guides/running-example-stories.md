# Példa Story-k Futtatása

## Áttekintés

Ez az útmutató bemutatja, hogyan töltsd be és teszteld a példa story-kat.

---

## 1. Példa Story Betöltése

### Seed Script Futtatása

A `seed-examples.ts` script betölti a **"A Kincskeresés"** című komplett példa story-t.

```bash
cd apps/backend

# TypeScript fájl futtatása közvetlenül
npx ts-node prisma/seed-examples.ts
```

### Mit tölt be?

1. **Példa felhasználó** (author): `example.author@cyoa.hu`
2. **Story**: "A Kincskeresés" (slug: `treasure-hunt`)
3. **9 Story Node**:
   - `start` - Kezdő pont (50 arany, 1 fáklya)
   - `main_hall` - Főcsarnok (bal/jobb választás)
   - `left_room_chest` - Kincsesláda (arany vagy kristály)
   - `after_chest` - Láda után
   - `right_room_shop` - Fegyverbolt (páncél/kard/íj vásárlás)
   - `after_shop` - Bolt után
   - `final_door` - Feltételes ajtó (páncél kell!)
   - `victory` - Győzelem (terminal node)
   - `bad_ending` - Vereség (terminal node)

---

## 2. Story Tesztelése API-n keresztül

### 2.1. Authentikáció

Először jelentkezz be (vagy regisztrálj):

**POST** `http://localhost:3000/api/auth/login`

```json
{
  "email": "example.author@cyoa.hu",
  "password": "your-password"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

Mentsd el az `accessToken`-t!

---

### 2.2. Játék Indítása

**POST** `http://localhost:3000/api/gameplay/start`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "storyId": "STORY_UUID_FROM_SEED",
  "saveSlot": 0
}
```

**Response:**

```json
{
  "saveId": "save-uuid",
  "gameState": {
    "wallets": { "gold": 50 },
    "inventory": { "torch": 1 },
    "stats": { "knowledge": 10, ... }
  },
  "currentNode": {
    "key": "start",
    "textMd": "# A Kezdet\n\nEgy régi térkép vezetett ide...",
    "mediaRef": "stories/treasure-hunt/castle_entrance.jpg"
  },
  "availableChoices": [
    {
      "index": 0,
      "text": "Belépsz a kastélyba 🏰",
      "available": true
    }
  ]
}
```

---

### 2.3. Választás Megtétele

**POST** `http://localhost:3000/api/gameplay/saves/:saveId/choice`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Body:**
```json
{
  "choiceIndex": 0
}
```

**Response:**

```json
{
  "transition": {
    "previousNodeId": "...",
    "newNodeId": "...",
    "appliedEffects": [...]
  },
  "gameState": {
    "currentNodeId": "main_hall",
    "wallets": { "gold": 50 },
    ...
  },
  "currentNode": {
    "key": "main_hall",
    "textMd": "# Főcsarnok\n\nHatalmas csarnok..."
  },
  "availableChoices": [
    {
      "index": 0,
      "text": "Bal oldali ajtó ⬅️",
      "available": true
    },
    {
      "index": 1,
      "text": "Jobb oldali ajtó ➡️",
      "available": true
    }
  ]
}
```

---

## 3. Játékmenet Útvonalak

### 3.1. Győzelem Útvonal

1. **start** → Belépsz (choice 0)
2. **main_hall** → Bal oldali ajtó (choice 0)
3. **left_room_chest** → Veszed az aranyat (choice 0) → **+100 arany** (összesen 150)
4. **after_chest** → Tovább (choice 0)
5. **right_room_shop** → Vásárolsz páncélt (choice 0) → **-80 arany, +1 armor** (marad 70)
6. **after_shop** → Tovább (choice 0)
7. **final_door** → Belépsz páncélban (choice 0) ✅
8. **victory** → **+500 arany, +10 crystal, +1 royal_crown** 🎉

**Végeredmény:**
- Arany: 570
- Inventory: torch (1), royal_crown (1)
- Status: GYŐZELEM

---

### 3.2. Vereség Útvonal

1. **start** → Belépsz (choice 0)
2. **main_hall** → Jobb oldali ajtó (choice 1) - Kihagyjuk a ládát!
3. **right_room_shop** → Nem vásárolsz semmit (choice 3) - Nincs elég arany páncélhoz!
4. **final_door** → Visszafordulsz (choice 1) ❌
5. **bad_ending** → **Vereség**

**Magyarázat:**
- Nem mentél a bal szobába → nem kaptál +100 aranyat
- Kezdő 50 aranyból nem tellett a 80 arany páncélra
- Nincs páncél → nem tudsz bemenni

---

## 4. Választási Logika Tesztelése

### 4.1. Feltételes Gombok (Inaktív)

**Scenario**: Nincs elég arany a páncélhoz

**Állapot:**
```json
{
  "wallets": { "gold": 50 },
  "inventory": { "torch": 1 }
}
```

**Választás a boltban:**

```json
{
  "availableChoices": [
    {
      "index": 0,
      "text": "Vásárolsz páncélt (80 arany) 🛡️",
      "available": false,  // ❌ INAKTÍV - nincs elég arany
      "conditions": [
        {
          "logic": { ">=": [{ "var": "wallets.gold" }, 80] }
        }
      ]
    },
    {
      "index": 1,
      "text": "Vásárolsz kardot (50 arany) ⚔️",
      "available": true,  // ✅ AKTÍV - pont elég arany
      "conditions": [...]
    }
  ]
}
```

**Frontend működés:**
- `available: false` → gomb **szürke, nem kattintható**
- `available: true` → gomb **zöld, kattintható**

---

### 4.2. Inventory Alapú Feltétel

**Scenario**: Nincs páncél → nem mehetsz be az ajtón

**Állapot:**
```json
{
  "wallets": { "gold": 70 },
  "inventory": { "torch": 1 }  // NINCS armor!
}
```

**Választás a végső ajtónál:**

```json
{
  "availableChoices": [
    {
      "index": 0,
      "text": "Belépsz páncélban 🛡️",
      "available": false,  // ❌ INAKTÍV - nincs armor
      "conditions": [
        {
          "logic": { ">=": [{ "var": "inventory.armor" }, 1] }
        }
      ]
    },
    {
      "index": 1,
      "text": "Visszafordulsz (nincs páncélod)",
      "available": true,  // ✅ Mindig elérhető
      "conditions": []
    }
  ]
}
```

---

## 5. cURL Példák (Gyors Tesztelés)

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"example.author@cyoa.hu","password":"yourpass"}'
```

### Start Game

```bash
TOKEN="your-jwt-token"
STORY_ID="story-uuid"

curl -X POST http://localhost:3000/api/gameplay/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"storyId\":\"$STORY_ID\",\"saveSlot\":0}"
```

### Make Choice

```bash
SAVE_ID="save-uuid"

curl -X POST http://localhost:3000/api/gameplay/saves/$SAVE_ID/choice \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"choiceIndex":0}'
```

---

## 6. Hibakezelés

### Hibaüzenet: "Choice conditions not met"

```json
{
  "statusCode": 403,
  "message": "Choice conditions not met",
  "error": "Forbidden"
}
```

**Ok**: Olyan választást próbáltál megtenni, aminek a feltétele nem teljesül.

**Megoldás**: Ellenőrizd az `availableChoices` array-ben, hogy `available: true`-e!

---

### Hibaüzenet: "Story not found"

```json
{
  "statusCode": 404,
  "message": "Story not found"
}
```

**Ok**: Hibás `storyId` vagy a story nem létezik.

**Megoldás**: Futtasd újra a seed script-et!

---

## 7. Debug: Game State Lekérdezése

### Save Load

**GET** `http://localhost:3000/api/gameplay/saves/:saveId`

**Response:**

```json
{
  "saveId": "save-uuid",
  "gameState": {
    "userId": "...",
    "storyId": "...",
    "currentNodeId": "...",
    "wallets": { "gold": 150 },
    "inventory": { "torch": 1, "armor": 1 },
    "flags": { "chest_opened": true, "bought_armor": true },
    "visitedNodes": ["start", "main_hall", "left_room_chest", ...],
    "choicesHistory": [
      { "nodeId": "start", "choiceIndex": 0, "choiceText": "Belépsz..." },
      ...
    ]
  },
  "currentNode": { ... }
}
```

**Használat:**
- Ellenőrizd a `wallets` és `inventory` értékeit
- Nézd meg, mely node-okat látogattad már (`visitedNodes`)
- Követheted a választási történetet (`choicesHistory`)

---

## Összefoglalás

1. ✅ Futtasd a seed script-et: `npx ts-node prisma/seed-examples.ts`
2. ✅ Jelentkezz be: `POST /auth/login`
3. ✅ Indíts játékot: `POST /gameplay/start`
4. ✅ Tégy választásokat: `POST /gameplay/saves/:saveId/choice`
5. ✅ Ellenőrizd a feltételeket: `availableChoices[].available`

**Most már tesztelheted a teljes játékmenetot!** 🎮
