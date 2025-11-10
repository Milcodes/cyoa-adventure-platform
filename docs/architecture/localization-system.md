# Lokalizációs Rendszer (Version B)

## Áttekintés

A CYOA platform **többnyelvű, közösségi tartalomkészítést támogató** rendszer, ahol:
- **Nyelvválasztás NEM kötelező** - felhasználó bármikor válthat (fejléc menü)
- **Szerzők bármely nyelven írhatnak** - opcionális fordítások hozzáadása
- **Fallback mechanizmus** - hiányzó fordítás esetén alapnyelv + figyelmeztetés
- **Nyelvtanuló mód** - kétpaneles nézet, szókiemelés (opcionális)

## Felhasználói Szerepkörök

### 1. Játékos (Player)
- Történetek böngészése és játszása
- Nyelvválasztás a fejléc menüben
- Inventory, pénz, mentések kezelése

### 2. Szerző/Kalandíró (Author/Creator) **[ÚJ!]**
- Saját történetek készítése és publikálása
- Elsődleges nyelv kiválasztása
- Opcionális fordítások hozzáadása
- Lokalizációk kezelése
- Publikálásra küldés (moderációval)

### 3. Admin/Szerkesztő (Admin)
- Minden történet szerkesztése
- Csomópontok, feltételek/hatások, tárgyak, média kezelése
- Szerzők jogosultságainak kezelése
- Minijáték integráció

### 4. Moderátor (Moderator) **[OPCIONÁLIS]**
- Jelentések kezelése
- Kommentek moderálása
- Tartalomjóváhagyás (publish workflow)

## Adatmodell Kiegészítések

### 1. Users Tábla Frissítése

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    pw_hash VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(5) DEFAULT 'hu', -- Preferált nyelv
    role VARCHAR(20) DEFAULT 'player', -- player, author, admin, moderator
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    flags JSONB DEFAULT '{}'::JSONB,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_preferred_language ON users(preferred_language);
```

### 2. Stories Tábla Frissítése

```sql
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL, -- Alapnyelvi cím
    synopsis TEXT,
    genre VARCHAR(50),
    cover_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft', -- draft, pending_review, published, archived
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id), -- Szerző
    primary_language VARCHAR(5) DEFAULT 'hu', -- Elsődleges nyelv
    available_languages TEXT[] DEFAULT ARRAY['hu'], -- Elérhető nyelvek
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_stories_created_by ON stories(created_by);
CREATE INDEX idx_stories_primary_language ON stories(primary_language);
CREATE INDEX idx_stories_available_languages ON stories USING GIN(available_languages);
```

### 3. Story Translations (ÚJ TÁBLA)

```sql
CREATE TABLE story_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL, -- hu, de, en, es, fr, stb.
    title VARCHAR(255) NOT NULL,
    synopsis TEXT,
    translation_status VARCHAR(20) DEFAULT 'incomplete', -- incomplete, complete
    translated_by UUID REFERENCES users(id), -- Ki fordította
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(story_id, locale)
);

CREATE INDEX idx_story_translations_story_locale ON story_translations(story_id, locale);
CREATE INDEX idx_story_translations_status ON story_translations(story_id, translation_status);
```

### 4. Node Translations (ÚJ TÁBLA)

```sql
CREATE TABLE node_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES story_nodes(id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL,
    text_md TEXT NOT NULL, -- Fordított szöveg
    choices_labels JSONB, -- {choice_id: "Fordított label"}
    translation_status VARCHAR(20) DEFAULT 'incomplete',
    translated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(node_id, locale)
);

