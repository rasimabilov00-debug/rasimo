const INVALID_WEBSITE_VALUES = new Set([
  "",
  "n/a",
  "na",
  "null",
  "none",
  "-",
  "#",
]);

const INVALID_WEBSITE_HOSTS = new Set([
  "example.com",
  "www.example.com",
  "example.org",
  "www.example.org",
  "example.net",
  "www.example.net",
  "localhost",
  "127.0.0.1",
]);

const NON_OFFICIAL_HOST_KEYWORDS = [
  "google.com",
  "maps.google",
  "goo.gl",
  "tripadvisor.",
  "restaurantguru.",
  "welovebudapest.",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "wolt.com",
  "foodora.",
  "ubereats.",
  "yelp.",
  "foursquare.",
  "tasteatlas.",
  "wanderlog.",
];

const WEBSITE_FIELDS = ["Website", "website", "website_link", "link"];

// Verified/curated website overrides by restaurant name.
// Use null when we explicitly want no link for placeholder/fake entries.
// This is the main place to add manual website mappings.
const WEBSITE_OVERRIDES = [
  { match: "aranybastya", website: "https://en.aranybastya.com/" },
  { match: "badburger and more budapest", website: "http://www.badburgerandmore.hu/" },
  { match: "baltazar grill restaurant", website: "https://baltazarbudapest.com/dining/" },
  { match: "bamba marha", website: "https://www.bambamarha.hu/" },
  { match: "bonnie goulash", website: "https://www.bonnie-goulashandlangoshbar.hu/menu/" },
  { match: "bors gastro bar", website: "https://bors-gastro-bar.weeblyte.com/" },
  { match: "budapest bites", website: "https://budapestbites.com/" },
  { match: "budapest goulash", website: "https://goulashandlangoshbar.hu/en/" },
  { match: "buddys burger", website: "https://buddysburger.hu/" },
  { match: "burger king", website: "https://www.burgerking.hu/" },
  { match: "cafe brunch budapest", website: "https://www.cafebrunchbudapest.com/" },
  { match: "drum cafe budapest", website: "https://drumcafe.hu/" },
  { match: "eat me", website: "https://eatmebudapest.hu/" },
  { match: "fat mama", website: "https://fatmama.hu/" },
  { match: "final table budapest", website: "https://www.finaltablerestaurant.com/" },
  { match: "flava cafe brunch", website: "https://flava.hu/en/flava-cafe-brunch/" },
  { match: "frici papa", website: "http://fricipapa.hu/" },
  { match: "goodbar goodburger", website: "https://goodbar.hu/" },
  { match: "hilda budapest", website: "https://hildapest.hu/" },
  { match: "ildiko konyhaja", website: "http://www.ildiko-konyhaja.hu/" },
  { match: "istanbul kebab", website: "https://www.istanbulkebab.hu/" },
  { match: "kfc", website: "https://www.kfc.hu/" },
  { match: "kisharang", website: "https://www.kisharang.hu/" },
  { match: "kollazs", website: "https://www.fourseasons.com/budapest/dining/restaurants/kollazs_brasserie_and_bar/" },
  { match: "le petit beefbar budapest", website: "https://beefbar.com/petit-beefbar-budapest/" },
  { match: "leo bistro", website: "https://www.leobudapest.hu/en" },
  { match: "leo rooftop budapest", website: "http://www.leobudapest.hu/" },
  { match: "lucky 7 burgers", website: "http://www.lucky7burgers.com/" },
  { match: "mazel tov", website: "https://mazeltov.hu/" },
  { match: "memories all-you-can-eat brunch", website: "https://www.hotel-memories-budapest.com/cafe" },
  { match: "parasztkonyha", website: "https://parasztkonyha.com/" },
  { match: "pipeline burger budapest", website: null },
  { match: "pipeline pizza house", website: null },
  { match: "pipeline kebab spot", website: null },
  { match: "retek bisztro", website: "http://www.retekbisztro.hu/" },
  { match: "retro langos", website: "https://retrolangos.hu/en/" },
  { match: "smart kitchen", website: null },
  { match: "smashy burger", website: "https://www.smashyclub.com/budapest" },
  { match: "spoon the boat", website: "https://spoonboat.hu/en/taste-the-globe-on-the-board/" },
  { match: "street food karavan", website: "https://karavanbudapest.hu/" },
  { match: "tokio", website: "https://tokiobudapest.com/en/" },
  { match: "tosti budapest", website: "https://tostibudapest.com/" },
  { match: "trattoria pomo doro", website: "http://www.pomodorobudapest.com/" },
  { match: "tuning bar&burger", website: "https://www.tuningburger.hu/en/home/" },
  { match: "twentysix budapest", website: "http://www.twentysixbudapest.com/" },
  { match: "vakvarju", website: "https://pest.vakvarju.com/" },
  { match: "vibe budapest", website: "https://vibebudapest.com/en/" },
];

const toStringValue = (value) => (value ?? "").toString().trim();

const normalizeName = (value) =>
  toStringValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

const getOverrideWebsite = (restaurant = {}) => {
  const name = normalizeName(
    restaurant["Restaurant Name"] || restaurant.name || restaurant.title
  );

  if (!name) return undefined;

  const match = WEBSITE_OVERRIDES.find((rule) =>
    name.includes(normalizeName(rule.match))
  );
  if (!match) return undefined;

  return match.website;
};

const getWebsiteCandidate = (restaurant = {}) => {
  for (const field of WEBSITE_FIELDS) {
    const value = toStringValue(restaurant[field]);
    if (value) return value;
  }

  const linksWebsite = toStringValue(restaurant?.links?.website);
  if (linksWebsite) return linksWebsite;

  return "";
};

export const normalizeWebsiteUrl = (value) => {
  const raw = toStringValue(value);
  if (!raw) return null;

  const normalizedRaw = raw.toLowerCase();
  if (INVALID_WEBSITE_VALUES.has(normalizedRaw)) return null;

  if (/^(javascript|data|vbscript):/i.test(raw)) return null;

  let candidate = raw;

  if (candidate.startsWith("//")) {
    candidate = `https:${candidate}`;
  } else if (!/^[a-z][a-z\d+\-.]*:\/\//i.test(candidate)) {
    if (/\s/.test(candidate)) return null;
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    if (!parsed.hostname) return null;

    const host = parsed.hostname.toLowerCase();
    if (INVALID_WEBSITE_HOSTS.has(host)) return null;
    if (host.endsWith(".local")) return null;
    if (NON_OFFICIAL_HOST_KEYWORDS.some((keyword) => host.includes(keyword))) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
};

export const getRestaurantWebsiteUrl = (restaurant = {}) => {
  const overrideWebsite = getOverrideWebsite(restaurant);
  if (overrideWebsite === null) return null;
  if (overrideWebsite !== undefined) {
    return normalizeWebsiteUrl(overrideWebsite);
  }

  const candidate = getWebsiteCandidate(restaurant);
  return normalizeWebsiteUrl(candidate);
};
