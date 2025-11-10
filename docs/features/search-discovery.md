# Search & Discovery API Implementation Guide

This document outlines how to implement full-text search and discovery features.

## Features Overview

1. **Full-Text Search** - Search stories by title, description, tags
2. **Advanced Filters** - Genre, difficulty, playtime, rating
3. **Recommendations** - Personalized story recommendations
4. **Trending Stories** - Most played stories in last 7 days
5. **Similar Stories** - Find stories with similar themes

---

## Technology Stack

### Option 1: PostgreSQL Full-Text Search (Simple)

Built-in PostgreSQL capabilities:
- `tsvector` and `tsquery`
- GIN indexes
- Good for basic search

### Option 2: Elasticsearch (Advanced)

External search engine:
- Advanced full-text search
- Fuzzy matching
- Aggregations
- Better performance at scale

### Option 3: TypeSense (Recommended)

Modern search engine:
- Easy setup
- Typo tolerance
- Fast
- Lower resource usage than Elasticsearch

---

## Implementation with PostgreSQL

### 1. Add Search Column to Stories

```prisma
model Story {
  // ... existing fields
  search_vector Unsupported("tsvector")?

  @@index([search_vector], type: Gin)
}
```

### 2. Create Trigger for Auto-Update

```sql
CREATE OR REPLACE FUNCTION stories_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.genre, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER stories_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Story"
  FOR EACH ROW EXECUTE FUNCTION stories_search_vector_update();
```

### 3. Search API Endpoints

```typescript
// GET /search?q=adventure&genre=fantasy&minRating=4

@Controller('search')
export class SearchController {
  @Get()
  async search(@Query('q') query: string, @Query() filters: SearchFiltersDto) {
    return this.searchService.searchStories(query, filters);
  }

  @Get('trending')
  async getTrendingStories(@Query('days') days: number = 7) {
    return this.searchService.getTrendingStories(days);
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  async getRecommendations(@GetUser('id') userId: string) {
    return this.searchService.getPersonalizedRecommendations(userId);
  }

  @Get('similar/:storyId')
  async getSimilarStories(@Param('storyId') storyId: string) {
    return this.searchService.findSimilarStories(storyId);
  }
}
```

### 4. Search Service Implementation

```typescript
@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchStories(query: string, filters: SearchFiltersDto) {
    const where: any = {
      status: 'published',
    };

    // Full-text search
    if (query) {
      where.OR = [
        {
          search_vector: {
            search: query.split(' ').join(' & '),
          },
        },
      ];
    }

    // Apply filters
    if (filters.genre) {
      where.genre = filters.genre;
    }

    if (filters.minRating) {
      where.avg_rating = {
        gte: filters.minRating,
      };
    }

    if (filters.maxPlaytime) {
      where.estimated_playtime_minutes = {
        lte: filters.maxPlaytime,
      };
    }

    const stories = await this.prisma.story.findMany({
      where,
      include: {
        created_by: {
          select: {
            display_name: true,
          },
        },
        _count: {
          select: {
            game_saves: true,
          },
        },
      },
      take: filters.limit || 20,
      skip: filters.offset || 0,
      orderBy: query
        ? undefined
        : { created_at: 'desc' }, // Relevance sort when searching
    });

    return {
      stories,
      total: await this.prisma.story.count({ where }),
    };
  }

  async getTrendingStories(days: number = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Stories with most plays in the last N days
    const trending = await this.prisma.story.findMany({
      where: {
        status: 'published',
        game_saves: {
          some: {
            created_at: {
              gte: since,
            },
          },
        },
      },
      include: {
        created_by: {
          select: {
            display_name: true,
          },
        },
        _count: {
          select: {
            game_saves: {
              where: {
                created_at: {
                  gte: since,
                },
              },
            },
          },
        },
      },
      orderBy: {
        game_saves: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    return trending.map((story) => ({
      ...story,
      trending_plays: story._count.game_saves,
    }));
  }

  async getPersonalizedRecommendations(userId: string) {
    // Get user's play history
    const playedStories = await this.prisma.gameSave.findMany({
      where: { player_id: userId },
      select: { story_id: true },
      distinct: ['story_id'],
    });

    const playedIds = playedStories.map((s) => s.story_id);

    // Get genres the user plays
    const playedGenres = await this.prisma.story.groupBy({
      by: ['genre'],
      where: {
        id: { in: playedIds },
      },
      _count: true,
      orderBy: {
        _count: {
          genre: 'desc',
        },
      },
    });

    const favoriteGenre = playedGenres[0]?.genre;

    // Recommend stories in favorite genre that user hasn't played
    const recommendations = await this.prisma.story.findMany({
      where: {
        status: 'published',
        genre: favoriteGenre,
        id: { notIn: playedIds },
      },
      include: {
        created_by: {
          select: {
            display_name: true,
          },
        },
      },
      orderBy: {
        game_saves: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    return {
      based_on: favoriteGenre,
      recommendations,
    };
  }

  async findSimilarStories(storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    // Find stories with same genre
    const similar = await this.prisma.story.findMany({
      where: {
        status: 'published',
        genre: story.genre,
        id: { not: storyId },
      },
      include: {
        created_by: {
          select: {
            display_name: true,
          },
        },
      },
      take: 5,
    });

    return similar;
  }
}
```