CREATE INDEX idx_node_translations_node_locale ON node_translations(node_id, locale);
```

**choices_labels példa:**
```json
{
  "to_house": "Zum Haus gehen",
  "to_cellar": "In den Keller gehen"
}
```

### 5. Content Moderation (ÚJ TÁBLA)

```sql
CREATE TABLE content_moderation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    moderator_id UUID REFERENCES users(id),
    notes TEXT, -- Moderátor megjegyzései
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moderation_status ON content_moderation(status);
CREATE INDEX idx_moderation_story ON content_moderation(story_id);
```

## Lokalizációs Folyamat

### 1. Szerző létrehoz egy történetet

```typescript
// POST /author/stories
{
  "title": "Das verlorene Schwert",
  "synopsis": "Ein Abenteuer in den Bergen...",
  "genre": "fantasy",
  "primary_language": "de", // Német az elsődleges nyelv
  "available_languages": ["de"]
}
```

### 2. Szerző hozzáad fordítást

```typescript
// POST /author/stories/{id}/translations
{
  "locale": "en",
  "title": "The Lost Sword",
  "synopsis": "An adventure in the mountains..."
}

// Frissíti a story.available_languages: ["de", "en"]
```

### 3. Node fordítások

```typescript
// POST /author/nodes/{nodeId}/translations
{
  "locale": "en",
  "text_md": "You enter the forest. A cold wind blows...",
  "choices_labels": {
    "to_house": "Go to the house",
    "to_cellar": "Climb down to the cellar"
  }
}
```

### 4. Fordítási státusz nyomon követése

```typescript
// GET /author/stories/{id}/translation-status
{
  "story_id": "...",
  "primary_language": "de",
  "translations": {
    "en": {
      "story_meta": "complete",
      "nodes": {
        "total": 50,
        "translated": 35,
        "incomplete": 15,
        "completion_percent": 70
      }
    },
    "hu": {
      "story_meta": "incomplete",
      "nodes": {
        "total": 50,
        "translated": 10,
        "incomplete": 40,
        "completion_percent": 20
      }
    }
  }
}
```

## Fallback Mechanizmus

### Szerver oldali logika:

```typescript
async function getNodeContent(
  nodeId: string,
  requestedLocale: string
): Promise<NodeContent> {
  const node = await nodeRepository.findById(nodeId);
  const story = await storyRepository.findById(node.story_id);

  // 1. Próbáld a kért nyelven
  let translation = await nodeTranslationRepository.findOne(nodeId, requestedLocale);

  if (translation) {
    return {
      ...node,
      text_md: translation.text_md,
      choices: node.choices.map(choice => ({
        ...choice,
        label: translation.choices_labels[choice.id] || choice.label // Fallback label
      })),
      locale: requestedLocale,
      fallback: false
    };
  }

  // 2. Fallback az elsődleges nyelvre
  if (requestedLocale !== story.primary_language) {
    translation = await nodeTranslationRepository.findOne(nodeId, story.primary_language);

    if (translation) {
      return {
        ...node,
        text_md: translation.text_md,
        choices: node.choices.map(choice => ({
          ...choice,
          label: translation.choices_labels[choice.id] || choice.label
        })),
        locale: story.primary_language,
        fallback: true,
        fallback_warning: `Content not available in ${requestedLocale}, showing ${story.primary_language}`
      };
    }
  }

  // 3. Végső fallback: alapértelmezett node text_md
  return {
    ...node,
    locale: story.primary_language,
    fallback: true,
    fallback_warning: `Translation missing for ${requestedLocale}`
  };
}
```

### Frontend megjelenítés:

```tsx
{fallback && (
  <Alert variant="warning">
    ⚠️ {fallback_warning}
  </Alert>
)}

<MarkdownRenderer content={text_md} />
```

## Nyelvválasztó UI

### 1. Fejléc Menü (Globális)

```tsx
<Header>
  <Logo />
  <Nav>
    <LanguageSelector
      current={user.preferred_language}
      available={['hu', 'de', 'en', 'es', 'fr']}
      onChange={(locale) => updateUserLanguage(locale)}
    />
  </Nav>
