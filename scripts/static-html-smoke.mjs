import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const HOMEPAGE_SMOKE_CHECKS = {
  tr: {
    routePath: "/",
    expectedText: [
      "Risale-i Nur dersleri için hazır soru kağıtları ve bilgi kartları",
      "Kitapları Gör",
      "Örnek Ders Akışı",
      'href="#books"',
      'href="#lesson-flow"',
      "Seviyeler okul sınıflarına göredir. Sınıflar ayrı bir medrese sınıflandırması değildir.",
      "2. sınıf seviyesi",
      "2-3. sınıflar",
      "Lise sonrası seviye",
      "lise mezunu ve üzeri",
      "Karışık yaş gruplarıyla aynı ders",
      "talebeyi ilgili paragrafa yönlendirsin",
      "Ne işe yarar?",
      "Bir ders nasıl yürütülür?",
      "Bu uygulama ne değildir?"
    ]
  },
  en: {
    routePath: "/en/",
    expectedText: [
      "Ready question sheets and flashcards for Risale lessons",
      "View Books",
      "Example Lesson Flow",
      'href="#books"',
      'href="#lesson-flow"',
      "Levels follow regular school grades. The classes are not a separate madrasa classification.",
      "2nd-grade level",
      "school grades 2-3",
      "Post-high-school level",
      "high-school graduates and above",
      "Mixed-age lesson sessions",
      "guide each student back to the relevant paragraph",
      "What does it help with?",
      "How does one lesson run?",
      "What this app is not"
    ]
  }
};

const REPRESENTATIVE_ROUTE_SMOKE_CHECKS = [
  HOMEPAGE_SMOKE_CHECKS.tr,
  HOMEPAGE_SMOKE_CHECKS.en,
  {
    routePath: "/books/meyve-risalesi/",
    expectedText: ["Meyve Risalesi", "data-part-search", "Parçalarda ara", "Okul sınıf aralığı", "Tüm okul aralıkları", "106 sonuç bulundu"]
  },
  {
    routePath: "/en/books/meyve-risalesi/",
    expectedText: ["Meyve Risalesi", "data-part-search", "Search parts", "School grade range", "All school ranges", "106 results found"]
  },
  {
    routePath: "/books/meyve-risalesi/parts/p55/",
    expectedText: [
      "Parça P55",
      "İndirmeler ve Çalışmalar",
      "farklı yaşlardan talebeler aynı parçayı",
      "2. sınıf seviyesi - 2-3. okul sınıfları için materyalleri",
      "Bilgi Kartlarını Çalış",
      "Soru Kağıdı"
    ]
  },
  {
    routePath: "/en/books/meyve-risalesi/parts/p55/",
    expectedText: [
      "Part P55",
      "Downloads and Studies",
      "Students from different ages can work on this same part",
      "2nd-grade level - for school grades 2-3 materials",
      "Study Flashcards",
      "Question Sheet"
    ]
  },
  {
    routePath: "/study/?book=meyve-risalesi&grade=8-sinif&part=p55",
    expectedText: [
      "data-study-root",
      "data-study-index-url",
      "/assets/study-index.generated.json",
      "data-study-grade-context-json",
      "Kartın sorusunu okuyun, cevabı düşünün, sonra kartı çevirin",
      "Cevabı göster",
      "Metni Gör",
      "study-shell-fallback"
    ]
  },
  {
    routePath: "/en/study/?book=meyve-risalesi&grade=8-sinif&part=p55",
    expectedText: [
      "data-study-root",
      "data-study-index-url",
      "/assets/study-index.generated.json",
      "data-study-grade-context-json",
      "Read the question, think of the answer, then reveal the card",
      "Show answer",
      "View Text",
      "study-shell-fallback"
    ]
  }
];

const AUGMENTATION_ROUTE_SMOKE_CHECKS = [
  {
    routePath: "/books/kucuk-sozler/",
    expectedText: ["Kişisel artırılmış parçalarım", "Yedeği Dışa Aktar", "Yedek İçe Aktar"]
  },
  {
    routePath: "/books/kucuk-sozler/parts/p08/",
    expectedText: ["Bu Parçayı Artır", "Parçalardan Kişisel Çalışma Oluştur"]
  },
  {
    routePath: "/books/kucuk-sozler/my-augmentations/view/",
    expectedText: ["Kişisel artırılmış parça", "Artırma verileri yükleniyor"]
  },
  {
    routePath: "/en/books/kucuk-sozler/my-augmentations/view/",
    expectedText: ["Personal augmented part", "Loading augmentation data"]
  }
];

export function normalizeRouteToHtmlPath(distRoot, routePath) {
  const cleanRoute = routePath.split(/[?#]/, 1)[0] || "/";
  const routeWithoutSlashes = cleanRoute.replace(/^\/+|\/+$/g, "");

  if (!routeWithoutSlashes) {
    return join(distRoot, "index.html");
  }

  if (routeWithoutSlashes.endsWith(".html")) {
    return join(distRoot, routeWithoutSlashes);
  }

  return join(distRoot, routeWithoutSlashes, "index.html");
}

export function assertHtmlIncludes(html, expectedText, routePath) {
  const missing = expectedText.filter((item) => !html.includes(item));

  if (missing.length > 0) {
    throw new Error(`Missing expected HTML in ${routePath}: ${missing.join(", ")}`);
  }
}

export function getHomepageSmokeChecks(locale) {
  const check = HOMEPAGE_SMOKE_CHECKS[locale];

  if (!check) {
    throw new Error(`Unsupported homepage smoke locale: ${locale}`);
  }

  return {
    routePath: check.routePath,
    expectedText: [...check.expectedText]
  };
}

export function getRouteSmokeChecks() {
  return REPRESENTATIVE_ROUTE_SMOKE_CHECKS.map((check) => ({
    routePath: check.routePath,
    expectedText: [...check.expectedText]
  }));
}

export function getAugmentationRouteSmokeChecks() {
  return AUGMENTATION_ROUTE_SMOKE_CHECKS.map((check) => ({
    routePath: check.routePath,
    expectedText: [...check.expectedText]
  }));
}

export async function runStaticHtmlSmoke({ distRoot = "dist", checks = getRouteSmokeChecks() } = {}) {
  for (const check of checks) {
    const htmlPath = normalizeRouteToHtmlPath(distRoot, check.routePath);
    const html = await readFile(htmlPath, "utf8");

    assertHtmlIncludes(html, check.expectedText, check.routePath);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const distArgIndex = process.argv.indexOf("--dist");
  const distRoot = distArgIndex >= 0 ? process.argv[distArgIndex + 1] : "dist";

  const checks = process.argv.includes("--augmentation")
    ? [...getRouteSmokeChecks(), ...getAugmentationRouteSmokeChecks()]
    : getRouteSmokeChecks();
  await runStaticHtmlSmoke({ distRoot, checks });
  console.log("Static HTML smoke checks passed.");
}
