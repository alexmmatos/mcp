// ─── Template types ───────────────────────────────────────────────────────────

export interface TemplateParam {
  name: string
  originalName?: string
  in: 'path' | 'query' | 'body' | 'header'
  required: boolean
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'
  description: string
}

export interface TemplateTool {
  name: string
  description: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  params: TemplateParam[]
}

export interface ApiTemplate {
  id: string
  name: string
  tagline: string
  description: string
  category: string
  color: string
  emoji: string
  baseUrl: string
  auth: {
    type: 'none' | 'bearer' | 'api-key' | 'basic'
    hint: string
    keyName?: string
    keyIn?: 'header' | 'query'
  }
  signupUrl?: string
  docsUrl?: string
  tools: TemplateTool[]
}

// ─── Helper for concise param definitions ─────────────────────────────────────

const p = {
  path: (name: string, type: TemplateParam['type'], description: string, originalName?: string): TemplateParam =>
    ({ name, in: 'path', required: true, type, description, ...(originalName ? { originalName } : {}) }),
  query: (name: string, type: TemplateParam['type'], description: string, required = false, originalName?: string): TemplateParam =>
    ({ name, in: 'query', required, type, description, ...(originalName ? { originalName } : {}) }),
  body: (name: string, type: TemplateParam['type'], description: string, required = false): TemplateParam =>
    ({ name, in: 'body', required, type, description }),
}

// ─── Convert template tool → API payload ──────────────────────────────────────