</Header>
```

### 2. Story Részletező Oldal (Kontextuális)

```tsx
<StoryDetail story={story}>
  <h1>{story.title}</h1>
  <p>{story.synopsis}</p>

  {story.available_languages.length > 1 && (
    <LanguageSelector
      label="Play this story in:"
      current={selectedLanguage}
      available={story.available_languages}
      onChange={(locale) => setSelectedLanguage(locale)}
    />
  )}

  <Button onClick={() => startStory(story.id, selectedLanguage)}>
    Start Adventure
  </Button>
</StoryDetail>
```

## Nyelvtanuló Mód (Opcionális)

### Bekapcsolás

```tsx
<Settings>
  <Toggle
    label="Language Learning Mode"
    description="Display original and translation side-by-side"
    enabled={learningMode}
    onChange={setLearningMode}
  />

  {learningMode && (
    <>
      <Select
        label="Source Language"
        value={sourceLanguage}
        options={story.available_languages}
      />
      <Select
        label="Target Language"
        value={targetLanguage}
        options={story.available_languages.filter(l => l !== sourceLanguage)}
      />
    </>
  )}
</Settings>
```

### Kétpaneles Megjelenítés

```tsx
{learningMode ? (
  <TwoColumnLayout>
    <Column language={sourceLanguage}>
      <MarkdownRenderer content={sourceText} />
      <WordHighlight onClick={showDefinition} />
    </Column>
    <Column language={targetLanguage}>
      <MarkdownRenderer content={targetText} />
    </Column>
  </TwoColumnLayout>
) : (
  <SingleColumn>
    <MarkdownRenderer content={text} />
  </SingleColumn>
)}
```

### Szókiemelés & Szótár

```tsx
<WordHighlight word="Wald" onHover={() => (
  <Tooltip>
    <strong>Forest</strong> (n.)<br/>
    Context: Ein dunkler Wald liegt vor dir.
  </Tooltip>
)} />
```

## API Végpontok

### Felhasználó nyelvi beállítása

```
POST /users/me/language
body: { "language": "de" }
```

### Story szűrés nyelv szerint

```
GET /stories?language=de
```

### Story lekérése adott nyelven

```
GET /stories/{id}?language=de
```

### Szerzői fordítás kezelés

```
POST /author/stories/{id}/translations/{locale}
PUT /author/nodes/{nodeId}/translations/{locale}
GET /author/stories/{id}/translation-status
DELETE /author/stories/{id}/translations/{locale}
```

### Játékmenet adott nyelven

```
GET /play/{storyId}/state?language=de
POST /play/{storyId}/choice
body: { "choiceId": "...", "language": "de" }
```

## Moderációs Workflow

### 1. Szerző publikus történetet készít

```typescript
// POST /author/stories/{id}/submit-for-review
// status: draft → pending_review
```

### 2. Moderátor értékeli

```typescript
// GET /moderator/pending
[
  {
    "story_id": "...",
    "title": "Das verlorene Schwert",
    "author": "user123",
    "submitted_at": "2025-01-10T10:00:00Z",
    "language": "de"
  }
]
```

### 3. Jóváhagyás / Elutasítás

```typescript
// POST /moderator/stories/{id}/approve
// status: pending_review → published

// vagy

// POST /moderator/stories/{id}/reject
body: { "notes": "Inappropriate content in node: forest_gate" }
// status: pending_review → draft (visszakerül szerzőhöz)
```

## Szerzői CMS UI

### Fordító Nézet (Translation Editor)

```
┌─────────────────────────────────────────────────────────┐
│ Story: Das verlorene Schwert                            │
│ Primary Language: DE                                    │
├─────────────────────────────────────────────────────────┤
│ Add Translation: [EN ▼] [+ Add]                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Node: forest_gate                                       │
│ ┌────────────────────┬────────────────────────────────┐│
│ │ DE (Original)      │ EN (Translation)   [70% ✓]    ││
│ ├────────────────────┼────────────────────────────────┤│
│ │ Belépsz az erdő    │ You enter the forest.          ││
│ │ peremére. A fák    │ A cold wind blows between      ││
│ │ között hűvös szél  │ the trees...                   ││
│ │ fúj...             │                                ││
│ ├────────────────────┼────────────────────────────────┤│
│ │ Choices:           │ Choices:                       ││
│ │ • A távoli ház felé│ • [✓] Go to the distant house  ││
│ │ • Lemászol a pincébe│ • [✗] Climb down to cellar    ││
│ └────────────────────┴────────────────────────────────┘│
│                                                          │
│ [Previous Node] [Next Node] [Save Translation]          │
└─────────────────────────────────────────────────────────┘
```

### Fordítási Státusz Dashboard

```
Story Translation Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Primary Language: German (DE)