---

## Advanced: TypeSense Integration

### 1. Setup TypeSense

```yaml
# docker-compose.yml
typesense:
  image: typesense/typesense:26.0
  ports:
    - "8108:8108"
  volumes:
    - typesense_data:/data
  environment:
    TYPESENSE_API_KEY: ${TYPESENSE_API_KEY}
    TYPESENSE_DATA_DIR: /data
```

### 2. Install Client

```bash
npm install typesense
```

### 3. Create Collection Schema

```typescript
const storySchema = {
  name: 'stories',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'genre', type: 'string', facet: true },
    { name: 'author_name', type: 'string' },
    { name: 'avg_rating', type: 'float', optional: true },
    { name: 'play_count', type: 'int32' },
    { name: 'created_at', type: 'int64' },
  ],
  default_sorting_field: 'play_count',
};

await client.collections().create(storySchema);
```

### 4. Index Stories

```typescript
async indexStory(story: Story) {
  await this.typesenseClient
    .collections('stories')
    .documents()
    .create({
      id: story.id,
      title: story.title,
      description: story.description,
      genre: story.genre,
      author_name: story.created_by.display_name,
      avg_rating: story.avg_rating || 0,
      play_count: story.total_plays || 0,
      created_at: new Date(story.created_at).getTime(),
    });
}
```

### 5. Search with TypeSense

```typescript
async searchWithTypeSense(query: string, filters?: any) {
  const searchParameters = {
    q: query,
    query_by: 'title,description,author_name',
    filter_by: filters?.genre ? `genre:=${filters.genre}` : '',
    sort_by: filters?.sortBy || 'play_count:desc',
    per_page: 20,
  };

  const results = await this.typesenseClient
    .collections('stories')
    .documents()
    .search(searchParameters);

  return results.hits.map((hit) => hit.document);
}
```

---

## Frontend Implementation

### Search Component

```tsx
// components/SearchBar.tsx
export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = useDebouncedCallback(async (value: string) => {
    if (!value) return;

    const { data } = await apiClient.get(`/search?q=${value}`);
    setResults(data.stories);
  }, 300);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          handleSearch(e.target.value);
        }}
        placeholder="Search stories..."
        className="w-full px-4 py-2 rounded-lg"
      />

      {results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-game-panel rounded-lg shadow-xl">
          {results.map((story) => (
            <SearchResult key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Advanced Filters

```tsx
// components/StoryFilters.tsx
export function StoryFilters({ onChange }: Props) {
  const [filters, setFilters] = useState({
    genre: '',
    minRating: 0,
    maxPlaytime: null,
    sortBy: 'popular',
  });

  return (
    <div className="game-panel p-4 space-y-4">
      <div>
        <label>Genre</label>
        <select
          value={filters.genre}
          onChange={(e) => {
            const newFilters = { ...filters, genre: e.target.value };
            setFilters(newFilters);
            onChange(newFilters);
          }}
        >
          <option value="">All Genres</option>
          <option value="adventure">Adventure</option>
          <option value="horror">Horror</option>
          {/* ... more genres */}
        </select>
      </div>

      <div>
        <label>Minimum Rating</label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={filters.minRating}
          onChange={(e) => {
            const newFilters = { ...filters, minRating: parseFloat(e.target.value) };
            setFilters(newFilters);
            onChange(newFilters);
          }}
        />
        <span>{filters.minRating} stars</span>
      </div>

      <div>
        <label>Sort By</label>
        <select
          value={filters.sortBy}
          onChange={(e) => {
            const newFilters = { ...filters, sortBy: e.target.value };
            setFilters(newFilters);
            onChange(newFilters);
          }}
        >
          <option value="popular">Most Popular</option>
          <option value="recent">Most Recent</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>
    </div>
  );
}
```

---

## Performance Optimization

### 1. Caching

```typescript
@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getTrendingStories(days: number = 7) {
    const cacheKey = `trending:${days}`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      return cached;
    }

    const trending = await this.fetchTrendingStories(days);

    // Cache for 1 hour
    await this.cacheManager.set(cacheKey, trending, 3600);

    return trending;
  }
}
```

### 2. Debouncing

```typescript
// Frontend
const debouncedSearch = useDebouncedCallback(async (query) => {
  await searchStories(query);
}, 300);
```

### 3. Pagination

```typescript
// Backend
async searchStories(query: string, page: number = 1, limit: number = 20) {
  const offset = (page - 1) * limit;

  const [stories, total] = await Promise.all([
    this.prisma.story.findMany({
      where: searchConditions,
      take: limit,
      skip: offset,
    }),
    this.prisma.story.count({ where: searchConditions }),
  ]);

  return {
    stories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
```

---

## Summary

Search & Discovery features:
- 🔍 **Full-text search** for finding stories
- 🎯 **Filters** for precise discovery
- 🔥 **Trending** shows what's popular
- 💡 **Recommendations** personalized suggestions
- 🔗 **Similar stories** for exploration

Choose the right tech stack based on scale!