export function buildToolPayload(tool: TemplateTool, baseUrl: string) {
  const parameterMap = tool.params.map((param) => ({
    toolParamName: param.name,
    source: param.in,
    originalName: param.originalName ?? param.name,
    required: param.required,
  }))

  const properties: Record<string, { type: string; description?: string }> = {}
  const required: string[] = []
  for (const param of tool.params) {
    properties[param.name] = { type: param.type, ...(param.description ? { description: param.description } : {}) }
    if (param.required) required.push(param.name)
  }

  return {
    name: tool.name,
    description: tool.description,
    method: tool.method,
    path: tool.path,
    baseUrl,
    contentType: 'application/json',
    parameterMap,
    inputSchema: { type: 'object', properties, ...(required.length ? { required } : {}) },
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

export const API_TEMPLATES: ApiTemplate[] = [
  // ── JSONPlaceholder ──────────────────────────────────────────────────────────
  {
    id: 'jsonplaceholder',
    name: 'JSONPlaceholder',
    tagline: 'Free fake REST API for testing',
    description: 'A free online REST API ideal for quick prototyping. No setup or credentials needed — great for testing your AI workflow before connecting a real API.',
    category: 'Testing',
    color: '#5D87FF',
    emoji: '🧪',
    baseUrl: 'https://jsonplaceholder.typicode.com',
    auth: { type: 'none', hint: '' },
    docsUrl: 'https://jsonplaceholder.typicode.com',
    tools: [
      { name: 'list_posts', description: 'Get all blog posts. Returns up to 100 posts with id, title, body, and userId.', method: 'GET', path: '/posts', params: [] },
      { name: 'get_post', description: 'Get a specific post by its numeric ID (1–100).', method: 'GET', path: '/posts/{id}', params: [p.path('id', 'integer', 'Post ID (1–100)')] },
      { name: 'create_post', description: 'Create a new post (simulated — returns the data with a new ID but does not persist).', method: 'POST', path: '/posts', params: [p.body('title', 'string', 'Post title', true), p.body('body', 'string', 'Post content', true), p.body('userId', 'integer', 'Author user ID', true)] },
      { name: 'list_users', description: 'Get all users with name, email, address, and company details.', method: 'GET', path: '/users', params: [] },
      { name: 'get_user', description: 'Get a specific user by ID including contact and location details.', method: 'GET', path: '/users/{id}', params: [p.path('id', 'integer', 'User ID (1–10)')] },
      { name: 'list_todos', description: 'Get all to-do items with their completion status.', method: 'GET', path: '/todos', params: [] },
    ],
  },

  // ── OpenWeatherMap ───────────────────────────────────────────────────────────
  {
    id: 'openweathermap',
    name: 'OpenWeatherMap',
    tagline: 'Real-time and forecast weather data',
    description: 'Get current weather, hourly and 5-day forecasts for any city in the world. Requires a free API key.',
    category: 'Data',
    color: '#EB6E4B',
    emoji: '🌤',
    baseUrl: 'https://api.openweathermap.org/data/2.5',
    auth: { type: 'api-key', hint: 'Sign up for a free API key at openweathermap.org.', keyName: 'appid', keyIn: 'query' },
    signupUrl: 'https://home.openweathermap.org/users/sign_up',
    docsUrl: 'https://openweathermap.org/api',
    tools: [
      { name: 'get_current_weather', description: 'Get the current weather for a city. Returns temperature, humidity, wind speed, and conditions.', method: 'GET', path: '/weather', params: [p.query('q', 'string', 'City name, e.g. "London" or "New York,US"', true), p.query('units', 'string', 'Unit system: metric (°C), imperial (°F), or standard (K)')] },
      { name: 'get_forecast', description: 'Get a 5-day weather forecast in 3-hour intervals for a city.', method: 'GET', path: '/forecast', params: [p.query('q', 'string', 'City name, e.g. "Paris,FR"', true), p.query('units', 'string', 'Unit system: metric, imperial, or standard'), p.query('cnt', 'integer', 'Number of timestamps to return (max 40)')] },
      { name: 'get_weather_by_coords', description: 'Get current weather using geographic coordinates (latitude and longitude).', method: 'GET', path: '/weather', params: [p.query('lat', 'number', 'Latitude, e.g. 51.5074', true), p.query('lon', 'number', 'Longitude, e.g. -0.1278', true), p.query('units', 'string', 'Unit system: metric, imperial, or standard')] },
    ],
  },

  // ── GitHub ───────────────────────────────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    tagline: 'Code repositories, issues and pull requests',
    description: 'Search repos, manage issues, check pull requests, and view commit history across any GitHub repository using the official REST API.',
    category: 'Development',
    color: '#24292e',
    emoji: '🐙',
    baseUrl: 'https://api.github.com',
    auth: { type: 'bearer', hint: 'Create a Personal Access Token in your GitHub settings → Developer Settings → Tokens.' },
    signupUrl: 'https://github.com/settings/tokens/new',
    docsUrl: 'https://docs.github.com/en/rest',
    tools: [
      { name: 'search_repositories', description: 'Search GitHub repositories by keyword, language, or stars. Returns name, description, stars, forks, and URL.', method: 'GET', path: '/search/repositories', params: [p.query('q', 'string', 'Search query, e.g. "react stars:>1000 language:typescript"', true), p.query('sort', 'string', 'Sort by: stars, forks, updated, or best-match'), p.query('per_page', 'integer', 'Results per page (max 30)')] },
      { name: 'get_repository', description: 'Get detailed info about a repository: description, language, stars, forks, open issues, and license.', method: 'GET', path: '/repos/{owner}/{repo}', params: [p.path('owner', 'string', 'Repository owner username or org'), p.path('repo', 'string', 'Repository name')] },
      { name: 'list_issues', description: 'List open issues for a repository. Supports filtering by label, assignee, and milestone.', method: 'GET', path: '/repos/{owner}/{repo}/issues', params: [p.path('owner', 'string', 'Repository owner'), p.path('repo', 'string', 'Repository name'), p.query('state', 'string', 'Issue state: open, closed, or all'), p.query('labels', 'string', 'Comma-separated label names, e.g. "bug,help wanted"'), p.query('per_page', 'integer', 'Results per page (max 100)')] },
      { name: 'create_issue', description: 'Open a new issue in a repository.', method: 'POST', path: '/repos/{owner}/{repo}/issues', params: [p.path('owner', 'string', 'Repository owner'), p.path('repo', 'string', 'Repository name'), p.body('title', 'string', 'Issue title', true), p.body('body', 'string', 'Issue description in Markdown'), p.body('labels', 'array', 'Array of label names, e.g. ["bug", "urgent"]')] },
      { name: 'list_pull_requests', description: 'List pull requests for a repository with their title, status, author, and branch info.', method: 'GET', path: '/repos/{owner}/{repo}/pulls', params: [p.path('owner', 'string', 'Repository owner'), p.path('repo', 'string', 'Repository name'), p.query('state', 'string', 'PR state: open, closed, or all'), p.query('per_page', 'integer', 'Results per page (max 100)')] },
      { name: 'get_user', description: 'Get a GitHub user\'s public profile: bio, company, location, followers, and public repo count.', method: 'GET', path: '/users/{username}', params: [p.path('username', 'string', 'GitHub username')] },
    ],
  },

  // ── Spotify ──────────────────────────────────────────────────────────────────
  {
    id: 'spotify',
    name: 'Spotify',
    tagline: 'Music search, playlists and playback',
    description: 'Search for tracks, albums, and artists; browse playlists; and explore the Spotify catalogue using the official Web API.',
    category: 'Music & Media',
    color: '#1DB954',
    emoji: '🎵',
    baseUrl: 'https://api.spotify.com/v1',
    auth: { type: 'bearer', hint: 'Get an OAuth2 access token from the Spotify Developer Dashboard.' },
    signupUrl: 'https://developer.spotify.com/dashboard',
    docsUrl: 'https://developer.spotify.com/documentation/web-api',
    tools: [
      { name: 'search', description: 'Search for tracks, albums, artists, or playlists. Returns the top matches for each type.', method: 'GET', path: '/search', params: [p.query('q', 'string', 'Search query, e.g. "Taylor Swift" or "year:2024 genre:pop"', true), p.query('type', 'string', 'Comma-separated types: track, album, artist, playlist', true), p.query('limit', 'integer', 'Number of results per type (max 50)')] },
      { name: 'get_track', description: 'Get detailed information about a track: name, artists, album, duration, and popularity.', method: 'GET', path: '/tracks/{id}', params: [p.path('id', 'string', 'Spotify track ID, e.g. 4iV5W9uYEdYUVa79Axb7Rh')] },
      { name: 'get_album', description: 'Get an album\'s details including all tracks, release date, artists, and cover art URL.', method: 'GET', path: '/albums/{id}', params: [p.path('id', 'string', 'Spotify album ID')] },
      { name: 'get_artist', description: 'Get an artist\'s profile: name, genres, follower count, and popularity score.', method: 'GET', path: '/artists/{id}', params: [p.path('id', 'string', 'Spotify artist ID')] },
      { name: 'get_artist_top_tracks', description: 'Get the top 10 tracks for an artist in a given country.', method: 'GET', path: '/artists/{id}/top-tracks', params: [p.path('id', 'string', 'Spotify artist ID'), p.query('market', 'string', 'ISO 3166-1 alpha-2 country code, e.g. US or BR', true)] },
      { name: 'get_playlist', description: 'Get a playlist\'s details and its tracks with artist and duration info.', method: 'GET', path: '/playlists/{playlist_id}', params: [p.path('playlist_id', 'string', 'Spotify playlist ID', 'playlist_id')] },
    ],
  },

  // ── TMDB ─────────────────────────────────────────────────────────────────────
  {
    id: 'tmdb',
    name: 'The Movie Database',
    tagline: 'Movies, TV shows and cast info',
    description: 'Comprehensive movie and TV show database. Search titles, get cast and crew, check ratings, and browse trending content.',
    category: 'Music & Media',
    color: '#01B4E4',
    emoji: '🎬',
    baseUrl: 'https://api.themoviedb.org/3',
    auth: { type: 'bearer', hint: 'Create a free account and generate an API Read Access Token in your account settings.' },
    signupUrl: 'https://www.themoviedb.org/signup',
    docsUrl: 'https://developer.themoviedb.org/docs',
    tools: [
      { name: 'search_movies', description: 'Search for movies by title. Returns name, release year, rating, and overview.', method: 'GET', path: '/search/movie', params: [p.query('query', 'string', 'Movie title to search for', true), p.query('year', 'integer', 'Filter results by release year'), p.query('page', 'integer', 'Page number (default 1)')] },
      { name: 'get_movie', description: 'Get full details for a movie: synopsis, runtime, genres, rating, budget, revenue, and tagline.', method: 'GET', path: '/movie/{movie_id}', params: [p.path('movie_id', 'integer', 'TMDB movie ID', 'movie_id')] },
      { name: 'get_movie_credits', description: 'Get the cast and crew for a movie.', method: 'GET', path: '/movie/{movie_id}/credits', params: [p.path('movie_id', 'integer', 'TMDB movie ID', 'movie_id')] },
      { name: 'get_trending', description: 'Get the trending movies or TV shows for today or this week.', method: 'GET', path: '/trending/{media_type}/{time_window}', params: [p.path('media_type', 'string', 'Type of media: movie, tv, or all'), p.path('time_window', 'string', 'Time window: day or week')] },
      { name: 'search_tv', description: 'Search for TV shows by name. Returns title, first air date, rating, and overview.', method: 'GET', path: '/search/tv', params: [p.query('query', 'string', 'TV show name to search for', true), p.query('page', 'integer', 'Page number (default 1)')] },
    ],
  },

  // ── OpenAI ───────────────────────────────────────────────────────────────────
  {
    id: 'openai',
    name: 'OpenAI',
    tagline: 'GPT models, images and embeddings',
    description: 'Access OpenAI\'s language models to generate text, answer questions, and create embeddings — all via the official REST API.',
    category: 'AI',
    color: '#10A37F',
    emoji: '🤖',
    baseUrl: 'https://api.openai.com/v1',
    auth: { type: 'bearer', hint: 'Create an API key in your OpenAI account settings.' },
    signupUrl: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs',
    tools: [
      { name: 'chat_completion', description: 'Send a message to a GPT model and get a response. Supports system prompts and conversation history.', method: 'POST', path: '/chat/completions', params: [p.body('model', 'string', 'Model ID, e.g. gpt-4o, gpt-4o-mini, or gpt-3.5-turbo', true), p.body('messages', 'array', 'Array of message objects: [{role: "user"|"assistant"|"system", content: "..."}]', true), p.body('temperature', 'number', 'Randomness (0–2). Lower = more deterministic'), p.body('max_tokens', 'integer', 'Maximum tokens in the response')] },
      { name: 'list_models', description: 'List all available OpenAI models with their IDs and creation dates.', method: 'GET', path: '/models', params: [] },
      { name: 'create_embedding', description: 'Convert text into a numerical vector (embedding) useful for semantic search and similarity.', method: 'POST', path: '/embeddings', params: [p.body('model', 'string', 'Embedding model, e.g. text-embedding-3-small', true), p.body('input', 'string', 'Text to convert to an embedding', true)] },
    ],
  },

  // ── PokéAPI ──────────────────────────────────────────────────────────────────
  {
    id: 'pokeapi',
    name: 'PokéAPI',
    tagline: 'Complete Pokémon game database',
    description: 'A free, open Pokémon data API. No authentication required. Great for demos and AI experiments with structured data.',
    category: 'Testing',
    color: '#EE8130',
    emoji: '⚡',
    baseUrl: 'https://pokeapi.co/api/v2',
    auth: { type: 'none', hint: '' },
    docsUrl: 'https://pokeapi.co/docs/v2',
    tools: [
      { name: 'get_pokemon', description: 'Get a Pokémon\'s stats, abilities, types, and moves by name or ID.', method: 'GET', path: '/pokemon/{name_or_id}', params: [p.path('name_or_id', 'string', 'Pokémon name (e.g. pikachu) or Pokédex number (e.g. 25)', 'name_or_id')] },
      { name: 'list_pokemon', description: 'Get a paginated list of all Pokémon names and their API URLs.', method: 'GET', path: '/pokemon', params: [p.query('limit', 'integer', 'Number of results (default 20, max 100000)'), p.query('offset', 'integer', 'Number of results to skip')] },
      { name: 'get_type', description: 'Get all damage relations for a Pokémon type (e.g. fire is weak against water).', method: 'GET', path: '/type/{name_or_id}', params: [p.path('name_or_id', 'string', 'Type name (e.g. fire, water, electric) or ID', 'name_or_id')] },
      { name: 'get_ability', description: 'Get the description and affected Pokémon for a specific ability.', method: 'GET', path: '/ability/{name_or_id}', params: [p.path('name_or_id', 'string', 'Ability name (e.g. blaze) or ID', 'name_or_id')] },
    ],
  },

  // ── CoinGecko ────────────────────────────────────────────────────────────────
  {
    id: 'coingecko',
    name: 'CoinGecko',
    tagline: 'Crypto prices and market data',
    description: 'Real-time cryptocurrency prices, market capitalization, and historical data. Free tier available with no authentication.',
    category: 'Data',
    color: '#8DC63F',
    emoji: '🪙',
    baseUrl: 'https://api.coingecko.com/api/v3',
    auth: { type: 'none', hint: '' },
    signupUrl: 'https://www.coingecko.com/en/api',
    docsUrl: 'https://www.coingecko.com/api/documentations/v3',
    tools: [
      { name: 'get_price', description: 'Get the current price of one or more coins in any currency.', method: 'GET', path: '/simple/price', params: [p.query('ids', 'string', 'Coin IDs, e.g. "bitcoin,ethereum,solana"', true), p.query('vs_currencies', 'string', 'Target currencies, e.g. "usd,eur,brl"', true), p.query('include_24hr_change', 'boolean', 'Include 24-hour price change percentage')] },
      { name: 'get_coin_details', description: 'Get full details for a coin: description, market data, ATH, and social links.', method: 'GET', path: '/coins/{id}', params: [p.path('id', 'string', 'Coin ID, e.g. bitcoin, ethereum, cardano')] },
      { name: 'get_market_chart', description: 'Get historical price, market cap, and volume data for a coin.', method: 'GET', path: '/coins/{id}/market_chart', params: [p.path('id', 'string', 'Coin ID, e.g. bitcoin'), p.query('vs_currency', 'string', 'Target currency, e.g. usd', true), p.query('days', 'string', 'Number of days: 1, 7, 14, 30, 90, 180, 365, or max', true)] },
      { name: 'list_coins', description: 'Get the full list of supported coins with their IDs, symbols, and names.', method: 'GET', path: '/coins/list', params: [] },
    ],
  },

  // ── HubSpot ──────────────────────────────────────────────────────────────────
  {
    id: 'hubspot',
    name: 'HubSpot',
    tagline: 'CRM contacts, deals and companies',
    description: 'Search and manage contacts, deals, and companies in HubSpot CRM. Requires a Private App token from your HubSpot account.',
    category: 'Business',
    color: '#FF7A59',
    emoji: '🧡',
    baseUrl: 'https://api.hubapi.com/crm/v3',
    auth: { type: 'bearer', hint: 'Create a Private App token in Settings → Integrations → Private Apps.' },
    signupUrl: 'https://app.hubspot.com/signup',
    docsUrl: 'https://developers.hubspot.com/docs/api/crm/contacts',
    tools: [
      { name: 'search_contacts', description: 'Search CRM contacts by name, email, or company. Returns contact details and properties.', method: 'POST', path: '/objects/contacts/search', params: [p.body('query', 'string', 'Search term, e.g. name or email address'), p.body('limit', 'integer', 'Number of results (max 100)'), p.body('properties', 'array', 'List of property names to include, e.g. ["firstname","email","phone"]')] },
      { name: 'get_contact', description: 'Get a contact by their HubSpot ID with all stored properties.', method: 'GET', path: '/objects/contacts/{contactId}', params: [p.path('contactId', 'string', 'HubSpot contact ID'), p.query('properties', 'string', 'Comma-separated list of properties to return')] },
      { name: 'create_contact', description: 'Create a new contact in HubSpot CRM.', method: 'POST', path: '/objects/contacts', params: [p.body('properties', 'object', 'Contact properties as an object, e.g. {"firstname":"Ana","email":"ana@co.com","phone":"123"}', true)] },
      { name: 'search_deals', description: 'Search open or closed deals by name, stage, or owner.', method: 'POST', path: '/objects/deals/search', params: [p.body('query', 'string', 'Search term'), p.body('limit', 'integer', 'Number of results (max 100)'), p.body('properties', 'array', 'Properties to include, e.g. ["dealname","amount","dealstage"]')] },
      { name: 'create_deal', description: 'Create a new deal in the CRM pipeline.', method: 'POST', path: '/objects/deals', params: [p.body('properties', 'object', 'Deal properties, e.g. {"dealname":"New deal","amount":"5000","dealstage":"appointmentscheduled"}', true)] },
    ],
  },

  // ── Notion ───────────────────────────────────────────────────────────────────
  {
    id: 'notion',
    name: 'Notion',
    tagline: 'Pages, databases and workspace search',
    description: 'Search your Notion workspace, read and create pages, and query databases programmatically using the Notion API.',
    category: 'Business',
    color: '#000000',
    emoji: '📓',
    baseUrl: 'https://api.notion.com/v1',
    auth: { type: 'bearer', hint: 'Create an integration at notion.so/my-integrations and share your pages with it.' },
    signupUrl: 'https://www.notion.so/my-integrations',
    docsUrl: 'https://developers.notion.com',
    tools: [
      { name: 'search', description: 'Search across pages and databases in your Notion workspace by title or content.', method: 'POST', path: '/search', params: [p.body('query', 'string', 'Search term'), p.body('filter', 'object', 'Filter by type: {"value":"page","property":"object"} or {"value":"database","property":"object"}'), p.body('page_size', 'integer', 'Number of results (max 100)')] },
      { name: 'get_page', description: 'Get a Notion page\'s properties and metadata by its ID.', method: 'GET', path: '/pages/{page_id}', params: [p.path('page_id', 'string', 'Notion page ID (32-character UUID from the page URL)', 'page_id')] },
      { name: 'create_page', description: 'Create a new page inside a parent page or database.', method: 'POST', path: '/pages', params: [p.body('parent', 'object', 'Parent container, e.g. {"page_id":"<id>"} or {"database_id":"<id>"}', true), p.body('properties', 'object', 'Page properties. For a basic page: {"title":[{"text":{"content":"Page title"}}]}', true)] },
      { name: 'query_database', description: 'Query a Notion database with optional filters and sorting.', method: 'POST', path: '/databases/{database_id}/query', params: [p.path('database_id', 'string', 'Notion database ID', 'database_id'), p.body('filter', 'object', 'Filter conditions'), p.body('sorts', 'array', 'Sort order, e.g. [{"property":"Name","direction":"ascending"}]'), p.body('page_size', 'integer', 'Results per page (max 100)')] },
    ],
  },

  // ── Slack ─────────────────────────────────────────────────────────────────────
  {
    id: 'slack',
    name: 'Slack',
    tagline: 'Messages, channels and users',
    description: 'Post messages, read channel history, list members, and search across your Slack workspace using a Bot Token.',
    category: 'Communication',
    color: '#4A154B',
    emoji: '💬',
    baseUrl: 'https://slack.com/api',
    auth: { type: 'bearer', hint: 'Create a Slack App and install it to your workspace to get a Bot Token (xoxb-...).' },
    signupUrl: 'https://api.slack.com/apps/new',
    docsUrl: 'https://api.slack.com/methods',
    tools: [
      { name: 'post_message', description: 'Send a message to a Slack channel or direct message.', method: 'POST', path: '/chat.postMessage', params: [p.body('channel', 'string', 'Channel ID or name, e.g. #general or C01234567', true), p.body('text', 'string', 'Message text (supports Slack markdown: *bold*, _italic_, `code`)', true), p.body('thread_ts', 'string', 'Timestamp of a parent message to reply in a thread')] },
      { name: 'list_channels', description: 'List public channels in the workspace with their name, topic, member count, and ID.', method: 'GET', path: '/conversations.list', params: [p.query('types', 'string', 'Channel types: public_channel, private_channel, im, mpim'), p.query('limit', 'integer', 'Number of results (max 1000)')] },
      { name: 'get_channel_history', description: 'Get recent messages from a channel, including replies count and reactions.', method: 'GET', path: '/conversations.history', params: [p.query('channel', 'string', 'Channel ID, e.g. C01234567', true), p.query('limit', 'integer', 'Number of messages (max 999)'), p.query('oldest', 'string', 'Oldest message timestamp to include')] },
      { name: 'list_users', description: 'Get all members of the Slack workspace with their display name, email, and role.', method: 'GET', path: '/users.list', params: [p.query('limit', 'integer', 'Number of results per page (max 200)')] },
    ],
  },

  // ── Stripe ───────────────────────────────────────────────────────────────────
  {
    id: 'stripe',
    name: 'Stripe',
    tagline: 'Payments, customers and invoices',
    description: 'Access your Stripe account to look up customers, list payments and charges, and retrieve invoice data using the Stripe REST API.',
    category: 'Business',
    color: '#635BFF',
    emoji: '💳',
    baseUrl: 'https://api.stripe.com/v1',
    auth: { type: 'bearer', hint: 'Use your Stripe Secret Key (sk_live_... or sk_test_...) from the Stripe Dashboard → Developers → API Keys.' },
    signupUrl: 'https://dashboard.stripe.com/register',
    docsUrl: 'https://stripe.com/docs/api',
    tools: [
      { name: 'list_customers', description: 'List Stripe customers. Returns email, name, creation date, and balance.', method: 'GET', path: '/customers', params: [p.query('limit', 'integer', 'Number of customers (max 100)'), p.query('email', 'string', 'Filter by exact email address')] },
      { name: 'get_customer', description: 'Get a specific customer\'s profile, balance, and metadata.', method: 'GET', path: '/customers/{id}', params: [p.path('id', 'string', 'Stripe customer ID, e.g. cus_ABC123')] },
      { name: 'list_payment_intents', description: 'List recent payment intents with their amount, currency, status, and creation date.', method: 'GET', path: '/payment_intents', params: [p.query('limit', 'integer', 'Number of results (max 100)'), p.query('customer', 'string', 'Filter by customer ID')] },
      { name: 'list_invoices', description: 'List invoices for your account or a specific customer.', method: 'GET', path: '/invoices', params: [p.query('customer', 'string', 'Stripe customer ID to filter by'), p.query('status', 'string', 'Invoice status: draft, open, paid, void, or uncollectible'), p.query('limit', 'integer', 'Number of results (max 100)')] },
      { name: 'get_balance', description: 'Get the current balance of your Stripe account including available and pending amounts.', method: 'GET', path: '/balance', params: [] },
    ],
  },

  // ── Airtable ─────────────────────────────────────────────────────────────────
  {
    id: 'airtable',
    name: 'Airtable',
    tagline: 'Flexible database for teams',
    description: 'Read and write records in any Airtable base. Used by PM teams worldwide to track roadmaps, content calendars, sprints, and customer data.',
    category: 'Business',
    color: '#2D7FF9',
    emoji: '🗄️',
    baseUrl: 'https://api.airtable.com/v0',
    auth: { type: 'bearer', hint: 'Create a Personal Access Token in your Airtable account under Account → Developer Hub.' },
    signupUrl: 'https://airtable.com/create/tokens',
    docsUrl: 'https://airtable.com/developers/web/api/introduction',
    tools: [
      { name: 'list_records', description: 'List records from a table in your Airtable base. Supports filtering and sorting.', method: 'GET', path: '/{baseId}/{tableId}', params: [p.path('baseId', 'string', 'Base ID from the Airtable URL, e.g. appXXXXXXXXXXXXXX'), p.path('tableId', 'string', 'Table name or ID, e.g. "Tasks" or tblXXXXXXXX'), p.query('maxRecords', 'integer', 'Max number of records to return'), p.query('filterByFormula', 'string', 'Airtable formula to filter, e.g. {Status}="Done"'), p.query('view', 'string', 'View name or ID to use for ordering and filters')] },
      { name: 'get_record', description: 'Get a single record by its ID from an Airtable table.', method: 'GET', path: '/{baseId}/{tableId}/{recordId}', params: [p.path('baseId', 'string', 'Base ID from the Airtable URL'), p.path('tableId', 'string', 'Table name or ID'), p.path('recordId', 'string', 'Record ID starting with "rec", e.g. recXXXXXXXX')] },
      { name: 'create_record', description: 'Create a new record in an Airtable table.', method: 'POST', path: '/{baseId}/{tableId}', params: [p.path('baseId', 'string', 'Base ID from the Airtable URL'), p.path('tableId', 'string', 'Table name or ID'), p.body('fields', 'object', 'Record fields matching your column names, e.g. {"Name":"Task A","Status":"To do","Priority":"High"}', true)] },
      { name: 'update_record', description: 'Update one or more fields of an existing record. Only the specified fields are changed.', method: 'PATCH', path: '/{baseId}/{tableId}/{recordId}', params: [p.path('baseId', 'string', 'Base ID from the Airtable URL'), p.path('tableId', 'string', 'Table name or ID'), p.path('recordId', 'string', 'Record ID starting with "rec"'), p.body('fields', 'object', 'Fields to update, e.g. {"Status":"Done","Notes":"Reviewed"}', true)] },
      { name: 'delete_record', description: 'Permanently delete a record from an Airtable table.', method: 'DELETE', path: '/{baseId}/{tableId}/{recordId}', params: [p.path('baseId', 'string', 'Base ID from the Airtable URL'), p.path('tableId', 'string', 'Table name or ID'), p.path('recordId', 'string', 'Record ID to delete')] },
    ],
  },

  // ── Asana ─────────────────────────────────────────────────────────────────────
  {
    id: 'asana',
    name: 'Asana',
    tagline: 'Tasks, projects and team workflows',
    description: 'Manage tasks and projects across your team. List work items, track progress, create tasks, and update statuses — all from your AI assistant.',
    category: 'Business',
    color: '#FC636B',
    emoji: '✅',
    baseUrl: 'https://app.asana.com/api/1.0',
    auth: { type: 'bearer', hint: 'Create a Personal Access Token in Profile Settings → Apps → Manage Developer Apps.' },
    signupUrl: 'https://app.asana.com/0/developer-console',
    docsUrl: 'https://developers.asana.com/docs',
    tools: [
      { name: 'list_projects', description: 'List projects in your Asana workspace with their names, status, and due dates.', method: 'GET', path: '/projects', params: [p.query('workspace', 'string', 'Workspace GID to list projects from'), p.query('archived', 'boolean', 'Include archived projects (default: false)'), p.query('opt_fields', 'string', 'Comma-separated fields, e.g. name,notes,due_date,status,team')] },
      { name: 'get_project', description: 'Get full details for a specific project: description, status, due date, and team.', method: 'GET', path: '/projects/{project_gid}', params: [p.path('project_gid', 'string', 'Project GID from the Asana URL'), p.query('opt_fields', 'string', 'Extra fields to include, e.g. name,notes,due_date,team,members')] },
      { name: 'list_tasks', description: 'List tasks in a project with assignee, due date, and completion status.', method: 'GET', path: '/tasks', params: [p.query('project', 'string', 'Project GID to list tasks from', true), p.query('completed_since', 'string', 'Use "now" to return only incomplete tasks, or an ISO date for tasks completed after that date'), p.query('opt_fields', 'string', 'Fields to return, e.g. name,assignee,due_on,completed,notes')] },
      { name: 'create_task', description: 'Create a new task in Asana and assign it to a project or person.', method: 'POST', path: '/tasks', params: [p.body('data', 'object', 'Task data, e.g. {"name":"Review PRD","notes":"Check section 3","due_on":"2025-12-31","projects":["<gid>"],"assignee":"me"}', true)] },
      { name: 'update_task', description: 'Update an existing task: rename it, change its due date, assignee, or mark it complete.', method: 'PUT', path: '/tasks/{task_gid}', params: [p.path('task_gid', 'string', 'Task GID from list_tasks or the Asana URL'), p.body('data', 'object', 'Fields to update, e.g. {"completed":true} or {"due_on":"2025-12-31","assignee":"me"}', true)] },
    ],
  },

  // ── Zendesk ───────────────────────────────────────────────────────────────────
  {
    id: 'zendesk',
    name: 'Zendesk',
    tagline: 'Customer support tickets and agents',
    description: 'Look up and create support tickets, search customers, and read agent activity. After creating, update the base URL in Settings to your own Zendesk subdomain.',
    category: 'Business',
    color: '#03363D',
    emoji: '🎫',
    baseUrl: 'https://your-domain.zendesk.com/api/v2',
    auth: { type: 'bearer', hint: 'Generate an OAuth token in Admin Center → Apps → OAuth Clients, or use an API Token via Basic Auth (email/token:API_TOKEN) configured after creation.' },
    signupUrl: 'https://www.zendesk.com/register/',
    docsUrl: 'https://developer.zendesk.com/api-reference',
    tools: [
      { name: 'list_tickets', description: 'List recent support tickets with their subject, status, priority, and requester.', method: 'GET', path: '/tickets.json', params: [p.query('sort_by', 'string', 'Sort field: created_at, updated_at, priority, or status'), p.query('sort_order', 'string', 'Sort direction: asc or desc'), p.query('per_page', 'integer', 'Results per page (max 100)')] },
      { name: 'get_ticket', description: 'Get all details for a specific ticket: description, status, assignee, and conversation history.', method: 'GET', path: '/tickets/{id}.json', params: [p.path('id', 'integer', 'Ticket ID number')] },
      { name: 'create_ticket', description: 'Open a new support ticket on behalf of a customer.', method: 'POST', path: '/tickets.json', params: [p.body('ticket', 'object', 'Ticket data, e.g. {"subject":"Login issue","comment":{"body":"User cannot log in"},"priority":"high","tags":["login","urgent"]}', true)] },
      { name: 'search_tickets', description: 'Search across tickets, users, and organizations using Zendesk query syntax.', method: 'GET', path: '/search.json', params: [p.query('query', 'string', 'Search query, e.g. "status:open type:ticket priority:high"', true), p.query('sort_by', 'string', 'Sort by: created_at, updated_at, or score'), p.query('per_page', 'integer', 'Results per page (max 100)')] },
      { name: 'list_users', description: 'List Zendesk users (agents and customers) with their name, email, and role.', method: 'GET', path: '/users.json', params: [p.query('role', 'string', 'Filter by role: end-user, agent, or admin'), p.query('per_page', 'integer', 'Results per page (max 100)')] },
    ],
  },

  // ── SendGrid ──────────────────────────────────────────────────────────────────
  {
    id: 'sendgrid',
    name: 'SendGrid',
    tagline: 'Transactional and marketing email',
    description: 'Send individual emails, check delivery stats, manage suppression lists, and browse your email templates via the SendGrid Web API.',
    category: 'Communication',
    color: '#1A82E2',
    emoji: '📧',
    baseUrl: 'https://api.sendgrid.com/v3',
    auth: { type: 'bearer', hint: 'Create an API Key in your SendGrid account under Settings → API Keys.' },
    signupUrl: 'https://signup.sendgrid.com/',
    docsUrl: 'https://docs.sendgrid.com/api-reference',
    tools: [
      { name: 'send_email', description: 'Send a transactional email to one or more recipients.', method: 'POST', path: '/mail/send', params: [p.body('personalizations', 'array', 'Recipient list, e.g. [{"to":[{"email":"user@example.com"}]}]', true), p.body('from', 'object', 'Sender, e.g. {"email":"noreply@yourco.com","name":"Your Company"}', true), p.body('subject', 'string', 'Email subject line', true), p.body('content', 'array', 'Body content, e.g. [{"type":"text/plain","value":"Hello!"}]', true)] },
      { name: 'get_stats', description: 'Get email delivery statistics (delivered, opens, clicks, bounces) for a date range.', method: 'GET', path: '/stats', params: [p.query('start_date', 'string', 'Start date in YYYY-MM-DD format', true), p.query('end_date', 'string', 'End date in YYYY-MM-DD format'), p.query('aggregated_by', 'string', 'Group by: day, week, or month')] },
      { name: 'list_templates', description: 'List all dynamic email templates in your SendGrid account.', method: 'GET', path: '/templates', params: [p.query('generations', 'string', 'Template version: legacy or dynamic'), p.query('page_size', 'integer', 'Results per page (max 200)')] },
      { name: 'list_bounces', description: 'List email addresses that have bounced and should not be emailed again.', method: 'GET', path: '/suppression/bounces', params: [p.query('start_time', 'integer', 'Start timestamp (Unix epoch)'), p.query('end_time', 'integer', 'End timestamp (Unix epoch)'), p.query('limit', 'integer', 'Number of results (max 500)')] },
    ],
  },

  // ── Discord ───────────────────────────────────────────────────────────────────
  {
    id: 'discord',
    name: 'Discord',
    tagline: 'Servers, channels and community messages',
    description: 'Read and post messages in Discord servers, list channels, and look up server and user information using a Discord Bot Token.',
    category: 'Communication',
    color: '#5865F2',
    emoji: '🎮',
    baseUrl: 'https://discord.com/api/v10',
    auth: { type: 'bearer', hint: 'Create a Bot at discord.com/developers/applications, enable it under "Bot", and copy the Token. Invite the bot to your server before using.' },
    signupUrl: 'https://discord.com/developers/applications',
    docsUrl: 'https://discord.com/developers/docs/reference',
    tools: [
      { name: 'get_guild', description: 'Get information about a Discord server (guild): name, member count, roles, and icon.', method: 'GET', path: '/guilds/{guild_id}', params: [p.path('guild_id', 'string', 'Guild (server) ID — enable Developer Mode to copy it')] },
      { name: 'list_channels', description: 'List all channels in a Discord server with their names, topics, and types.', method: 'GET', path: '/guilds/{guild_id}/channels', params: [p.path('guild_id', 'string', 'Guild (server) ID')] },
      { name: 'get_messages', description: 'Fetch recent messages from a Discord channel.', method: 'GET', path: '/channels/{channel_id}/messages', params: [p.path('channel_id', 'string', 'Channel ID — right-click a channel and Copy Channel ID'), p.query('limit', 'integer', 'Number of messages to fetch (max 100)'), p.query('before', 'string', 'Get messages before this message ID')] },
      { name: 'send_message', description: 'Post a message to a Discord channel.', method: 'POST', path: '/channels/{channel_id}/messages', params: [p.path('channel_id', 'string', 'Channel ID to post to'), p.body('content', 'string', 'Message text (supports Discord markdown: **bold**, *italic*, `code`)', true), p.body('tts', 'boolean', 'Send as text-to-speech message')] },
      { name: 'get_guild_members', description: 'List members of a Discord server with their usernames and roles.', method: 'GET', path: '/guilds/{guild_id}/members', params: [p.path('guild_id', 'string', 'Guild (server) ID'), p.query('limit', 'integer', 'Number of members to return (max 1000)')] },
    ],
  },

  // ── NewsAPI ───────────────────────────────────────────────────────────────────
  {
    id: 'newsapi',
    name: 'NewsAPI',
    tagline: 'Top headlines and news search',
    description: 'Search millions of news articles from thousands of sources worldwide. Great for competitive intelligence, market research, and staying on top of industry news.',
    category: 'Data',
    color: '#E64C13',
    emoji: '📰',
    baseUrl: 'https://newsapi.org/v2',
    auth: { type: 'api-key', hint: 'Sign up for a free API key at newsapi.org. The free tier supports 100 requests/day.', keyName: 'X-Api-Key', keyIn: 'header' },
    signupUrl: 'https://newsapi.org/register',
    docsUrl: 'https://newsapi.org/docs',
    tools: [
      { name: 'get_top_headlines', description: 'Get the latest top headlines by country, category, or keyword.', method: 'GET', path: '/top-headlines', params: [p.query('country', 'string', '2-letter ISO country code, e.g. us, br, gb, fr, de'), p.query('category', 'string', 'News category: business, entertainment, health, science, sports, technology'), p.query('q', 'string', 'Keywords to filter headlines'), p.query('pageSize', 'integer', 'Number of articles (max 100)')] },
      { name: 'search_news', description: 'Search all news articles by keyword, source, date range, and language.', method: 'GET', path: '/everything', params: [p.query('q', 'string', 'Search query — supports AND, OR, NOT and exact phrases in quotes', true), p.query('from', 'string', 'Start date in YYYY-MM-DD format'), p.query('to', 'string', 'End date in YYYY-MM-DD format'), p.query('language', 'string', 'Language code: en, pt, es, fr, de, it, nl, no, ru, se, ud, zh'), p.query('sortBy', 'string', 'Sort by: relevancy, popularity, or publishedAt'), p.query('pageSize', 'integer', 'Number of articles (max 100)')] },
      { name: 'get_sources', description: 'Get the list of news sources available, filterable by category, language, and country.', method: 'GET', path: '/top-headlines/sources', params: [p.query('category', 'string', 'Category: business, entertainment, health, science, sports, technology'), p.query('language', 'string', 'Language code: en, pt, es, fr, de'), p.query('country', 'string', '2-letter country code')] },
    ],
  },

  // ── Wikipedia ─────────────────────────────────────────────────────────────────
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    tagline: 'Search and read encyclopedia articles',
    description: 'Instantly look up summaries, definitions, and facts from Wikipedia. No authentication required. Great for giving your AI access to world knowledge.',
    category: 'Data',
    color: '#000000',
    emoji: '📚',
    baseUrl: 'https://en.wikipedia.org/api/rest_v1',
    auth: { type: 'none', hint: '' },
    docsUrl: 'https://en.wikipedia.org/api/rest_v1/#/',
    tools: [
      { name: 'get_article_summary', description: 'Get a plain-text summary of a Wikipedia article — the first paragraph with key facts.', method: 'GET', path: '/page/summary/{title}', params: [p.path('title', 'string', 'Article title as it appears in the Wikipedia URL, e.g. Artificial_intelligence or React_(JavaScript_library)')] },
      { name: 'get_page_content', description: 'Get the full HTML content of a Wikipedia article.', method: 'GET', path: '/page/html/{title}', params: [p.path('title', 'string', 'Article title as in the Wikipedia URL')] },
      { name: 'get_featured_content', description: 'Get today\'s featured article, image of the day, and most-read articles on Wikipedia.', method: 'GET', path: '/feed/featured/{year}/{month}/{day}', params: [p.path('year', 'string', 'Year, e.g. 2025'), p.path('month', 'string', 'Month as 2 digits, e.g. 06'), p.path('day', 'string', 'Day as 2 digits, e.g. 15')] },
      { name: 'get_on_this_day', description: 'Get historical events, births, and deaths that happened on a specific day in history.', method: 'GET', path: '/feed/onthisday/all/{month}/{day}', params: [p.path('month', 'string', 'Month as 2 digits, e.g. 06'), p.path('day', 'string', 'Day as 2 digits, e.g. 28')] },
    ],
  },

  // ── Open-Meteo ────────────────────────────────────────────────────────────────
  {
    id: 'open-meteo',
    name: 'Open-Meteo',
    tagline: 'Free weather forecasts, no API key',
    description: 'High-accuracy weather forecasts and historical climate data for any location using latitude and longitude. Completely free and open-source — no registration or API key required.',
    category: 'Data',
    color: '#00B0FF',
    emoji: '⛅',
    baseUrl: 'https://api.open-meteo.com/v1',
    auth: { type: 'none', hint: '' },
    docsUrl: 'https://open-meteo.com/en/docs',
    tools: [
      { name: 'get_current_weather', description: 'Get the current weather conditions for a location using latitude and longitude.', method: 'GET', path: '/forecast', params: [p.query('latitude', 'number', 'Location latitude, e.g. -23.5505 for São Paulo', true), p.query('longitude', 'number', 'Location longitude, e.g. -46.6333 for São Paulo', true), p.query('current', 'string', 'Comma-separated variables: temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature', true), p.query('timezone', 'string', 'Timezone, e.g. America/Sao_Paulo or auto')] },
      { name: 'get_forecast', description: 'Get a multi-day weather forecast with daily high/low temperatures and precipitation.', method: 'GET', path: '/forecast', params: [p.query('latitude', 'number', 'Location latitude', true), p.query('longitude', 'number', 'Location longitude', true), p.query('daily', 'string', 'Daily variables: temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code', true), p.query('forecast_days', 'integer', 'Number of forecast days (1–16, default 7)'), p.query('timezone', 'string', 'Timezone, e.g. America/New_York or auto')] },
      { name: 'get_historical_weather', description: 'Get historical weather data for any location and date range back to 1940.', method: 'GET', path: '/archive', params: [p.query('latitude', 'number', 'Location latitude', true), p.query('longitude', 'number', 'Location longitude', true), p.query('start_date', 'string', 'Start date in YYYY-MM-DD format', true), p.query('end_date', 'string', 'End date in YYYY-MM-DD format', true), p.query('daily', 'string', 'Daily variables to return, e.g. temperature_2m_max,temperature_2m_min,precipitation_sum', true)] },
    ],
  },

  // ── YouTube Data API ──────────────────────────────────────────────────────────
  {
    id: 'youtube',
    name: 'YouTube',
    tagline: 'Video search, channels and statistics',
    description: 'Search YouTube videos and channels, retrieve video statistics (views, likes, comments), and explore content from any creator using the official YouTube Data API.',
    category: 'Music & Media',
    color: '#FF0000',
    emoji: '▶️',
    baseUrl: 'https://www.googleapis.com/youtube/v3',
    auth: { type: 'api-key', hint: 'Create an API key at Google Cloud Console → APIs & Services → Credentials. Enable the YouTube Data API v3 on your project.', keyName: 'key', keyIn: 'query' },
    signupUrl: 'https://console.cloud.google.com/',
    docsUrl: 'https://developers.google.com/youtube/v3/docs',
    tools: [
      { name: 'search_videos', description: 'Search YouTube for videos matching a keyword. Returns title, channel, and publication date.', method: 'GET', path: '/search', params: [p.query('q', 'string', 'Search query, e.g. "product management tutorial 2024"', true), p.query('part', 'string', 'Response parts (required): snippet', true), p.query('type', 'string', 'Resource type: video, channel, or playlist'), p.query('maxResults', 'integer', 'Number of results (max 50)'), p.query('order', 'string', 'Sort by: date, rating, relevance, title, or viewCount'), p.query('regionCode', 'string', 'Filter by country: 2-letter ISO code, e.g. US or BR')] },
      { name: 'get_video_details', description: 'Get full details for a video: title, description, view count, likes, and duration.', method: 'GET', path: '/videos', params: [p.query('id', 'string', 'Video ID from the YouTube URL (after ?v=), e.g. dQw4w9WgXcQ', true), p.query('part', 'string', 'Parts to include (required): snippet,statistics,contentDetails', true)] },
      { name: 'get_channel', description: 'Get a YouTube channel\'s name, description, subscriber count, and total view count.', method: 'GET', path: '/channels', params: [p.query('id', 'string', 'Channel ID, e.g. UCBcRF18a7Qf58cCRy5xuWwQ'), p.query('forUsername', 'string', 'Channel username (legacy, use id when possible)'), p.query('part', 'string', 'Parts to include (required): snippet,statistics', true)] },
      { name: 'list_playlist_items', description: 'List all videos in a YouTube playlist in order.', method: 'GET', path: '/playlistItems', params: [p.query('playlistId', 'string', 'Playlist ID from the YouTube URL', true), p.query('part', 'string', 'Parts to include (required): snippet,contentDetails', true), p.query('maxResults', 'integer', 'Number of results (max 50)')] },
    ],
  },

  // ── Groq ──────────────────────────────────────────────────────────────────────
  {
    id: 'groq',
    name: 'Groq',
    tagline: 'Ultra-fast AI inference (OpenAI-compatible)',
    description: 'Run LLM inference at very high speed using Groq\'s purpose-built LPU hardware. Fully compatible with the OpenAI API format — swap in models like Llama 3, Mixtral, and Gemma.',
    category: 'AI',
    color: '#F55036',
    emoji: '⚡',
    baseUrl: 'https://api.groq.com/openai/v1',
    auth: { type: 'bearer', hint: 'Create a free API key at console.groq.com. Groq offers a generous free tier.' },
    signupUrl: 'https://console.groq.com',
    docsUrl: 'https://console.groq.com/docs/openai',
    tools: [
      { name: 'chat_completion', description: 'Send messages to a Groq-hosted model and get an AI response. Supports system prompts and conversation history.', method: 'POST', path: '/chat/completions', params: [p.body('model', 'string', 'Model ID, e.g. llama-3.3-70b-versatile, llama-3.1-8b-instant, or gemma2-9b-it', true), p.body('messages', 'array', 'Conversation messages: [{role:"user"|"assistant"|"system", content:"..."}]', true), p.body('temperature', 'number', 'Randomness (0–2). Lower = more deterministic'), p.body('max_tokens', 'integer', 'Maximum tokens in the response')] },
      { name: 'list_models', description: 'List all AI models available on Groq with their IDs and context window sizes.', method: 'GET', path: '/models', params: [] },
      { name: 'create_transcription', description: 'Transcribe an audio file to text using Groq\'s Whisper integration (fastest Whisper in the world).', method: 'POST', path: '/audio/transcriptions', params: [p.body('model', 'string', 'Whisper model: whisper-large-v3 or whisper-large-v3-turbo', true), p.body('file', 'string', 'Audio file path or URL', true), p.body('language', 'string', 'Language code, e.g. en, pt, es. Omit for auto-detection'), p.body('response_format', 'string', 'Output format: json, text, or verbose_json')] },
    ],
  },

  // ── Reddit ────────────────────────────────────────────────────────────────────
  {
    id: 'reddit',
    name: 'Reddit',
    tagline: 'Subreddit posts, comments and search',
    description: 'Read public posts, comments, and community data from any subreddit. No authentication required for public content. Useful for social listening and trend research.',
    category: 'Data',
    color: '#FF4500',
    emoji: '🤖',
    baseUrl: 'https://www.reddit.com',
    auth: { type: 'none', hint: '' },
    docsUrl: 'https://www.reddit.com/dev/api/',
    tools: [
      { name: 'get_subreddit_posts', description: 'Get hot, new, or top posts from any subreddit with their score, title, and comment count.', method: 'GET', path: '/r/{subreddit}/hot.json', params: [p.path('subreddit', 'string', 'Subreddit name, e.g. programming or ProductManagement'), p.query('limit', 'integer', 'Number of posts (max 100)'), p.query('t', 'string', 'Time filter for top: hour, day, week, month, year, or all')] },
      { name: 'get_subreddit_info', description: 'Get metadata about a subreddit: description, member count, creation date, and rules.', method: 'GET', path: '/r/{subreddit}/about.json', params: [p.path('subreddit', 'string', 'Subreddit name, e.g. SaaS or startups')] },
      { name: 'search_reddit', description: 'Search Reddit posts by keyword across all subreddits or within a specific community.', method: 'GET', path: '/search.json', params: [p.query('q', 'string', 'Search query', true), p.query('subreddit', 'string', 'Limit search to this subreddit (optional)'), p.query('sort', 'string', 'Sort by: relevance, hot, top, new, or comments'), p.query('t', 'string', 'Time filter: hour, day, week, month, year, or all'), p.query('limit', 'integer', 'Number of results (max 100)')] },
      { name: 'get_post_comments', description: 'Get the comments on a specific Reddit post.', method: 'GET', path: '/r/{subreddit}/comments/{article}.json', params: [p.path('subreddit', 'string', 'Subreddit name'), p.path('article', 'string', 'Post ID from the Reddit URL (the alphanumeric part after /comments/)'), p.query('depth', 'integer', 'Maximum comment nesting depth'), p.query('limit', 'integer', 'Number of comments to return')] },
    ],
  },

  // ── Frankfurter ───────────────────────────────────────────────────────────────
  {
    id: 'frankfurter',
    name: 'Frankfurter',
    tagline: 'Currency exchange rates and conversion',
    description: 'Get real-time and historical foreign exchange rates for 30+ currencies sourced from the European Central Bank. No registration or API key needed.',
    category: 'Data',
    color: '#009688',
    emoji: '💱',
    baseUrl: 'https://api.frankfurter.app',
    auth: { type: 'none', hint: '' },
    docsUrl: 'https://www.frankfurter.app/docs',
    tools: [
      { name: 'get_latest_rates', description: 'Get the latest exchange rates for one or more currencies relative to a base currency.', method: 'GET', path: '/latest', params: [p.query('base', 'string', 'Base currency code, e.g. USD, EUR, BRL (default: EUR)'), p.query('symbols', 'string', 'Comma-separated target currencies, e.g. USD,BRL,GBP,JPY')] },
      { name: 'convert_currency', description: 'Convert an amount from one currency to another at the current exchange rate.', method: 'GET', path: '/latest', params: [p.query('amount', 'number', 'Amount to convert, e.g. 100', true), p.query('from', 'string', 'Source currency code, e.g. USD', true), p.query('to', 'string', 'Target currency code, e.g. BRL', true)] },
      { name: 'get_historical_rates', description: 'Get exchange rates on a specific historical date.', method: 'GET', path: '/{date}', params: [p.path('date', 'string', 'Date in YYYY-MM-DD format, e.g. 2024-01-15'), p.query('base', 'string', 'Base currency, e.g. USD'), p.query('symbols', 'string', 'Target currencies, e.g. EUR,BRL,GBP')] },
      { name: 'list_currencies', description: 'Get the full list of supported currencies with their names.', method: 'GET', path: '/currencies', params: [] },
    ],
  },

  // ── NASA ──────────────────────────────────────────────────────────────────────
  {
    id: 'nasa',
    name: 'NASA',
    tagline: 'Space data, astronomy pictures and Mars rovers',
    description: 'Access NASA\'s public data: the Astronomy Picture of the Day, near-Earth asteroid tracking, and Mars rover photos. Free tier uses DEMO_KEY (30 req/hour).',
    category: 'Data',
    color: '#0B3D91',
    emoji: '🚀',
    baseUrl: 'https://api.nasa.gov',
    auth: { type: 'api-key', hint: 'Use DEMO_KEY for testing (30 requests/hour), or register for a free API key at api.nasa.gov for higher limits (1000 req/hour).', keyName: 'api_key', keyIn: 'query' },
    signupUrl: 'https://api.nasa.gov/#browseAPI',
    docsUrl: 'https://api.nasa.gov',
    tools: [
      { name: 'get_astronomy_picture', description: 'Get NASA\'s Astronomy Picture of the Day with a description written by professional astronomers.', method: 'GET', path: '/planetary/apod', params: [p.query('date', 'string', 'Date in YYYY-MM-DD format. Defaults to today. Earliest is 1995-06-16'), p.query('count', 'integer', 'Return this many random pictures instead of a specific date'), p.query('thumbs', 'boolean', 'Return a video thumbnail URL for video entries')] },
      { name: 'get_near_earth_objects', description: 'Get a list of asteroids and comets that are close to Earth within a date range.', method: 'GET', path: '/neo/rest/v1/feed', params: [p.query('start_date', 'string', 'Start date in YYYY-MM-DD format (max 7-day window)', true), p.query('end_date', 'string', 'End date in YYYY-MM-DD format')] },
      { name: 'get_mars_rover_photos', description: 'Get photos taken by NASA\'s Mars rovers (Curiosity, Opportunity, or Spirit) on a given Martian day.', method: 'GET', path: '/mars-photos/api/v1/rovers/{rover}/photos', params: [p.path('rover', 'string', 'Rover name: curiosity, opportunity, or spirit'), p.query('sol', 'integer', 'Martian day (sol) since rover landing, e.g. 1000'), p.query('camera', 'string', 'Camera: FHAZ, RHAZ, MAST, CHEMCAM, MAHLI, MARDI, NAVCAM, PANCAM, MINITES'), p.query('page', 'integer', 'Page number (25 photos per page)')] },
    ],
  },

  // ── GitLab ────────────────────────────────────────────────────────────────────
  {
    id: 'gitlab', name: 'GitLab', tagline: 'Repos, issues and CI/CD pipelines',
    description: 'Manage GitLab repositories, issues, and merge requests. Works with gitlab.com or self-hosted instances — update the base URL in Settings for self-hosted.',
    category: 'Development', color: '#FC6D26', emoji: '🦊',
    baseUrl: 'https://gitlab.com/api/v4',
    auth: { type: 'bearer', hint: 'Create a Personal Access Token in GitLab → Settings → Access Tokens with the "api" scope.' },
    signupUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens', docsUrl: 'https://docs.gitlab.com/ee/api/',
    tools: [
      { name: 'search_projects', description: 'Search GitLab projects by name or keyword.', method: 'GET', path: '/projects', params: [p.query('search', 'string', 'Search term'), p.query('owned', 'boolean', 'Show only projects you own'), p.query('order_by', 'string', 'Sort by: id, name, stars, or updated_at'), p.query('per_page', 'integer', 'Results per page (max 100)')] },
      { name: 'list_issues', description: 'List issues for a project with title, state, labels, and assignee.', method: 'GET', path: '/projects/{id}/issues', params: [p.path('id', 'string', 'Project ID (integer) or URL-encoded path like namespace%2Fproject'), p.query('state', 'string', 'State: opened, closed, or all'), p.query('labels', 'string', 'Comma-separated label names'), p.query('per_page', 'integer', 'Results per page (max 100)')] },
      { name: 'create_issue', description: 'Create a new issue in a GitLab project.', method: 'POST', path: '/projects/{id}/issues', params: [p.path('id', 'string', 'Project ID or URL-encoded path'), p.body('title', 'string', 'Issue title', true), p.body('description', 'string', 'Markdown description'), p.body('labels', 'string', 'Comma-separated label names')] },
      { name: 'list_merge_requests', description: 'List merge requests with source/target branches and review status.', method: 'GET', path: '/projects/{id}/merge_requests', params: [p.path('id', 'string', 'Project ID or URL-encoded path'), p.query('state', 'string', 'State: opened, closed, locked, or merged'), p.query('per_page', 'integer', 'Results per page (max 100)')] },
      { name: 'list_pipelines', description: 'List CI/CD pipelines for a project with their status and duration.', method: 'GET', path: '/projects/{id}/pipelines', params: [p.path('id', 'string', 'Project ID or URL-encoded path'), p.query('status', 'string', 'Filter by status: running, pending, success, failed, canceled'), p.query('per_page', 'integer', 'Results per page (max 100)')] },
    ],
  },

  // ── Jira Cloud ────────────────────────────────────────────────────────────────
  {
    id: 'jira', name: 'Jira', tagline: 'Issues, sprints and project tracking',
    description: 'Search and manage Jira issues, sprints, and projects. Update the base URL in Settings to your own Atlassian domain (your-domain.atlassian.net).',
    category: 'Development', color: '#0052CC', emoji: '🔵',
    baseUrl: 'https://your-domain.atlassian.net/rest/api/3',
    auth: { type: 'api-key', hint: 'Go to id.atlassian.com/manage-profile/security/api-tokens and create an API token. In the API Key field enter: Basic <base64 of "your@email.com:API_TOKEN">.', keyName: 'Authorization', keyIn: 'header' },
    signupUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens', docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
    tools: [
      { name: 'search_issues', description: 'Search Jira issues using JQL (Jira Query Language).', method: 'GET', path: '/search', params: [p.query('jql', 'string', 'JQL query, e.g. "project=MYPROJ AND status=Open AND assignee=currentUser()"', true), p.query('maxResults', 'integer', 'Max results (default 50, max 100)'), p.query('fields', 'string', 'Comma-separated fields: summary,status,assignee,priority,created')] },
      { name: 'get_issue', description: 'Get full details for a Jira issue by its key.', method: 'GET', path: '/issue/{issueIdOrKey}', params: [p.path('issueIdOrKey', 'string', 'Issue key like PROJ-123 or issue ID')] },
      { name: 'create_issue', description: 'Create a new Jira issue in a project.', method: 'POST', path: '/issue', params: [p.body('fields', 'object', 'Issue fields, e.g. {"project":{"key":"PROJ"},"summary":"Bug title","issuetype":{"name":"Bug"},"description":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"Details"}]}]}}', true)] },
      { name: 'update_issue', description: 'Update fields of an existing Jira issue (status, assignee, priority, etc.).', method: 'PUT', path: '/issue/{issueIdOrKey}', params: [p.path('issueIdOrKey', 'string', 'Issue key or ID'), p.body('fields', 'object', 'Fields to update, e.g. {"priority":{"name":"High"},"assignee":{"accountId":"<id>"}}', true)] },
      { name: 'get_project', description: 'Get a Jira project\'s details, issue types, and components.', method: 'GET', path: '/project/{projectIdOrKey}', params: [p.path('projectIdOrKey', 'string', 'Project key (e.g. PROJ) or numeric ID')] },
    ],
  },

  // ── Bitbucket ─────────────────────────────────────────────────────────────────
  {
    id: 'bitbucket', name: 'Bitbucket', tagline: 'Git repos, PRs and pipelines',
    description: 'Manage Bitbucket Cloud repositories, pull requests, and pipelines via the Bitbucket REST API.',
    category: 'Development', color: '#0747A6', emoji: '🪣',
    baseUrl: 'https://api.bitbucket.org/2.0',
    auth: { type: 'bearer', hint: 'Create an App Password in Bitbucket → Personal Settings → App Passwords with Repository and Pull Request permissions.' },
    signupUrl: 'https://bitbucket.org/account/settings/app-passwords/', docsUrl: 'https://developer.atlassian.com/cloud/bitbucket/rest/',
    tools: [
      { name: 'list_repositories', description: 'List repositories for a workspace or user.', method: 'GET', path: '/repositories/{workspace}', params: [p.path('workspace', 'string', 'Workspace slug or username'), p.query('q', 'string', 'Filter query, e.g. name ~ "api"'), p.query('pagelen', 'integer', 'Results per page (max 100)')] },
      { name: 'get_repository', description: 'Get details for a specific Bitbucket repository.', method: 'GET', path: '/repositories/{workspace}/{repo_slug}', params: [p.path('workspace', 'string', 'Workspace slug'), p.path('repo_slug', 'string', 'Repository slug')] },
      { name: 'list_pull_requests', description: 'List pull requests for a repository.', method: 'GET', path: '/repositories/{workspace}/{repo_slug}/pullrequests', params: [p.path('workspace', 'string', 'Workspace slug'), p.path('repo_slug', 'string', 'Repository slug'), p.query('state', 'string', 'State: OPEN, MERGED, DECLINED, or SUPERSEDED')] },
      { name: 'list_issues', description: 'List issues in a Bitbucket repository.', method: 'GET', path: '/repositories/{workspace}/{repo_slug}/issues', params: [p.path('workspace', 'string', 'Workspace slug'), p.path('repo_slug', 'string', 'Repository slug'), p.query('q', 'string', 'Filter, e.g. status="open" AND kind="bug"')] },
    ],
  },

  // ── Docker Hub ────────────────────────────────────────────────────────────────
  {
    id: 'dockerhub', name: 'Docker Hub', tagline: 'Container image search and registry',
    description: 'Search public Docker images, browse image tags, and get repository details from Docker Hub. No authentication required for public images.',
    category: 'Development', color: '#0db7ed', emoji: '🐳',
    baseUrl: 'https://hub.docker.com/v2',
    auth: { type: 'none', hint: '' },
    docsUrl: 'https://docs.docker.com/docker-hub/api/latest/',
    tools: [
      { name: 'search_images', description: 'Search Docker Hub for public images by name or keyword.', method: 'GET', path: '/search/repositories', params: [p.query('query', 'string', 'Search term, e.g. nginx or postgres', true), p.query('page_size', 'integer', 'Results per page (max 100)'), p.query('page', 'integer', 'Page number')] },
      { name: 'get_repository', description: 'Get details for a Docker Hub repository: description, star count, and pull count.', method: 'GET', path: '/repositories/{namespace}/{repository}', params: [p.path('namespace', 'string', 'Namespace (username or org), e.g. library for official images'), p.path('repository', 'string', 'Repository name, e.g. nginx')] },
      { name: 'list_tags', description: 'List available tags for a Docker image repository.', method: 'GET', path: '/repositories/{namespace}/{repository}/tags', params: [p.path('namespace', 'string', 'Namespace, e.g. library'), p.path('repository', 'string', 'Repository name'), p.query('page_size', 'integer', 'Results per page (max 100)')] },
    ],
  },

  // ── npm Registry ──────────────────────────────────────────────────────────────
  {
    id: 'npm', name: 'npm Registry', tagline: 'Search packages and check versions',
    description: 'Search npm packages, get version history, check dependencies, and retrieve download counts. No authentication required for public registry data.',
    category: 'Development', color: '#CB3837', emoji: '📦',
    baseUrl: 'https://registry.npmjs.org',
    auth: { type: 'none', hint: '' },
    docsUrl: 'https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md',
    tools: [
      { name: 'get_package', description: 'Get full metadata for an npm package: description, latest version, dependencies, and repository.', method: 'GET', path: '/{packageName}', params: [p.path('packageName', 'string', 'Package name, e.g. react or @types/node')] },
      { name: 'get_package_version', description: 'Get metadata for a specific version of an npm package.', method: 'GET', path: '/{packageName}/{version}', params: [p.path('packageName', 'string', 'Package name, e.g. lodash'), p.path('version', 'string', 'Version number or "latest"')] },
      { name: 'search_packages', description: 'Search npm packages by keyword, author, or description.', method: 'GET', path: '/-/v1/search', params: [p.query('text', 'string', 'Search query, e.g. "date formatting" or "author:sindresorhus"', true), p.query('size', 'integer', 'Number of results (max 250)'), p.query('from', 'integer', 'Offset for pagination')] },
    ],
  },

  // ── Vercel ────────────────────────────────────────────────────────────────────
  {
    id: 'vercel', name: 'Vercel', tagline: 'Deployments, projects and domains',
    description: 'Monitor deployments, list projects, check build logs, and manage custom domains for your Vercel-hosted applications.',
    category: 'Development', color: '#000000', emoji: '▲',
    baseUrl: 'https://api.vercel.com',
    auth: { type: 'bearer', hint: 'Create an Access Token in your Vercel account under Settings → Tokens.' },
    signupUrl: 'https://vercel.com/account/tokens', docsUrl: 'https://vercel.com/docs/rest-api',
    tools: [
      { name: 'list_projects', description: 'List all Vercel projects with their framework, domains, and last deployment status.', method: 'GET', path: '/v9/projects', params: [p.query('limit', 'integer', 'Number of projects (max 100)'), p.query('search', 'string', 'Filter by project name')] },
      { name: 'get_project', description: 'Get full details for a Vercel project including environment variables and domains.', method: 'GET', path: '/v9/projects/{idOrName}', params: [p.path('idOrName', 'string', 'Project ID or name')] },
      { name: 'list_deployments', description: 'List deployments across your account or for a specific project.', method: 'GET', path: '/v6/deployments', params: [p.query('projectId', 'string', 'Filter by project ID'), p.query('state', 'string', 'Filter by state: BUILDING, ERROR, INITIALIZING, QUEUED, READY, CANCELED'), p.query('limit', 'integer', 'Number of results (max 100)')] },
      { name: 'get_deployment', description: 'Get full details for a specific deployment including build logs URL and status.', method: 'GET', path: '/v13/deployments/{idOrUrl}', params: [p.path('idOrUrl', 'string', 'Deployment ID (dpl_xxx) or deployment URL')] },
    ],
  },

  // ── Netlify ───────────────────────────────────────────────────────────────────
  {
    id: 'netlify', name: 'Netlify', tagline: 'Sites, deploys and edge functions',
    description: 'Manage your Netlify sites, monitor deployments, and check build status via the Netlify REST API.',
    category: 'Development', color: '#00C7B7', emoji: '🌐',
    baseUrl: 'https://api.netlify.com/api/v1',
    auth: { type: 'bearer', hint: 'Create a Personal Access Token in Netlify → User Settings → Applications → Personal Access Tokens.' },
    signupUrl: 'https://app.netlify.com/user/applications', docsUrl: 'https://docs.netlify.com/api/get-started/',
    tools: [
      { name: 'list_sites', description: 'List all Netlify sites with their URL, build status, and last publish date.', method: 'GET', path: '/sites', params: [p.query('filter', 'string', 'Filter: all, owner, or member'), p.query('page', 'integer', 'Page number'), p.query('per_page', 'integer', 'Results per page (max 100)')] },
      { name: 'get_site', description: 'Get details for a specific Netlify site including domain aliases and deploy settings.', method: 'GET', path: '/sites/{site_id}', params: [p.path('site_id', 'string', 'Site ID from the Netlify dashboard')] },
      { name: 'list_deploys', description: 'List deploys for a site with their state, branch, and creation time.', method: 'GET', path: '/sites/{site_id}/deploys', params: [p.path('site_id', 'string', 'Site ID'), p.query('page', 'integer', 'Page number'), p.query('per_page', 'integer', 'Results per page')] },
      { name: 'get_deploy', description: 'Get full info for a specific deploy: state, build log URL, and deploy time.', method: 'GET', path: '/deploys/{deploy_id}', params: [p.path('deploy_id', 'string', 'Deploy ID')] },
    ],
  },

  // ── Pipedrive ─────────────────────────────────────────────────────────────────
  {
    id: 'pipedrive', name: 'Pipedrive', tagline: 'CRM deals, contacts and pipeline',
    description: 'Search and manage deals, contacts, and pipeline stages in Pipedrive. Great for sales teams who want their AI to query and update CRM data.',
    category: 'Business', color: '#017737', emoji: '🏆',
    baseUrl: 'https://api.pipedrive.com/v1',
    auth: { type: 'api-key', hint: 'Go to Settings → Personal Preferences → API and copy your Personal API Token.', keyName: 'api_token', keyIn: 'query' },
    signupUrl: 'https://www.pipedrive.com/en/register', docsUrl: 'https://developers.pipedrive.com/docs/api/v1',
    tools: [
      { name: 'search_deals', description: 'Search deals by title, value, or stage in Pipedrive.', method: 'GET', path: '/deals/search', params: [p.query('term', 'string', 'Search term', true), p.query('fields', 'string', 'Fields to search: title, notes, or custom_fields'), p.query('limit', 'integer', 'Number of results (max 500)')] },
      { name: 'get_deal', description: 'Get full details for a deal including value, stage, owner, and expected close date.', method: 'GET', path: '/deals/{id}', params: [p.path('id', 'integer', 'Deal ID')] },
      { name: 'create_deal', description: 'Create a new deal in Pipedrive with title, value, and pipeline stage.', method: 'POST', path: '/deals', params: [p.body('title', 'string', 'Deal title', true), p.body('value', 'number', 'Deal value in the account currency'), p.body('currency', 'string', 'Currency code, e.g. USD, EUR'), p.body('stage_id', 'integer', 'Pipeline stage ID'), p.body('person_id', 'integer', 'ID of the contact person')] },
      { name: 'search_persons', description: 'Search contacts (persons) in Pipedrive by name or email.', method: 'GET', path: '/persons/search', params: [p.query('term', 'string', 'Search term (name or email)', true), p.query('limit', 'integer', 'Number of results (max 500)')] },
      { name: 'get_pipeline', description: 'Get the stages of a Pipedrive pipeline.', method: 'GET', path: '/stages', params: [p.query('pipeline_id', 'integer', 'Pipeline ID to list stages for')] },
    ],
  },

  // ── Intercom ──────────────────────────────────────────────────────────────────
  {
    id: 'intercom', name: 'Intercom', tagline: 'Customer contacts and conversations',
    description: 'Search customers, read conversations, send messages, and create contacts in Intercom — your AI gets direct access to customer communication data.',
    category: 'Business', color: '#6EEAFF', emoji: '💬',
    baseUrl: 'https://api.intercom.io',
    auth: { type: 'bearer', hint: 'Create an Access Token in Settings → Integrations → Developer Hub → New App → Authentication.' },
    signupUrl: 'https://app.intercom.com/developer-hub', docsUrl: 'https://developers.intercom.com/docs',
    tools: [
      { name: 'search_contacts', description: 'Search Intercom contacts by email, name, or custom attributes.', method: 'POST', path: '/contacts/search', params: [p.body('query', 'object', 'Search query, e.g. {"field":"email","operator":"=","value":"user@example.com"}', true), p.body('pagination', 'object', 'Pagination, e.g. {"per_page":25}')] },
      { name: 'get_contact', description: 'Get a contact\'s full profile: email, name, company, plan, and custom attributes.', method: 'GET', path: '/contacts/{id}', params: [p.path('id', 'string', 'Intercom contact ID')] },
      { name: 'create_contact', description: 'Create a new contact (lead or user) in Intercom.', method: 'POST', path: '/contacts', params: [p.body('role', 'string', 'Contact role: user or lead', true), p.body('email', 'string', 'Contact email address'), p.body('name', 'string', 'Contact full name'), p.body('custom_attributes', 'object', 'Custom attributes, e.g. {"plan":"Pro","company":"Acme"}')] },
      { name: 'list_conversations', description: 'List conversations with their assignee, status, and last message preview.', method: 'GET', path: '/conversations', params: [p.query('display_as', 'string', 'Display format: plaintext'), p.query('per_page', 'integer', 'Results per page (max 150)')] },
    ],
  },

  // ── ClickUp ───────────────────────────────────────────────────────────────────
  {
    id: 'clickup', name: 'ClickUp', tagline: 'Tasks, lists and workspace management',
    description: 'Access ClickUp tasks, spaces, and lists. Create and update tasks, track priorities, and manage your team\'s work programmatically.',
    category: 'Business', color: '#7B68EE', emoji: '🎯',
    baseUrl: 'https://api.clickup.com/api/v2',
    auth: { type: 'bearer', hint: 'Go to ClickUp → Settings → Apps → API Token and copy your Personal Token.' },
    signupUrl: 'https://app.clickup.com/settings/apps', docsUrl: 'https://clickup.com/api',
    tools: [
      { name: 'get_workspaces', description: 'List all ClickUp workspaces (teams) your account has access to.', method: 'GET', path: '/team', params: [] },
      { name: 'list_tasks', description: 'List tasks in a specific list with assignees, due dates, and priorities.', method: 'GET', path: '/list/{list_id}/task', params: [p.path('list_id', 'string', 'List ID from the ClickUp URL'), p.query('status', 'string', 'Filter by status name, e.g. "in progress"'), p.query('assignees', 'string', 'Filter by assignee user IDs (comma-separated)'), p.query('page', 'integer', 'Page number (100 tasks per page)')] },
      { name: 'create_task', description: 'Create a new task in a ClickUp list.', method: 'POST', path: '/list/{list_id}/task', params: [p.path('list_id', 'string', 'List ID'), p.body('name', 'string', 'Task name', true), p.body('description', 'string', 'Task description (plain text)'), p.body('priority', 'integer', 'Priority: 1 (urgent), 2 (high), 3 (normal), 4 (low)'), p.body('due_date', 'integer', 'Due date as Unix timestamp in milliseconds')] },
      { name: 'update_task', description: 'Update a ClickUp task: name, status, priority, assignees, or due date.', method: 'PUT', path: '/task/{task_id}', params: [p.path('task_id', 'string', 'Task ID'), p.body('name', 'string', 'New task name'), p.body('status', 'string', 'New status name'), p.body('priority', 'integer', 'New priority: 1–4'), p.body('due_date', 'integer', 'New due date as Unix ms timestamp')] },
    ],
  },

  // ── Trello ────────────────────────────────────────────────────────────────────
  {
    id: 'trello', name: 'Trello', tagline: 'Boards, lists and cards',
    description: 'Read and manage Trello boards, lists, and cards. Requires an API Key (set in auth) plus your OAuth Token passed as a parameter in each call.',
    category: 'Business', color: '#0052CC', emoji: '📋',
    baseUrl: 'https://api.trello.com/1',
    auth: { type: 'api-key', hint: 'Get your API Key at trello.com/power-ups/admin. You also need an OAuth Token — generate one at trello.com/1/authorize?key=YOUR_KEY&scope=read,write&expiration=never&name=MyApp&response_type=token', keyName: 'key', keyIn: 'query' },
    signupUrl: 'https://trello.com/power-ups/admin', docsUrl: 'https://developer.atlassian.com/cloud/trello/rest/',
    tools: [
      { name: 'get_boards', description: 'List all Trello boards for the authenticated user.', method: 'GET', path: '/members/me/boards', params: [p.query('token', 'string', 'Your Trello OAuth Token (from the auth hint)', true), p.query('fields', 'string', 'Fields to return, e.g. name,url,desc,closed')] },
      { name: 'get_board_lists', description: 'Get all lists on a Trello board.', method: 'GET', path: '/boards/{id}/lists', params: [p.path('id', 'string', 'Board ID'), p.query('token', 'string', 'Your Trello OAuth Token', true)] },
      { name: 'get_cards', description: 'Get all cards on a Trello board with their list, due date, and members.', method: 'GET', path: '/boards/{id}/cards', params: [p.path('id', 'string', 'Board ID'), p.query('token', 'string', 'Your Trello OAuth Token', true), p.query('fields', 'string', 'Fields: name,desc,due,dueComplete,idList,url')] },
      { name: 'create_card', description: 'Create a new card on a Trello list.', method: 'POST', path: '/cards', params: [p.query('token', 'string', 'Your Trello OAuth Token', true), p.body('idList', 'string', 'Target list ID', true), p.body('name', 'string', 'Card name', true), p.body('desc', 'string', 'Card description'), p.body('due', 'string', 'Due date in ISO format, e.g. 2025-12-31T00:00:00Z')] },
    ],
  },

  // ── Freshdesk ─────────────────────────────────────────────────────────────────
  {
    id: 'freshdesk', name: 'Freshdesk', tagline: 'Support tickets and agents',
    description: 'Manage support tickets, contacts, and agents in Freshdesk. Update the base URL in Settings to your Freshdesk subdomain (your-domain.freshdesk.com).',
    category: 'Business', color: '#25C16F', emoji: '🎧',
    baseUrl: 'https://your-domain.freshdesk.com/api/v2',
    auth: { type: 'api-key', hint: 'Find your API Key in Freshdesk → Profile Settings → Your API Key (bottom right). In the API Key field enter: Basic <base64 of "API_KEY:X">.', keyName: 'Authorization', keyIn: 'header' },
    signupUrl: 'https://freshdesk.com/signup', docsUrl: 'https://developers.freshdesk.com/api/',
    tools: [
      { name: 'list_tickets', description: 'List support tickets with their subject, status, priority, and requester.', method: 'GET', path: '/tickets', params: [p.query('filter', 'string', 'Filter: new_and_my_open, watching, spam, or deleted'), p.query('order_by', 'string', 'Sort by: created_at, updated_at, or due_by'), p.query('per_page', 'integer', 'Results per page (max 100)')] },
      { name: 'get_ticket', description: 'Get full details for a support ticket including all conversations.', method: 'GET', path: '/tickets/{id}', params: [p.path('id', 'integer', 'Ticket ID number')] },
      { name: 'create_ticket', description: 'Create a new support ticket in Freshdesk.', method: 'POST', path: '/tickets', params: [p.body('subject', 'string', 'Ticket subject', true), p.body('description', 'string', 'Ticket description (HTML allowed)'), p.body('email', 'string', 'Requester email address', true), p.body('priority', 'integer', 'Priority: 1 (low), 2 (medium), 3 (high), 4 (urgent)'), p.body('status', 'integer', 'Status: 2 (open), 3 (pending), 4 (resolved), 5 (closed)')] },
      { name: 'search_tickets', description: 'Search tickets using a query string.', method: 'GET', path: '/search/tickets', params: [p.query('query', 'string', 'Search query, e.g. "status:2 AND priority:3"', true)] },
    ],
  },

  // ── Typeform ──────────────────────────────────────────────────────────────────
  {
    id: 'typeform', name: 'Typeform', tagline: 'Forms, surveys and responses',
    description: 'Access Typeform forms and read survey responses. Analyze form submissions and fetch response data for reporting and analysis.',
    category: 'Business', color: '#261E4A', emoji: '📝',
    baseUrl: 'https://api.typeform.com',
    auth: { type: 'bearer', hint: 'Create a Personal Token in Typeform → Account → Personal Tokens.' },
    signupUrl: 'https://admin.typeform.com/account#/section/tokens', docsUrl: 'https://www.typeform.com/developers/create/reference/',
    tools: [
      { name: 'list_forms', description: 'List all Typeform forms in your account with their title and response count.', method: 'GET', path: '/forms', params: [p.query('page', 'integer', 'Page number'), p.query('page_size', 'integer', 'Results per page (max 200)'), p.query('search', 'string', 'Search by form title')] },
      { name: 'get_form', description: 'Get the structure of a Typeform form including all questions and their types.', method: 'GET', path: '/forms/{form_id}', params: [p.path('form_id', 'string', 'Form ID from the Typeform URL')] },
      { name: 'get_responses', description: 'Get survey responses for a form with all answer values and submission metadata.', method: 'GET', path: '/forms/{form_id}/responses', params: [p.path('form_id', 'string', 'Form ID'), p.query('page_size', 'integer', 'Responses per page (max 1000)'), p.query('since', 'string', 'ISO date — return responses submitted after this date'), p.query('until', 'string', 'ISO date — return responses submitted before this date')] },
    ],
  },

  // ── Calendly ──────────────────────────────────────────────────────────────────
  {
    id: 'calendly', name: 'Calendly', tagline: 'Scheduled meetings and event types',
    description: 'Access your Calendly scheduling data: list event types, view scheduled meetings, and get invitee details.',
    category: 'Business', color: '#006BFF', emoji: '📅',
    baseUrl: 'https://api.calendly.com',
    auth: { type: 'bearer', hint: 'Create a Personal Access Token in Calendly → Integrations → API & Webhooks.' },
    signupUrl: 'https://calendly.com/integrations/api_webhooks', docsUrl: 'https://developer.calendly.com/api-docs',
    tools: [
      { name: 'get_user', description: 'Get the current Calendly user\'s profile and organization URI.', method: 'GET', path: '/users/me', params: [] },
      { name: 'list_event_types', description: 'List all event types (meeting templates) for a user or organization.', method: 'GET', path: '/event_types', params: [p.query('user', 'string', 'User URI from get_user response'), p.query('active', 'boolean', 'Only return active event types'), p.query('count', 'integer', 'Results per page (max 100)')] },
      { name: 'list_events', description: 'List scheduled meetings with their invitee name, status, and time.', method: 'GET', path: '/scheduled_events', params: [p.query('user', 'string', 'User URI from get_user'), p.query('status', 'string', 'Filter: active or canceled'), p.query('min_start_time', 'string', 'ISO datetime — events starting after this time'), p.query('max_start_time', 'string', 'ISO datetime — events starting before this time'), p.query('count', 'integer', 'Results per page (max 100)')] },
      { name: 'get_event_invitees', description: 'List all invitees for a specific scheduled event.', method: 'GET', path: '/scheduled_events/{uuid}/invitees', params: [p.path('uuid', 'string', 'Event UUID from list_events response'), p.query('status', 'string', 'Filter: active or canceled')] },
    ],
  },

  // ── Shopify Admin ─────────────────────────────────────────────────────────────
  {
    id: 'shopify', name: 'Shopify', tagline: 'Products, orders and customers',
    description: 'Access your Shopify store\'s products, orders, and customer data. Update the base URL in Settings to your store domain (your-store.myshopify.com/admin/api/2024-07).',
    category: 'E-commerce', color: '#95BF47', emoji: '🛍️',
    baseUrl: 'https://your-store.myshopify.com/admin/api/2024-07',
    auth: { type: 'bearer', hint: 'Create a Custom App in Shopify Admin → Settings → Apps → Develop Apps, then install it and copy the Admin API Access Token.' },
    signupUrl: 'https://accounts.shopify.com/signup', docsUrl: 'https://shopify.dev/docs/api/admin-rest',
    tools: [
      { name: 'list_products', description: 'List products in your Shopify store with title, price, inventory, and status.', method: 'GET', path: '/products.json', params: [p.query('limit', 'integer', 'Number of products (max 250)'), p.query('status', 'string', 'Filter by status: active, archived, or draft'), p.query('title', 'string', 'Filter by product title (partial match)')] },
      { name: 'get_product', description: 'Get full details for a product including all variants and images.', method: 'GET', path: '/products/{product_id}.json', params: [p.path('product_id', 'string', 'Product ID number')] },
      { name: 'list_orders', description: 'List store orders with customer info, total price, and fulfillment status.', method: 'GET', path: '/orders.json', params: [p.query('limit', 'integer', 'Number of orders (max 250)'), p.query('status', 'string', 'Filter: open, closed, cancelled, or any'), p.query('financial_status', 'string', 'Payment status: paid, pending, refunded, etc.'), p.query('created_at_min', 'string', 'ISO date — orders created after this date')] },
      { name: 'get_order', description: 'Get full details for an order including line items, shipping, and payment info.', method: 'GET', path: '/orders/{order_id}.json', params: [p.path('order_id', 'string', 'Order ID number')] },
      { name: 'list_customers', description: 'List customers with their email, order count, and total spending.', method: 'GET', path: '/customers.json', params: [p.query('limit', 'integer', 'Number of customers (max 250)'), p.query('query', 'string', 'Search query, e.g. "email:user@example.com"')] },
    ],
  },

  // ── Square ────────────────────────────────────────────────────────────────────
  {
    id: 'square', name: 'Square', tagline: 'Payments, orders and inventory',
    description: 'Access Square payments, customers, catalog items, and locations via the Square REST API. Use the sandbox environment for testing.',
    category: 'E-commerce', color: '#3E4348', emoji: '◼',
    baseUrl: 'https://connect.squareup.com/v2',
    auth: { type: 'bearer', hint: 'Create an application at developer.squareup.com and use the Production or Sandbox Access Token.' },
    signupUrl: 'https://developer.squareup.com/apps', docsUrl: 'https://developer.squareup.com/reference/square',
    tools: [
      { name: 'list_payments', description: 'List processed payments with amount, currency, status, and card details.', method: 'GET', path: '/payments', params: [p.query('begin_time', 'string', 'Start time in RFC3339 format, e.g. 2024-01-01T00:00:00Z'), p.query('end_time', 'string', 'End time in RFC3339 format'), p.query('location_id', 'string', 'Filter by location ID'), p.query('limit', 'integer', 'Number of results (max 100)')] },
      { name: 'list_customers', description: 'List Square customers with their name, email, and purchase history.', method: 'GET', path: '/customers', params: [p.query('limit', 'integer', 'Results per page (max 100)'), p.query('sort_field', 'string', 'Sort by: DEFAULT or CREATED_AT')] },
      { name: 'search_catalog', description: 'Search your Square catalog for items, variations, and categories.', method: 'POST', path: '/catalog/search', params: [p.body('text_filter', 'object', 'Text search, e.g. {"keyword":"coffee"}'), p.body('object_types', 'array', 'Types to search: ITEM, CATEGORY, MODIFIER'), p.body('limit', 'integer', 'Max results')] },
      { name: 'list_locations', description: 'List your Square business locations with their address and status.', method: 'GET', path: '/locations', params: [] },
    ],
  },

  // ── PayPal ────────────────────────────────────────────────────────────────────
  {
    id: 'paypal', name: 'PayPal', tagline: 'Payments, invoices and subscriptions',
    description: 'Access PayPal orders, invoices, and subscription data via the REST API. Note: requires OAuth2 — get an access token first using your client credentials.',
    category: 'E-commerce', color: '#003087', emoji: '🅿️',
    baseUrl: 'https://api-m.paypal.com/v2',
    auth: { type: 'bearer', hint: 'Generate an OAuth2 access token by calling POST https://api-m.paypal.com/v1/oauth2/token with your Client ID and Secret as Basic auth. Use the returned access_token as the Bearer.' },
    signupUrl: 'https://developer.paypal.com/dashboard/', docsUrl: 'https://developer.paypal.com/api/rest/',
    tools: [
      { name: 'get_order', description: 'Get details for a PayPal order: amount, currency, status, and payer info.', method: 'GET', path: '/checkout/orders/{id}', params: [p.path('id', 'string', 'PayPal order ID')] },
      { name: 'list_invoices', description: 'List PayPal invoices with their status, amount, and recipient.', method: 'GET', path: '/invoicing/invoices', params: [p.query('page', 'integer', 'Page number'), p.query('page_size', 'integer', 'Results per page (max 100)'), p.query('total_count_required', 'boolean', 'Include total count in response')] },
      { name: 'get_subscription', description: 'Get details for a PayPal subscription including status and billing cycle.', method: 'GET', path: '/billing/subscriptions/{id}', params: [p.path('id', 'string', 'Subscription ID')] },
    ],
  },

  // ── Mercado Pago ──────────────────────────────────────────────────────────────
  {
    id: 'mercadopago', name: 'Mercado Pago', tagline: 'Payments and transactions (LATAM)',
    description: 'Access payments, refunds, and customer data from Mercado Pago — the leading payment platform in Latin America. Used widely in Brazil, Argentina, Mexico, and Colombia.',
    category: 'E-commerce', color: '#009EE3', emoji: '💙',
    baseUrl: 'https://api.mercadopago.com',
    auth: { type: 'bearer', hint: 'Go to mercadopago.com.br/developers → Your credentials → Access Token (Production or Test).' },
    signupUrl: 'https://www.mercadopago.com.br/developers', docsUrl: 'https://www.mercadopago.com.br/developers/en/reference',
    tools: [
      { name: 'get_payment', description: 'Get details for a specific Mercado Pago payment: amount, status, payer, and payment method.', method: 'GET', path: '/v1/payments/{id}', params: [p.path('id', 'integer', 'Payment ID')] },
      { name: 'search_payments', description: 'Search payments with filters for date range, status, and payment method.', method: 'GET', path: '/v1/payments/search', params: [p.query('status', 'string', 'Payment status: approved, pending, rejected, refunded, cancelled'), p.query('begin_date', 'string', 'Start date in ISO format'), p.query('end_date', 'string', 'End date in ISO format'), p.query('limit', 'integer', 'Number of results (max 50)')] },
      { name: 'get_customer', description: 'Get a Mercado Pago customer\'s profile and saved cards.', method: 'GET', path: '/v1/customers/{id}', params: [p.path('id', 'string', 'Customer ID')] },
      { name: 'search_customers', description: 'Search customers by email in Mercado Pago.', method: 'GET', path: '/v1/customers/search', params: [p.query('email', 'string', 'Customer email address to search for', true)] },
    ],
  },

  // ── Chargebee ─────────────────────────────────────────────────────────────────
  {
    id: 'chargebee', name: 'Chargebee', tagline: 'Subscriptions, invoices and revenue',
    description: 'Manage subscriptions, customers, invoices, and plans in Chargebee. Update the base URL in Settings to your Chargebee site (your-site.chargebee.com/api/v2).',
    category: 'E-commerce', color: '#FF6600', emoji: '🔄',
    baseUrl: 'https://your-site.chargebee.com/api/v2',
    auth: { type: 'api-key', hint: 'Go to Settings → Configure Chargebee → API Keys. In the API Key field enter: Basic <base64 of "API_KEY:">  (note the colon with empty password).', keyName: 'Authorization', keyIn: 'header' },
    signupUrl: 'https://www.chargebee.com/trial-signup/', docsUrl: 'https://apidocs.chargebee.com/docs/api',
    tools: [
      { name: 'list_subscriptions', description: 'List all subscriptions with their plan, status, billing period, and customer.', method: 'GET', path: '/subscriptions', params: [p.query('limit', 'integer', 'Number of results (max 100)'), p.query('status[is]', 'string', 'Filter by status: active, cancelled, in_trial, or paused', false, 'status[is]')] },
      { name: 'get_subscription', description: 'Get full details for a subscription including plan, add-ons, and next billing date.', method: 'GET', path: '/subscriptions/{subscription_id}', params: [p.path('subscription_id', 'string', 'Subscription ID')] },
      { name: 'list_invoices', description: 'List invoices with their amount, status, and due date.', method: 'GET', path: '/invoices', params: [p.query('limit', 'integer', 'Number of results (max 100)'), p.query('status[is]', 'string', 'Filter: paid, posted, payment_due, not_paid, or voided', false, 'status[is]')] },
      { name: 'list_customers', description: 'List Chargebee customers with their email, company, and billing address.', method: 'GET', path: '/customers', params: [p.query('limit', 'integer', 'Number of results (max 100)'), p.query('email[is]', 'string', 'Filter by exact email address', false, 'email[is]')] },
    ],
  },

  // ── Twilio ────────────────────────────────────────────────────────────────────
  {
    id: 'twilio', name: 'Twilio', tagline: 'SMS, voice and messaging',
    description: 'Send and receive SMS messages and check message logs via the Twilio REST API.',
    category: 'Communication', color: '#F22F46', emoji: '📱',
    baseUrl: 'https://api.twilio.com/2010-04-01',
    auth: { type: 'api-key', hint: 'Go to console.twilio.com → Account Info. In the API Key field enter: Basic <base64 of "ACCOUNT_SID:AUTH_TOKEN">. Generate base64 at base64encode.net.', keyName: 'Authorization', keyIn: 'header' },
    signupUrl: 'https://www.twilio.com/try-twilio', docsUrl: 'https://www.twilio.com/docs/usage/api',
    tools: [
      { name: 'send_sms', description: 'Send an SMS message to a phone number from your Twilio number.', method: 'POST', path: '/Accounts/{AccountSid}/Messages.json', params: [p.path('AccountSid', 'string', 'Your Twilio Account SID (starts with AC)'), p.body('To', 'string', 'Recipient phone number in E.164 format, e.g. +5511999999999', true), p.body('From', 'string', 'Your Twilio phone number in E.164 format', true), p.body('Body', 'string', 'SMS message text (max 1600 characters)', true)] },
      { name: 'list_messages', description: 'List sent and received SMS messages in your Twilio account.', method: 'GET', path: '/Accounts/{AccountSid}/Messages.json', params: [p.path('AccountSid', 'string', 'Your Twilio Account SID'), p.query('To', 'string', 'Filter by recipient phone number'), p.query('From', 'string', 'Filter by sender phone number'), p.query('PageSize', 'integer', 'Results per page (max 1000)')] },
      { name: 'get_message', description: 'Get details for a specific SMS message: status, direction, and delivery info.', method: 'GET', path: '/Accounts/{AccountSid}/Messages/{MessageSid}.json', params: [p.path('AccountSid', 'string', 'Your Twilio Account SID'), p.path('MessageSid', 'string', 'Message SID starting with SM')] },
    ],
  },

  // ── Telegram Bot ──────────────────────────────────────────────────────────────
  {
    id: 'telegram', name: 'Telegram Bot', tagline: 'Send messages and manage bot chats',
    description: 'Send messages, photos, and files via your Telegram Bot. Get chat updates and manage bot interactions using the Telegram Bot API.',
    category: 'Communication', color: '#26A5E4', emoji: '✈️',
    baseUrl: 'https://api.telegram.org/bot{token}',
    auth: { type: 'none', hint: 'The bot token is part of the base URL. Update the base URL in Settings to https://api.telegram.org/bot<YOUR_BOT_TOKEN> after creating a bot via @BotFather.' },
    docsUrl: 'https://core.telegram.org/bots/api',
    tools: [
      { name: 'send_message', description: 'Send a text message to a Telegram chat or channel.', method: 'POST', path: '/sendMessage', params: [p.body('chat_id', 'string', 'Chat ID (number) or @channelusername', true), p.body('text', 'string', 'Message text. Supports HTML and Markdown formatting.', true), p.body('parse_mode', 'string', 'Formatting: HTML or Markdown'), p.body('reply_to_message_id', 'integer', 'Reply to a specific message ID')] },
      { name: 'get_updates', description: 'Get incoming messages and events for your bot.', method: 'GET', path: '/getUpdates', params: [p.query('offset', 'integer', 'Update ID offset — use last update_id + 1 to get new updates'), p.query('limit', 'integer', 'Max updates (max 100)'), p.query('timeout', 'integer', 'Long-polling timeout in seconds')] },
      { name: 'get_chat', description: 'Get info about a Telegram chat, group, or channel.', method: 'GET', path: '/getChat', params: [p.query('chat_id', 'string', 'Chat ID or @channelusername', true)] },
      { name: 'send_photo', description: 'Send a photo to a Telegram chat using a file URL.', method: 'POST', path: '/sendPhoto', params: [p.body('chat_id', 'string', 'Chat ID or @channelusername', true), p.body('photo', 'string', 'Photo URL (HTTPS) or file_id', true), p.body('caption', 'string', 'Photo caption (max 1024 chars)')] },
    ],
  },

  // ── Mailchimp ─────────────────────────────────────────────────────────────────
  {
    id: 'mailchimp', name: 'Mailchimp', tagline: 'Email campaigns, lists and analytics',
    description: 'Manage email lists, campaigns, and automation in Mailchimp. Update the base URL to your data center (us1.api.mailchimp.com, us6, etc.) from your account URL.',
    category: 'Communication', color: '#FFE01B', emoji: '🐒',
    baseUrl: 'https://us1.api.mailchimp.com/3.0',
    auth: { type: 'api-key', hint: 'Get your API key from Mailchimp → Account → Extras → API Keys. In the API Key field enter: Basic <base64 of "anystring:YOUR_API_KEY">. Also update the base URL to match your data center (check your account URL).', keyName: 'Authorization', keyIn: 'header' },
    signupUrl: 'https://login.mailchimp.com/signup/', docsUrl: 'https://mailchimp.com/developer/marketing/api/',
    tools: [
      { name: 'list_audiences', description: 'List all Mailchimp audience lists with their name, member count, and open rates.', method: 'GET', path: '/lists', params: [p.query('count', 'integer', 'Number of results (max 1000)'), p.query('fields', 'string', 'Fields to include, e.g. lists.id,lists.name,lists.stats')] },
      { name: 'get_audience_members', description: 'List subscribers in a Mailchimp audience with their email, status, and tags.', method: 'GET', path: '/lists/{list_id}/members', params: [p.path('list_id', 'string', 'Audience list ID'), p.query('status', 'string', 'Filter: subscribed, unsubscribed, cleaned, or pending'), p.query('count', 'integer', 'Number of results (max 1000)')] },
      { name: 'list_campaigns', description: 'List email campaigns with their type, subject, send date, and performance stats.', method: 'GET', path: '/campaigns', params: [p.query('count', 'integer', 'Number of results (max 1000)'), p.query('status', 'string', 'Filter by status: sent, draft, scheduled'), p.query('list_id', 'string', 'Filter by audience list ID')] },
      { name: 'get_campaign_report', description: 'Get performance stats for a sent campaign: opens, clicks, bounces, and unsubscribes.', method: 'GET', path: '/reports/{campaign_id}', params: [p.path('campaign_id', 'string', 'Campaign ID')] },
    ],
  },

  // ── Brevo ─────────────────────────────────────────────────────────────────────
  {
    id: 'brevo', name: 'Brevo', tagline: 'Email, SMS and marketing automation',
    description: 'Send transactional emails and SMS, manage contacts, and track campaign performance with Brevo (formerly Sendinblue).',
    category: 'Communication', color: '#0092FF', emoji: '📨',
    baseUrl: 'https://api.brevo.com/v3',
    auth: { type: 'api-key', hint: 'Go to Brevo → Profile → SMTP & API → API Keys and create a key.', keyName: 'api-key', keyIn: 'header' },
    signupUrl: 'https://www.brevo.com/free-email-marketing-tool/', docsUrl: 'https://developers.brevo.com/reference',
    tools: [
      { name: 'send_email', description: 'Send a transactional email immediately.', method: 'POST', path: '/smtp/email', params: [p.body('sender', 'object', 'Sender info, e.g. {"name":"Company","email":"noreply@co.com"}', true), p.body('to', 'array', 'Recipients, e.g. [{"email":"user@example.com","name":"User"}]', true), p.body('subject', 'string', 'Email subject', true), p.body('htmlContent', 'string', 'Email body as HTML'), p.body('textContent', 'string', 'Plain text fallback')] },
      { name: 'get_contacts', description: 'List Brevo contacts with their email, attributes, and list memberships.', method: 'GET', path: '/contacts', params: [p.query('limit', 'integer', 'Number of results (max 1000)'), p.query('offset', 'integer', 'Pagination offset'), p.query('modifiedSince', 'string', 'ISO date — return contacts modified after this date')] },
      { name: 'get_email_stats', description: 'Get delivery statistics for your transactional emails.', method: 'GET', path: '/smtp/statistics/events', params: [p.query('startDate', 'string', 'Start date in YYYY-MM-DD format'), p.query('endDate', 'string', 'End date in YYYY-MM-DD format'), p.query('event', 'string', 'Filter by event: delivered, opened, clicked, bounces, spam')] },
    ],
  },

  // ── WhatsApp Cloud API ────────────────────────────────────────────────────────
  {
    id: 'whatsapp', name: 'WhatsApp Business', tagline: 'Send messages via WhatsApp Cloud API',
    description: 'Send WhatsApp messages to customers using the Meta (Facebook) WhatsApp Cloud API. Requires a verified Meta Business account and a WhatsApp phone number.',
    category: 'Communication', color: '#25D366', emoji: '💚',
    baseUrl: 'https://graph.facebook.com/v20.0',
    auth: { type: 'bearer', hint: 'Get a System User Access Token from Meta Business Suite → Business Settings → System Users. Enable WhatsApp permissions.' },
    signupUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started', docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages',
    tools: [
      { name: 'send_text_message', description: 'Send a text message to a WhatsApp user.', method: 'POST', path: '/{phone_number_id}/messages', params: [p.path('phone_number_id', 'string', 'Your WhatsApp phone number ID from Meta Business Suite'), p.body('messaging_product', 'string', 'Must be "whatsapp"', true), p.body('to', 'string', 'Recipient phone in E.164 format, e.g. +5511999999999', true), p.body('type', 'string', 'Message type: text', true), p.body('text', 'object', 'Message body, e.g. {"body":"Hello!","preview_url":false}', true)] },
      { name: 'send_template_message', description: 'Send a pre-approved WhatsApp template message (required for first contact with customers).', method: 'POST', path: '/{phone_number_id}/messages', params: [p.path('phone_number_id', 'string', 'Your WhatsApp phone number ID'), p.body('messaging_product', 'string', 'Must be "whatsapp"', true), p.body('to', 'string', 'Recipient phone in E.164 format', true), p.body('type', 'string', 'Must be "template"', true), p.body('template', 'object', 'Template, e.g. {"name":"hello_world","language":{"code":"en_US"}}', true)] },
      { name: 'get_media_url', description: 'Retrieve the download URL for a WhatsApp media file received in a message.', method: 'GET', path: '/{media_id}', params: [p.path('media_id', 'string', 'Media ID from incoming message webhook payload')] },
    ],
  },

  // ── Vonage ────────────────────────────────────────────────────────────────────
  {
    id: 'vonage', name: 'Vonage', tagline: 'SMS, voice and verify',
    description: 'Send SMS messages, make voice calls, and run number verification flows with Vonage (formerly Nexmo). Widely used for OTP and notifications.',
    category: 'Communication', color: '#7C4DFF', emoji: '📞',
    baseUrl: 'https://rest.nexmo.com',
    auth: { type: 'none', hint: 'Vonage uses API Key and API Secret as query parameters. Add them as required parameters when calling each tool, or configure them in your project settings.' },
    signupUrl: 'https://dashboard.nexmo.com/sign-up', docsUrl: 'https://developer.vonage.com/api',
    tools: [
      { name: 'send_sms', description: 'Send an SMS message using the Vonage SMS API.', method: 'POST', path: '/sms/json', params: [p.body('api_key', 'string', 'Your Vonage API Key', true), p.body('api_secret', 'string', 'Your Vonage API Secret', true), p.body('to', 'string', 'Recipient phone in E.164 format, e.g. 5511999999999 (no +)', true), p.body('from', 'string', 'Sender ID or your Vonage virtual number', true), p.body('text', 'string', 'SMS message text', true)] },
      { name: 'check_balance', description: 'Check your current Vonage account balance.', method: 'GET', path: '/account/get-balance', params: [p.query('api_key', 'string', 'Your Vonage API Key', true), p.query('api_secret', 'string', 'Your Vonage API Secret', true)] },
    ],
  },

  // ── Alpha Vantage ─────────────────────────────────────────────────────────────
  {
    id: 'alphavantage', name: 'Alpha Vantage', tagline: 'Stock prices and financial data',
    description: 'Get real-time and historical stock prices, forex rates, and crypto data. Free tier available with 25 requests/day.',
    category: 'Data', color: '#1976D2', emoji: '📈',
    baseUrl: 'https://www.alphavantage.co',
    auth: { type: 'api-key', hint: 'Get a free API key at alphavantage.co/support/#api-key. Use "demo" as the key for testing a few endpoints.', keyName: 'apikey', keyIn: 'query' },
    signupUrl: 'https://www.alphavantage.co/support/#api-key', docsUrl: 'https://www.alphavantage.co/documentation/',
    tools: [
      { name: 'get_stock_quote', description: 'Get the latest price, volume, open, high, low, and change for a stock.', method: 'GET', path: '/query', params: [p.query('function', 'string', 'Must be "GLOBAL_QUOTE"', true), p.query('symbol', 'string', 'Stock ticker, e.g. AAPL, GOOGL, AMZN', true)] },
      { name: 'get_daily_prices', description: 'Get up to 20 years of daily open/close/high/low/volume data for a stock.', method: 'GET', path: '/query', params: [p.query('function', 'string', 'Must be "TIME_SERIES_DAILY"', true), p.query('symbol', 'string', 'Stock ticker, e.g. MSFT', true), p.query('outputsize', 'string', 'compact (last 100 days) or full (all available data)')] },
      { name: 'search_symbol', description: 'Search for a stock symbol by company name or keyword.', method: 'GET', path: '/query', params: [p.query('function', 'string', 'Must be "SYMBOL_SEARCH"', true), p.query('keywords', 'string', 'Company name or keyword, e.g. "Tesla" or "Apple"', true)] },
      { name: 'get_forex_rate', description: 'Get real-time currency exchange rate between any two currencies.', method: 'GET', path: '/query', params: [p.query('function', 'string', 'Must be "CURRENCY_EXCHANGE_RATE"', true), p.query('from_currency', 'string', 'Source currency code, e.g. USD or BTC', true), p.query('to_currency', 'string', 'Target currency code, e.g. BRL or ETH', true)] },
    ],
  },

  // ── Open Library ─────────────────────────────────────────────────────────────
  {
    id: 'openlibrary', name: 'Open Library', tagline: 'Books, authors and editions',
    description: 'Search millions of books and access author bios, edition details, and cover images from Open Library — the internet\'s largest open book catalog. No authentication required.',
    category: 'Data', color: '#E8272A', emoji: '📖',
    baseUrl: 'https://openlibrary.org',
    auth: { type: 'none', hint: '' },
    docsUrl: 'https://openlibrary.org/developers/api',
    tools: [
      { name: 'search_books', description: 'Search for books by title, author, ISBN, or keyword.', method: 'GET', path: '/search.json', params: [p.query('q', 'string', 'General search query', true), p.query('title', 'string', 'Filter by book title'), p.query('author', 'string', 'Filter by author name'), p.query('limit', 'integer', 'Number of results (max 100)')] },
      { name: 'get_book', description: 'Get metadata for a book by its Open Library key.', method: 'GET', path: '/works/{olid}.json', params: [p.path('olid', 'string', 'Open Library work ID, e.g. OL27516W')] },
      { name: 'get_author', description: 'Get an author\'s biography, birth date, and list of works.', method: 'GET', path: '/authors/{olid}.json', params: [p.path('olid', 'string', 'Open Library author ID, e.g. OL23919A')] },
      { name: 'get_isbn', description: 'Look up a book by ISBN-10 or ISBN-13.', method: 'GET', path: '/isbn/{isbn}.json', params: [p.path('isbn', 'string', 'Book ISBN-10 or ISBN-13, e.g. 9780140449136')] },
    ],
  },

  // ── IP-API ────────────────────────────────────────────────────────────────────
  {
    id: 'ipapi', name: 'IP Geolocation', tagline: 'Location data from IP addresses',
    description: 'Look up the country, city, ISP, and coordinates for any IP address. Free for up to 45 requests/minute. No authentication required.',
    category: 'Data', color: '#FF6B35', emoji: '🗺️',
    baseUrl: 'http://ip-api.com',
    auth: { type: 'none', hint: '' },
    docsUrl: 'https://ip-api.com/docs',
    tools: [
      { name: 'lookup_ip', description: 'Get country, city, region, ISP, latitude, and longitude for a specific IP address.', method: 'GET', path: '/json/{query}', params: [p.path('query', 'string', 'IP address (e.g. 8.8.8.8) or domain name (e.g. google.com)'), p.query('fields', 'string', 'Comma-separated fields: status,country,city,regionName,lat,lon,isp,org,as,query'), p.query('lang', 'string', 'Language for country/city names: en, de, es, pt-BR, fr, ja, zh-CN, ru')] },
      { name: 'lookup_my_ip', description: 'Get location information for the IP address making the request.', method: 'GET', path: '/json', params: [p.query('fields', 'string', 'Fields to return: status,country,city,regionName,lat,lon,isp,org')] },
      { name: 'batch_lookup', description: 'Look up location data for up to 100 IP addresses in a single request.', method: 'POST', path: '/batch', params: [p.body('queries', 'array', 'Array of query objects, e.g. [{"query":"8.8.8.8"},{"query":"1.1.1.1"}]', true)] },
    ],
  },

  // ── Unsplash ──────────────────────────────────────────────────────────────────
  {
    id: 'unsplash', name: 'Unsplash', tagline: 'High-quality free photos',
    description: 'Search and browse millions of high-resolution free photos from the Unsplash community. Great for content creation workflows.',
    category: 'Data', color: '#111111', emoji: '📷',
    baseUrl: 'https://api.unsplash.com',
    auth: { type: 'api-key', hint: 'Register an app at unsplash.com/oauth/applications. In the API Key field enter: Client-ID YOUR_ACCESS_KEY (include "Client-ID " prefix).', keyName: 'Authorization', keyIn: 'header' },
    signupUrl: 'https://unsplash.com/join', docsUrl: 'https://unsplash.com/documentation',
    tools: [
      { name: 'search_photos', description: 'Search Unsplash for photos matching a keyword.', method: 'GET', path: '/search/photos', params: [p.query('query', 'string', 'Search keywords, e.g. "mountain sunset" or "office workspace"', true), p.query('per_page', 'integer', 'Results per page (max 30)'), p.query('orientation', 'string', 'Filter: landscape, portrait, or squarish'), p.query('color', 'string', 'Filter by color: black_and_white, black, white, yellow, orange, red, purple, blue, green, teal')] },
      { name: 'get_random_photo', description: 'Get one or more random photos, optionally filtered by topic or search term.', method: 'GET', path: '/photos/random', params: [p.query('query', 'string', 'Optional search term to filter random photos'), p.query('orientation', 'string', 'Orientation: landscape, portrait, or squarish'), p.query('count', 'integer', 'Number of photos (max 30)')] },
      { name: 'get_photo', description: 'Get full details for a photo including EXIF data, location, and download URL.', method: 'GET', path: '/photos/{id}', params: [p.path('id', 'string', 'Photo ID from search results')] },
    ],
  },

  // ── Giphy ─────────────────────────────────────────────────────────────────────
  {
    id: 'giphy', name: 'Giphy', tagline: 'GIF search and trending content',
    description: 'Search millions of GIFs, get trending content, and translate words into GIFs using the Giphy API. Free tier available.',
    category: 'Data', color: '#00FF99', emoji: '🎞️',
    baseUrl: 'https://api.giphy.com/v1',
    auth: { type: 'api-key', hint: 'Create a free app at developers.giphy.com and copy the API Key. Use "dc6zaTOxFJmzC" as a beta key for basic testing.', keyName: 'api_key', keyIn: 'query' },
    signupUrl: 'https://developers.giphy.com/', docsUrl: 'https://developers.giphy.com/docs/api',
    tools: [
      { name: 'search_gifs', description: 'Search Giphy for GIFs matching a keyword.', method: 'GET', path: '/gifs/search', params: [p.query('q', 'string', 'Search query', true), p.query('limit', 'integer', 'Number of results (max 50)'), p.query('rating', 'string', 'Content rating: g, pg, pg-13, or r'), p.query('lang', 'string', '2-letter language code, e.g. en or pt')] },
      { name: 'get_trending_gifs', description: 'Get the currently trending GIFs on Giphy.', method: 'GET', path: '/gifs/trending', params: [p.query('limit', 'integer', 'Number of results (max 50)'), p.query('rating', 'string', 'Content rating: g, pg, pg-13, or r')] },
      { name: 'translate_to_gif', description: 'Translate a word or phrase to a single best-matching GIF.', method: 'GET', path: '/gifs/translate', params: [p.query('s', 'string', 'Word or phrase to translate, e.g. "excited" or "good morning"', true)] },
    ],
  },

  // ── Rawg ──────────────────────────────────────────────────────────────────────
  {
    id: 'rawg', name: 'RAWG', tagline: 'Video game database with 500k+ titles',
    description: 'The largest open video game database. Search games, browse genres, find top ratings, and get detailed game info. Free tier available.',
    category: 'Data', color: '#1A1A2E', emoji: '🎮',
    baseUrl: 'https://api.rawg.io/api',
    auth: { type: 'api-key', hint: 'Register for a free API key at rawg.io/apidocs.', keyName: 'key', keyIn: 'query' },
    signupUrl: 'https://rawg.io/login', docsUrl: 'https://rawg.io/apidocs',
    tools: [
      { name: 'search_games', description: 'Search RAWG for games by title with their rating, release date, and platforms.', method: 'GET', path: '/games', params: [p.query('search', 'string', 'Search query, e.g. "The Last of Us"', true), p.query('page_size', 'integer', 'Results per page (max 40)'), p.query('platforms', 'string', 'Filter by platform IDs (comma-separated): 4=PC, 18=PS4, 1=Xbox One, 7=Switch'), p.query('genres', 'string', 'Filter by genre slugs, e.g. action,rpg')] },
      { name: 'get_game', description: 'Get full details for a game: description, Metacritic score, release date, and developer.', method: 'GET', path: '/games/{id}', params: [p.path('id', 'string', 'Game ID (number) or slug (e.g. the-witcher-3)')] },
      { name: 'list_genres', description: 'List all game genres with their game count and most popular games.', method: 'GET', path: '/genres', params: [p.query('page_size', 'integer', 'Results per page (max 40)')] },
    ],
  },

  // ── Deezer ────────────────────────────────────────────────────────────────────
  {
    id: 'deezer', name: 'Deezer', tagline: 'Music search and charts',
    description: 'Search tracks, albums, and artists on Deezer. Access global and country-specific music charts. No authentication required for public data.',
    category: 'Music & Media', color: '#A238FF', emoji: '🎶',
    baseUrl: 'https://api.deezer.com',
    auth: { type: 'none', hint: '' },
    docsUrl: 'https://developers.deezer.com/api',
    tools: [
      { name: 'search', description: 'Search Deezer for tracks, albums, or artists.', method: 'GET', path: '/search', params: [p.query('q', 'string', 'Search query, e.g. "artist:\\"Eminem\\" track:\\"Lose Yourself\\""', true), p.query('type', 'string', 'Type: track, album, artist, playlist, podcast, episode'), p.query('limit', 'integer', 'Number of results (max 25)')] },
      { name: 'get_chart', description: 'Get the top tracks, albums, artists, and playlists chart for a country.', method: 'GET', path: '/chart/{id}', params: [p.path('id', 'integer', 'Chart ID: 0 for global, or get country ID from /chart list')] },
      { name: 'get_track', description: 'Get full details for a track: title, artist, album, duration, and preview URL.', method: 'GET', path: '/track/{id}', params: [p.path('id', 'integer', 'Deezer track ID')] },
      { name: 'get_artist', description: 'Get an artist\'s profile: name, fan count, top tracks, and albums.', method: 'GET', path: '/artist/{id}', params: [p.path('id', 'integer', 'Deezer artist ID')] },
    ],
  },

  // ── Last.fm ───────────────────────────────────────────────────────────────────
  {
    id: 'lastfm', name: 'Last.fm', tagline: 'Music scrobbles, charts and tags',
    description: 'Get artist info, top tracks, user listening history, and music tags from Last.fm — the world\'s largest music listening database.',
    category: 'Music & Media', color: '#D51007', emoji: '🎵',
    baseUrl: 'https://ws.audioscrobbler.com/2.0',
    auth: { type: 'api-key', hint: 'Create an API account at last.fm/api/account/create to get a free API key.', keyName: 'api_key', keyIn: 'query' },
    signupUrl: 'https://www.last.fm/api/account/create', docsUrl: 'https://www.last.fm/api',
    tools: [
      { name: 'get_artist_info', description: 'Get an artist\'s biography, tags, similar artists, and listener statistics.', method: 'GET', path: '/', params: [p.query('method', 'string', 'Must be "artist.getinfo"', true), p.query('artist', 'string', 'Artist name, e.g. "Radiohead"', true), p.query('format', 'string', 'Must be "json"', true)] },
      { name: 'get_top_tracks', description: 'Get the globally top-played tracks on Last.fm for a period.', method: 'GET', path: '/', params: [p.query('method', 'string', 'Must be "chart.getTopTracks"', true), p.query('format', 'string', 'Must be "json"', true), p.query('limit', 'integer', 'Number of tracks (max 1000)'), p.query('page', 'integer', 'Page number')] },
      { name: 'search_track', description: 'Search for tracks by name and optionally by artist.', method: 'GET', path: '/', params: [p.query('method', 'string', 'Must be "track.search"', true), p.query('track', 'string', 'Track name to search for', true), p.query('artist', 'string', 'Filter by artist name'), p.query('format', 'string', 'Must be "json"', true), p.query('limit', 'integer', 'Number of results (max 30)')] },
    ],
  },

  // ── Anthropic Claude ──────────────────────────────────────────────────────────
  {
    id: 'anthropic', name: 'Anthropic (Claude)', tagline: 'Claude AI — messages and vision',
    description: 'Call Claude AI models directly via the Anthropic API. Supports text, vision (image input), and long-context tasks.',
    category: 'AI', color: '#D4A574', emoji: '🤖',
    baseUrl: 'https://api.anthropic.com/v1',
    auth: { type: 'api-key', hint: 'Get an API key at console.anthropic.com. Note: you must also send the header "anthropic-version: 2023-06-01" — add it via the project auth settings after creation.', keyName: 'x-api-key', keyIn: 'header' },
    signupUrl: 'https://console.anthropic.com/', docsUrl: 'https://docs.anthropic.com/en/api',
    tools: [
      { name: 'create_message', description: 'Send a message to a Claude model and get a response. Supports system prompts, multi-turn conversations, and image inputs.', method: 'POST', path: '/messages', params: [p.body('model', 'string', 'Claude model, e.g. claude-sonnet-4-6, claude-opus-4-8, or claude-haiku-4-5-20251001', true), p.body('max_tokens', 'integer', 'Maximum tokens in the response (required by API)', true), p.body('messages', 'array', 'Messages: [{role:"user"|"assistant",content:"text or array of content blocks"}]', true), p.body('system', 'string', 'System prompt to set Claude\'s behavior'), p.body('temperature', 'number', 'Randomness 0–1. Default 1.')] },
    ],
  },

  // ── Mistral AI ────────────────────────────────────────────────────────────────
  {
    id: 'mistral', name: 'Mistral AI', tagline: 'European LLMs — fast and efficient',
    description: 'Run Mistral\'s open-weight and commercial language models. OpenAI-compatible API format with strong multilingual performance and EU data residency.',
    category: 'AI', color: '#FF7000', emoji: '🌬️',
    baseUrl: 'https://api.mistral.ai/v1',
    auth: { type: 'bearer', hint: 'Create an API key at console.mistral.ai. Free trial credits available.' },
    signupUrl: 'https://console.mistral.ai/', docsUrl: 'https://docs.mistral.ai/api/',
    tools: [
      { name: 'chat_completion', description: 'Send a message to a Mistral model and get a response.', method: 'POST', path: '/chat/completions', params: [p.body('model', 'string', 'Model: mistral-large-latest, mistral-small-latest, mistral-7b-instruct, or codestral-latest', true), p.body('messages', 'array', 'Messages: [{role:"user"|"assistant"|"system", content:"..."}]', true), p.body('temperature', 'number', 'Randomness 0–1'), p.body('max_tokens', 'integer', 'Max tokens in response')] },
      { name: 'list_models', description: 'List all available Mistral AI models.', method: 'GET', path: '/models', params: [] },
    ],
  },

  // ── Replicate ─────────────────────────────────────────────────────────────────
  {
    id: 'replicate', name: 'Replicate', tagline: 'Run AI models in the cloud',
    description: 'Run thousands of open-source AI models — image generation, speech, video, and more — via a simple REST API.',
    category: 'AI', color: '#000000', emoji: '🧬',
    baseUrl: 'https://api.replicate.com/v1',
    auth: { type: 'bearer', hint: 'Create an API token at replicate.com/account/api-tokens.' },
    signupUrl: 'https://replicate.com/signin', docsUrl: 'https://replicate.com/docs/reference/http',
    tools: [
      { name: 'run_model', description: 'Run an AI model on Replicate and get a prediction. Provide the model version and inputs.', method: 'POST', path: '/predictions', params: [p.body('version', 'string', 'Model version ID from the Replicate model page', true), p.body('input', 'object', 'Input parameters for the model, e.g. {"prompt":"a cat on the moon","width":512,"height":512}', true)] },
      { name: 'get_prediction', description: 'Get the status and output of a prediction (model run).', method: 'GET', path: '/predictions/{prediction_id}', params: [p.path('prediction_id', 'string', 'Prediction ID from run_model response')] },
      { name: 'list_models', description: 'Browse popular public models on Replicate.', method: 'GET', path: '/models', params: [p.query('cursor', 'string', 'Pagination cursor')] },
    ],
  },

  // ── Hugging Face ──────────────────────────────────────────────────────────────
  {
    id: 'huggingface', name: 'Hugging Face', tagline: 'Open AI models and inference API',
    description: 'Run inference on thousands of open-source AI models — text generation, classification, image generation, audio, and more — via the Hugging Face Inference API.',
    category: 'AI', color: '#FFD21E', emoji: '🤗',
    baseUrl: 'https://api-inference.huggingface.co/models',
    auth: { type: 'bearer', hint: 'Create a User Access Token at huggingface.co/settings/tokens with "Inference" permissions.' },
    signupUrl: 'https://huggingface.co/join', docsUrl: 'https://huggingface.co/docs/api-inference',
    tools: [
      { name: 'text_generation', description: 'Generate text with a language model (e.g. GPT-2, Mistral, Llama).', method: 'POST', path: '/gpt2', params: [p.body('inputs', 'string', 'Text prompt to continue', true), p.body('parameters', 'object', 'Options, e.g. {"max_new_tokens":200,"temperature":0.7}')] },
      { name: 'text_classification', description: 'Classify text into categories (sentiment, topic, etc.) using a fine-tuned model.', method: 'POST', path: '/distilbert-base-uncased-finetuned-sst-2-english', params: [p.body('inputs', 'string', 'Text to classify', true)] },
      { name: 'image_to_text', description: 'Generate a text description (caption) for an image using a vision model.', method: 'POST', path: '/Salesforce/blip-image-captioning-large', params: [p.body('inputs', 'string', 'Image URL (public HTTPS) or base64-encoded image data', true)] },
    ],
  },

  // ── Stability AI ──────────────────────────────────────────────────────────────
  {
    id: 'stability', name: 'Stability AI', tagline: 'AI image generation (Stable Diffusion)',
    description: 'Generate, edit, and upscale images using Stable Diffusion models via the Stability AI REST API. The industry standard for AI image generation.',
    category: 'AI', color: '#6200EA', emoji: '🎨',
    baseUrl: 'https://api.stability.ai/v2beta',
    auth: { type: 'bearer', hint: 'Create an API key at platform.stability.ai/account/keys.' },
    signupUrl: 'https://platform.stability.ai/', docsUrl: 'https://platform.stability.ai/docs/api-reference',
    tools: [
      { name: 'generate_image', description: 'Generate an image from a text prompt using Stable Diffusion.', method: 'POST', path: '/stable-image/generate/core', params: [p.body('prompt', 'string', 'Text description of the image to generate', true), p.body('negative_prompt', 'string', 'Things to exclude from the image'), p.body('output_format', 'string', 'Output format: png, jpeg, or webp'), p.body('aspect_ratio', 'string', 'Aspect ratio: 1:1, 16:9, 9:16, 4:3, 3:2, etc.'), p.body('seed', 'integer', 'Seed for reproducibility (0 for random)')] },
    ],
  },

  // ── Perplexity AI ─────────────────────────────────────────────────────────────
  {
    id: 'perplexity', name: 'Perplexity AI', tagline: 'AI with real-time web search',
    description: 'Query Perplexity AI models that combine LLM reasoning with real-time web search. Get cited, up-to-date answers on any topic.',
    category: 'AI', color: '#20B2AA', emoji: '🔍',
    baseUrl: 'https://api.perplexity.ai',
    auth: { type: 'bearer', hint: 'Generate an API key in your Perplexity account settings at perplexity.ai/settings/api.' },
    signupUrl: 'https://www.perplexity.ai/settings/api', docsUrl: 'https://docs.perplexity.ai/reference/post_chat_completions',
    tools: [
      { name: 'search_and_answer', description: 'Ask a question and get an AI-generated answer with web citations. Uses sonar models for online search.', method: 'POST', path: '/chat/completions', params: [p.body('model', 'string', 'Model: sonar, sonar-pro, or sonar-reasoning-pro', true), p.body('messages', 'array', 'Messages: [{role:"user",content:"Your question here"}]', true), p.body('search_recency_filter', 'string', 'Limit search to: month, week, day, or hour'), p.body('return_citations', 'boolean', 'Include source URLs in the response')] },
    ],
  },

  // ── Together AI ───────────────────────────────────────────────────────────────
  {
    id: 'together', name: 'Together AI', tagline: 'Open-source LLMs at scale',
    description: 'Run Llama, Mixtral, DBRX, and hundreds of other open-source models via an OpenAI-compatible API at very competitive prices.',
    category: 'AI', color: '#0057FF', emoji: '🤝',
    baseUrl: 'https://api.together.xyz/v1',
    auth: { type: 'bearer', hint: 'Create a free API key at api.together.xyz/settings/api-keys. Comes with free credits.' },
    signupUrl: 'https://api.together.xyz/', docsUrl: 'https://docs.together.ai/reference/completions',
    tools: [
      { name: 'chat_completion', description: 'Chat with any open-source LLM via Together AI\'s OpenAI-compatible endpoint.', method: 'POST', path: '/chat/completions', params: [p.body('model', 'string', 'Model ID, e.g. meta-llama/Llama-3.3-70B-Instruct-Turbo, mistralai/Mixtral-8x7B-Instruct-v0.1', true), p.body('messages', 'array', 'Messages: [{role:"user"|"assistant"|"system",content:"..."}]', true), p.body('temperature', 'number', 'Randomness 0–2'), p.body('max_tokens', 'integer', 'Max tokens in response')] },
      { name: 'list_models', description: 'List all available models on Together AI with their context length and pricing.', method: 'GET', path: '/models', params: [p.query('type', 'string', 'Filter by type: chat, language, image, or embedding')] },
    ],
  },

  // ── ElevenLabs ────────────────────────────────────────────────────────────────
  {
    id: 'elevenlabs', name: 'ElevenLabs', tagline: 'Text-to-speech and voice cloning',
    description: 'Convert text to ultra-realistic speech, clone voices, and manage audio projects with ElevenLabs — the leading AI voice platform.',
    category: 'AI', color: '#FFC107', emoji: '🔊',
    baseUrl: 'https://api.elevenlabs.io/v1',
    auth: { type: 'api-key', hint: 'Find your API key in ElevenLabs → Profile Settings → API Key.', keyName: 'xi-api-key', keyIn: 'header' },
    signupUrl: 'https://elevenlabs.io/sign-up', docsUrl: 'https://elevenlabs.io/docs/api-reference',
    tools: [
      { name: 'text_to_speech', description: 'Convert text to speech using a specific ElevenLabs voice. Returns audio data.', method: 'POST', path: '/text-to-speech/{voice_id}', params: [p.path('voice_id', 'string', 'Voice ID from list_voices, e.g. 21m00Tcm4TlvDq8ikWAM for Rachel'), p.body('text', 'string', 'Text to synthesize (max 5000 characters per request)', true), p.body('model_id', 'string', 'Model: eleven_turbo_v2_5, eleven_multilingual_v2, or eleven_flash_v2_5'), p.body('voice_settings', 'object', 'Optional settings, e.g. {"stability":0.5,"similarity_boost":0.75}')] },
      { name: 'list_voices', description: 'List all available ElevenLabs voices including cloned and pre-made voices.', method: 'GET', path: '/voices', params: [] },
      { name: 'get_models', description: 'List all TTS models available on ElevenLabs with their languages and features.', method: 'GET', path: '/models', params: [] },
    ],
  },
]

export const TEMPLATE_CATEGORIES = ['All', ...Array.from(new Set(API_TEMPLATES.map((t) => t.category))).sort()]