Translations:
┌──────────┬─────────────┬────────────┬──────────┐
│ Language │ Story Meta  │ Nodes      │ Progress │
├──────────┼─────────────┼────────────┼──────────┤
│ EN       │ ✓ Complete  │ 35/50      │ 70%      │
│ HU       │ ✗ Incomplete│ 10/50      │ 20%      │
│ ES       │ ✗ Incomplete│  0/50      │  0%      │
└──────────┴─────────────┴────────────┴──────────┘

[+ Add New Language]
```

## i18n Rendszer (UI)

### UI szövegek fordítása

```typescript
// locales/hu.json
{
  "game.inventory": "Leltár",
  "game.wallet": "Pénztárca",
  "game.save": "Mentés",
  "story.play": "Játék indítása",
  "story.language": "Nyelv választása"
}

// locales/de.json
{
  "game.inventory": "Inventar",
  "game.wallet": "Geldbörse",
  "game.save": "Speichern",
  "story.play": "Abenteuer starten",
  "story.language": "Sprache wählen"
}
```

### Használat React-ben

```tsx
import { useTranslation } from 'next-i18next';

function GameUI() {
  const { t } = useTranslation('common');

  return (
    <div>
      <h2>{t('game.inventory')}</h2>
      <button>{t('game.save')}</button>
    </div>
  );
}
```

## Média Lokalizáció

### Nyelvfüggő asset-ek

```json
{
  "media": {
    "type": "image",
    "src": "s3://assets/forest.jpg",
    "subtitles": {
      "hu": "s3://assets/subtitles/forest_hu.vtt",
      "de": "s3://assets/subtitles/forest_de.vtt",
      "en": "s3://assets/subtitles/forest_en.vtt"
    },
    "audio": {
      "hu": "s3://assets/audio/forest_narration_hu.mp3",
      "de": "s3://assets/audio/forest_narration_de.mp3",
      "en": "s3://assets/audio/forest_narration_en.mp3"
    }
  }
}
```

## Teljesítmény Optimalizálás

### Caching stratégia

```typescript
// Redis cache kulcsok
cache.set(`story:${storyId}:locale:${locale}`, story, { ttl: 3600 });
cache.set(`node:${nodeId}:locale:${locale}`, nodeContent, { ttl: 3600 });

// Fordítások pre-loading
preloadTranslations(storyId, [locale, fallbackLocale]);
```

### Lazy loading fordítások

```typescript
// Csak akkor töltjük be, ha kell
const translation = await loadTranslation(nodeId, locale, {
  lazy: true,
  fallback: story.primary_language
});
```

---

## Összefoglalás

A lokalizációs rendszer:
- ✅ **Flexibilis**: Tetszőleges nyelvek támogatása
- ✅ **Fallback-es**: Hiányzó fordítás esetén alapnyelv
- ✅ **Szerzőbarát**: Egyszerű fordítói UI
- ✅ **Moderált**: Publikálás előtti ellenőrzés
- ✅ **Nyelvtanulást támogató**: Kétpaneles nézet, szókiemelés
- ✅ **Teljesítményoptimalizált**: Redis cache, lazy loading

Következő lépések:
1. Prisma schema generálása az új táblákhoz
2. API végpontok implementálása
3. Frontend komponensek (LanguageSelector, TranslationEditor)
4. Moderációs dashboard
