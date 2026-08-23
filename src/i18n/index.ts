import type { ThemeName } from "@/config/themes";

export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";

type ThemeText = Record<ThemeName, string>;

type UiDictionary = {
  localeName: string;
  layout: {
    siteTitle: string;
    defaultDescription: string;
    brandMeta: string;
    menu: string;
    primaryNavigation: string;
    languageSelector: string;
  };
  nav: {
    books: string;
    howItWorks: string;
    lessonFlow: string;
    theme: string;
    themes: (params: { theme: string }) => string;
  };
  common: {
    breadcrumb: string;
  };
  gradeRanges: {
    label: string;
    mixedAgeNote: string;
    postHighSchoolLabel: string;
  };
  actions: {
    open: string;
    read: string;
    primary: string;
    secondary: string;
  };
  home: {
    pageTitle: string;
    description: string;
    hero: {
      eyebrow: string;
      heading: string;
      lede: string;
      featureLabels: string[];
      primaryCta: string;
      secondaryCta: string;
      gradeLine: string;
    };
    stats: {
      label: string;
      books: string;
      parts: string;
      gradeLevels: string;
      formats: string;
      formatLabels: {
        word: string;
        pdf: string;
        mobilePdf: string;
      };
    };
    valueHeading: string;
    mixedAgeLead: string;
    valueCards: Array<{
      title: string;
      body: string;
    }>;
    lessonFlow: {
      intro: string;
      overviewHeading: string;
      overview: Array<{
        label: string;
        value: string;
      }>;
      mediaHeading: string;
      mediaLead: string;
      cardSystem: {
        heading: string;
        body: string;
        items: string[];
      };
      videos: Array<{
        title: string;
        description: string;
        duration: string;
      }>;
      videoDownloadLabel: string;
      heading: string;
      steps: Array<{
        phase: string;
        title: string;
        time: string;
        body: string;
        details: string[];
      }>;
      supportHeading: string;
      supportItems: Array<{
        title: string;
        body: string;
      }>;
      mixedAgeClass: {
        summary: string;
        body: string;
      };
    };
    desktopAppNote: {
      heading: string;
      body: string;
    };
    booksHeading: string;
  };
  library: {
    pageTitle: string;
    eyebrow: string;
    heading: string;
    lede: string;
    statsLabel: string;
    stats: {
      books: string;
      parts: string;
      docx: string;
      pdf: string;
    };
    emptyManifestPrefix: string;
    emptyManifestSuffix: string;
    bookSummaryAria: (params: { bookTitle: string }) => string;
    partCount: (params: { count: number }) => string;
  };
  book: {
    eyebrow: string;
    description: (params: { title: string }) => string;
    lede: (params: { partCount: number; gradeCount: number }) => string;
    guide: {
      heading: string;
      body: string;
    };
    searchLabel: string;
    searchPlaceholder: string;
    gradeLabel: string;
    allGrades: string;
    resultCount: (params: { count: number }) => string;
    noResults: string;
    capabilitiesLabel: (params: { partTitle: string }) => string;
    capabilities: {
      text: string;
      gradeLevels: (params: { count: number }) => string;
      flashcards: string;
      questionSheets: string;
    };
  };
  search: {
    triggers: {
      global: string;
      book: string;
    };
    placeholders: {
      global: string;
      book: string;
    };
    levels: {
      label: string;
      basic: string;
      advanced: string;
    };
    modes: {
      label: string;
      all: string;
      exact: string;
      boolean: string;
      proximity: string;
    };
    scopes: {
      label: string;
      text: string;
      title: string;
      partNo: string;
    };
    books: {
      label: string;
      all: string;
      selectAll: string;
      clearSelection: string;
      selectedCount: (params: { count: number }) => string;
      atLeastOne: string;
    };
    proximity: {
      label: string;
      distance: (params: { count: number }) => string;
    };
    help: {
      label: string;
      all: string;
      exact: string;
      boolean: string;
      wildcard: string;
      proximity: string;
      examplesLabel: string;
      examples: {
        boolean: string[];
        wildcard: string[];
      };
    };
    booleanBuilder: {
      label: string;
      description: string;
      firstTerm: string;
      nextTerm: string;
      operation: string;
      addRow: string;
      removeRow: string;
      operators: {
        AND: string;
        OR: string;
        NOT: string;
      };
    };
    status: {
      loading: string;
      progress: (params: { ready: number; total: number }) => string;
      provisional: (params: { ready: number; total: number }) => string;
      restored: string;
      ready: string;
      partialFailure: (params: { books: string }) => string;
      bookFailure: (params: { bookTitle: string }) => string;
    };
    errors: {
      parser: (params: { position: number }) => string;
      unexpectedToken: string;
      missingOperand: string;
      queryTooLong: string;
    };
    results: {
      count: (params: { count: number }) => string;
      fromText: string;
      noResults: string;
      fewerWords: string;
      enableText: string;
      clearBooks: string;
      clearGrade: string;
    };
    actions: {
      clear: string;
      close: string;
      retry: string;
      searchWithinBook: string;
      globalSearch: string;
    };
  };
  part: {
    eyebrow: (params: { partNo: string }) => string;
    description: (params: { partTitle: string; bookTitle: string }) => string;
    navigationLabel: string;
    previous: string;
    next: string;
    workflow: {
      heading: string;
      steps: string[];
    };
  };
  downloads: {
    label: string;
    heading: string;
    mixedAgeGuidance: string;
    variants: {
      BK: string;
      SK: string;
    };
    docx: string;
    pdf: string;
    mobilePdf: string;
    studyHint: string;
    questionSheetHint: string;
    gradeSummary: (params: { gradeLabel: string }) => string;
    openGrade: (params: { gradeLabel: string }) => string;
  };
  study: {
    availableHeading: string;
    start: string;
    cardCount: (params: { count: number }) => string;
    pageEyebrow: string;
    loading: string;
    instruction: string;
    question: string;
    answer: string;
    showAnswer: string;
    viewSource: string;
    sourceEyebrow: string;
    sourceLoading: string;
    sourceLoadError: string;
    sourceDone: string;
    ratings: {
      again: string;
      hard: string;
      good: string;
      easy: string;
    };
    ratingHints: {
      again: string;
      hard: string;
      good: string;
      easy: string;
    };
    status: {
      new: string;
      learning: string;
      review: string;
    };
    progress: (params: { current: number; total: number }) => string;
    complete: string;
    loadError: string;
  };
  augmentation: {
    launch: string;
    launchHelp: string;
    dialogTitle: string;
    intro: string;
    bookLabel: string;
    partsHeading: string;
    current: string;
    neighbor: string;
    selectNeighbors: string;
    selectedHeading: string;
    moveUp: string;
    moveDown: string;
    resetOrder: string;
    gradesHeading: string;
    selectAllGrades: string;
    create: string;
    cancel: string;
    loading: string;
    creating: string;
    loadError: string;
    selectAnotherPart: string;
    selectGrade: string;
    personalHeading: string;
    personalDescription: string;
    localBadge: string;
    noPersonal: string;
    exportWorkspace: string;
    importWorkspace: string;
    importComplete: string;
    backupWarning: string;
    detailEyebrow: string;
    sourcesHeading: string;
    sourceTextHeading: string;
    inactiveGrade: string;
    failedGrade: string;
    questionCount: string;
    setCount: string;
    study: string;
    exportUnavailable: string;
    prepareDocuments: string;
    preparingDocuments: string;
    exportsReady: string;
    exportFailed: string;
    exportServiceUnavailable: string;
    retryExport: string;
    downloadsHeading: string;
    flashcard: string;
    questionSheet: string;
    word: string;
    pdf: string;
    mobilePdf: string;
    rename: string;
    save: string;
    delete: string;
    deleteConfirm: string;
    missingProject: string;
  };
  themes: {
    pageTitle: string;
    eyebrow: string;
    currentHeading: (params: { theme: string }) => string;
    lede: string;
    apply: string;
    active: string;
    names: ThemeText;
    descriptions: ThemeText;
    swatchAria: (params: { theme: string }) => string;
  };
};

export const ui = {
  tr: {
    localeName: "Türkçe",
    layout: {
      siteTitle: "Risale Tedris Ağ Uygulaması",
      defaultDescription: "Risale kitap parçaları ve sınıf düzeyine göre belge indirmeleri.",
      brandMeta: "Kitaplar, parçalar, sınıf belgeleri",
      menu: "Menü",
      primaryNavigation: "Birincil gezinme",
      languageSelector: "Dil seçimi"
    },
    nav: {
      books: "Kitaplar",
      howItWorks: "Nasıl Oluyor?",
      lessonFlow: "Ders Akışı",
      theme: "Tema",
      themes: ({ theme }) => `Tema: ${theme}`
    },
    common: {
      breadcrumb: "Gezinti yolu"
    },
    gradeRanges: {
      label: "Okul sınıf aralığı",
      mixedAgeNote:
        "Farklı yaşlardan talebeler aynı parça üzerinde çalışabilir; her talebe kendi okul seviyesine uygun materyali kullanır.",
      postHighSchoolLabel: "Lise sonrası seviye"
    },
    actions: {
      open: "Aç",
      read: "Oku",
      primary: "Birincil işlem",
      secondary: "İkincil işlem"
    },
    home: {
      pageTitle: "Kitaplar",
      description:
        "Risale dersleri için hazırlanmış soru kağıtları, cevap anahtarları, Word/PDF çıktıları ve bilgi kartları.",
      hero: {
        eyebrow: "Ders materyali kütüphanesi",
        heading: "Risale-i Nur'dan Bir Dersi Her Yaşa Aynı Anda Nasıl Anlatırsınız?",
        lede: "",
        featureLabels: [
          "2. sınıf",
          "5. sınıf",
          "8. sınıf",
          "11. Sınıf",
          "6 farklı soru seti",
          "Otomatik hazırlama"
        ],
        primaryCta: "Nasıl Oluyor?",
        secondaryCta: "Ders Akışı",
        gradeLine: "Seviyeler okul sınıflarına göredir. Sınıflar ayrı bir medrese sınıflandırması değildir."
      },
      stats: {
        label: "Kütüphane özeti",
        books: "Kitap",
        parts: "Parça",
        gradeLevels: "Seviye",
        formats: "Format",
        formatLabels: {
          word: "Word",
          pdf: "PDF",
          mobilePdf: "Mobil PDF"
        }
      },
      valueHeading: "Ne işe yarar?",
      mixedAgeLead:
        "Bu sistem, aynı ders ortamında farklı yaşlardan talebelerin birlikte çalışabilmesi için hazırlanmıştır. Dersi yürüten kişi herkesle topluca aynı soruları çözmek yerine talebeleri kendi seviyelerine uygun materyallerle birebir takip eder.",
      valueCards: [
        {
          title: "Hazır soru kağıtları",
          body: "Dersi yürüten kişi her parça için hazır sorulara ve cevap anahtarlarına ulaşır."
        },
        {
          title: "Metne bağlı sorular",
          body: "Sorular genel kültürle değil, okunan risale parçasına bakarak cevaplanacak şekilde hazırlanmıştır."
        },
        {
          title: "Sınıf seviyesine göre içerik",
          body: "Aynı parça için farklı yaş seviyelerine uygun materyaller bulunur."
        },
        {
          title: "Etkileşimli bilgi kartları",
          body: "Ders öncesi hazırlık veya ders sonrası tekrar için kart çalışması yapılabilir."
        },
        {
          title: "Karışık yaş gruplarıyla aynı ders",
          body:
            "Aynı sınıfta farklı yaşlardan talebeler bulunabilir. Her talebe kendi okul seviyesine uygun bilgi kartı ve soru kağıdıyla çalışır."
        }
      ],
      lessonFlow: {
        intro:
          "Bu sayfa, bir dersin hazırlığından dönem sonu finaline kadar izlenecek uygulama sırasını gösterir.",
        overviewHeading: "Akış özeti",
        overview: [
          { label: "Ders öncesi", value: "Parçayı ve seviyeleri hazırla" },
          { label: "Ders içinde", value: "Kart → metin → soru" },
          { label: "Dönem sonunda", value: "Final → puan → ödül" }
        ],
        mediaHeading: "Bilgi kartlarının hazırlanması",
        mediaLead:
          "Bu video, bilgi kartlarının basım için nasıl hazırlandığını ve dört bölüme ayrılarak sınıfta nasıl dönüşümlü kullanıldığını anlatır.",
        cardSystem: {
          heading: "4 bölümlü kart sistemi",
          body:
            "Amaç, aynı anda daha fazla talebenin çalışmasını sağlamak ve bir talebe kendi bölümünü bitiremese bile metnin başından sonuna kadar ilerlemesini korumaktır.",
          items: [
            "24 kartlık bir set 4 bölümdür; her bölüm 6 kart içerir.",
            "İki set toplam 8 bölüm eder. Bu sayı öğrenci sayısından fazla olabilir; örneğin 6 öğrenci 8 bölümden sırayla yararlanır.",
            "Bir talebe kendi bölümünü bitirince bölümü kart havuzuna bırakır ve kalan bölümlerden yenisini alır.",
            "Bölümler 4'er adımlı sırayla hazırlanır: 1, 5, 9, 13…; 2, 6, 10, 14…; 3, 7, 11, 15…; 4, 8, 12, 16…. Böylece her öğrenci metnin başından sonuna yayılmış sorular görür."
          ]
        },
        videos: [
          {
            title: "Bilgi kartları nasıl hazırlanır ve kullanılır?",
            description:
              "24 kartlık bir set 4 bölüme ayrılır. Her bölüm 6 karttan oluşur ve 1, 5, 9… veya 2, 6, 10… gibi 4'er adımlı bir sırayla ilerler.",
            duration: "Hazırlama videosu"
          },
          {
            title: "Kartlar dağıtıldıktan sonra ilk akış",
            description:
              "Kartlar, dağıtımdan sonra her talebenin soru kağıtlarıyla nasıl eşleştirildiği ve ortak masadaki kartların nasıl değerlendirildiği gösterilir.",
            duration: "Dağıtım sonrası akış"
          },
          {
            title: "Karttan sözlü soru cevaplamak",
            description:
              "Talebelerle birebir örnekte, öğreticinin karttan rastgele soru sorarak çalışmayı kontrol etmesi anlatılır.",
            duration: "Kontrol videosu"
          },
          {
            title: "Kartların toplanması ve soruların dağıtılması",
            description:
              "Kartlar toplandıktan sonra farklı sınıf seviyelerindeki talebelere farklı soru kağıtlarının nasıl verildiği ve birebir takibin nasıl kurgulandığı açıklanır.",
            duration: "Soru dağıtım videosu"
          },
          {
            title: "Soru kâğıtları dağıtıldıktan sonra",
            description:
              "Kağıt başlığında konu ve isim bilgilerinin doğru yazılması, uygulama düzeltmeleri ve metinle çözme beklentisi vurgulanır.",
            duration: "Kağıt gözden geçirme"
          },
          {
            title: "Soru kağıtları birebir",
            description:
              "Talebe bir soruda zorlandığında öğretmenin cevabını vermeden yönlendirme ile doğru cevaba ulaştırması somut olarak gösterilir.",
            duration: "Birebir destek videosu"
          }
        ],
        videoDownloadLabel: "Videoyu indir",
        steps: [
          {
            phase: "Ders öncesi",
            title: "Parçayı ve materyali hazırlayın",
            time: "Başlamadan önce",
            body: "Kitabı ve o gün işlenecek parçayı seçin; ilgili sınıf seviyeleri için soru kağıtlarını, cevap anahtarlarını ve bilgi kartlarını açın.",
            details: [
              "Her öğrenci için okul sınıf aralığına uygun materyali ayırın.",
              "Aynı parça için farklı soru setleri varsa öğrenciler arasında paylaştırın."
            ]
          },
          {
            phase: "1. bölüm",
            title: "Bilgi kartlarıyla başlayın",
            time: "Yaklaşık 20 dakika",
            body: "Kartları dağıtın. Talebeler soruyu okuyup cevabı hatırlamaya çalışsın, ardından kartı çevirerek kontrol etsin.",
            details: [
              "Kısa ezber ve derse hazırlık için kullanılır.",
              "Süre bitince kartları toplayıp soru kağıtlarına geçin."
            ]
          },
          {
            phase: "2. bölüm",
            title: "Metni açın ve soru kağıtlarını dağıtın",
            time: "40 dakika – 1 saat",
            body: "Talebeler risale parçası açıkken kendi seviyelerine ait soruları cevaplasın. Cevap, genel bilgiden değil, okunan metinden bulunur.",
            details: [
              "Herkes aynı parçayı çalışabilir; çalışma materyali seviyeye göre farklılaşır.",
              "Gerekirse farklı yaş grupları aynı oturumda farklı parçalarla ilerleyebilir."
            ]
          },
          {
            phase: "Ders boyunca",
            title: "Öğretici dolaşır, yönlendirir ve kontrol eder",
            time: "Çalışma süresince",
            body: "Dersi yürüten kişi sınıfta dolaşır, talebelerin takıldığı yeri görür ve cevabı doğrudan vermeden ilgili paragrafa geri yönlendirir.",
            details: [
              "Cevap anahtarı kontrol için kullanılır.",
              "Farklı soru setleri birebir ilgiyi ve düzeni kolaylaştırır; cevabı doğrudan söylemeden talebeyi ilgili paragrafa yönlendirsin."
            ]
          },
          {
            phase: "Ders sonu",
            title: "Cevapları tamamlayın ve kısa tekrar yapın",
            time: "Kapanış",
            body: "Soru kağıtlarını cevap anahtarıyla kontrol edin; eksik veya yanlış kalan noktaları metne dönerek tamamlayın.",
            details: [
              "Bilgi kartları ders sonrasında tekrar için yeniden kullanılabilir.",
              "Bir sonraki derste hangi parçaya geçileceğini netleştirin."
            ]
          },
          {
            phase: "Dönem sonu",
            title: "Final sınavını dönem boyunca biriktirilen içerikten oluşturun",
            time: "Dönem sonunda",
            body: "Dönem içinde okunan bütün risalelerden soru seçin ve final sınavını oluşturun. Böylece tek bir parçayı değil, bütün dönemi tekrar ettirin.",
            details: [
              "Mevcut sorular arasından final sınavında kullanılacak soruları seçin.",
              "Sınav, o dönem gerçekten işlenen içerikle sınırlı tutulur."
            ]
          },
          {
            phase: "Final sonrası",
            title: "Puanları takip edin ve ödülü dağıtın",
            time: "Dönem kapanışı",
            body: "Final ve dönem içi çalışmaların puanlarını toplayın. Ödülü yalnızca ilk üçe değil, puanla orantılı biçimde dağıtmak daha geniş bir katılımı teşvik eder.",
            details: [
              "Puan ve ödül takibi bu web uygulamasında henüz otomatik değildir.",
              "Öğretici veya kurum puanları ayrıca kaydedip takip eder."
            ]
          }
        ],
        supportHeading: "Akışın üç sabit noktası",
        supportItems: [
          {
            title: "Metin masada açık kalır",
            body: "Soru, talebeyi ezberden değil, okunan paragraftan cevap bulmaya yönlendirir."
          },
          {
            title: "Materyal kişiye göre ayrılır",
            body: "Aynı derste farklı yaşlar bulunabilir; her talebe kendi okul seviyesindeki kart ve soru kağıdıyla çalışır."
          },
          {
            title: "Takip dönem boyunca sürer",
            body: "Ders içi çalışmalar finalde bir araya gelir; puan ve ödül süreci ayrıca takip edilerek kapanır."
          }
        ],
        mixedAgeClass: {
          summary: "Karışık sınıfta nasıl uygulanır?",
          body:
            "Aynı oturumda farklı yaşlardan talebeler bulunabilir. Gerekirse bazı yaş grupları aynı parçayı, bazıları farklı parçaları çalışabilir."
        }
      },
      desktopAppNote: {
        heading: "Bu uygulama ne değildir?",
        body:
          "Bu ağ uygulaması hazır materyalleri okumak, indirmek ve bilgi kartlarıyla çalışmak içindir. Soru kağıtlarını ve bilgi kartlarını yeniden hazırlama veya düzenleme işi ayrı masaüstü programıyla yapılır."
      },
      booksHeading: "Kitaplar"
    },
    library: {
      pageTitle: "Kitaplar",
      eyebrow: "Kütüphane",
      heading: "Kitaplar ve sınıf belgeleri",
      lede:
        "Her kitabı inceleyin, parçaları okuyun ve sınıf düzeyine göre Word/PDF dosyalarını indirin.\nEtkileşimli bilgi kartlarını çalışın",
      statsLabel: "Kütüphane istatistikleri",
      stats: {
        books: "Kitap",
        parts: "Parça",
        docx: "Word dosyası",
        pdf: "Hazır PDF dosyası"
      },
      emptyManifestPrefix: "Kütüphane dizinini varlıklardan oluşturmak için",
      emptyManifestSuffix: "komutunu çalıştırın.",
      bookSummaryAria: ({ bookTitle }) => `${bookTitle} özeti`,
      partCount: ({ count }) => `${count} parça`
    },
    book: {
      eyebrow: "Kitap",
      description: ({ title }) => `${title} için parçalar ve okul aralığı belgeleri.`,
      lede: ({ partCount, gradeCount }) =>
        `${partCount} parça, ${gradeCount} okul sınıf aralığı ve Bilgi Kartı/Soru Kağıdı çeşitleri için doğrudan belge indirmeleri.\nEtkileşimli bilgi kartları çalışmaları.`,
      guide: {
        heading: "Bu kitapta nasıl ilerlenir?",
        body:
          "Aşağıdan işlemek istediğiniz parçayı seçin. Her parçada metin, birden çok okul sınıf aralığı için soru kağıtları ve bilgi kartları bulunur."
      },
      searchLabel: "Parçalarda ara",
      searchPlaceholder: "Parça numarası veya başlık",
      gradeLabel: "Okul sınıf aralığı",
      allGrades: "Tüm okul aralıkları",
      resultCount: ({ count }) => `${count} sonuç bulundu`,
      noResults: "Sonuç bulunamadı",
      capabilitiesLabel: ({ partTitle }) => `${partTitle} materyal özeti`,
      capabilities: {
        text: "Metin var",
        gradeLevels: ({ count }) => `${count} okul aralığı`,
        flashcards: "Bilgi kartı",
        questionSheets: "Soru kağıdı"
      }
    },
    search: {
      triggers: {
        global: "Tüm kitaplarda ara",
        book: "Bu kitapta ara"
      },
      placeholders: {
        global: "Kitaplarda, başlıklarda ve metinlerde ara…",
        book: "Parça numarası, başlık veya metin"
      },
      levels: {
        label: "Arama düzeyi",
        basic: "Basit",
        advanced: "Gelişmiş"
      },
      modes: {
        label: "Arama seçeneği",
        all: "Tüm kelimeler",
        exact: "Tam ifade",
        boolean: "Mantıksal arama",
        proximity: "Yakınlık"
      },
      scopes: {
        label: "Şurada ara",
        text: "Parça metinleri",
        title: "Başlıklar",
        partNo: "Parça numaraları"
      },
      books: {
        label: "Kitaplar",
        all: "Tüm kitaplar",
        selectAll: "Tümünü seç",
        clearSelection: "Seçimi temizle",
        selectedCount: ({ count }) => `${count} kitap seçili`,
        atLeastOne: "En az bir kitap seçili kalmalıdır."
      },
      proximity: {
        label: "Kelime yakınlığı",
        distance: ({ count }) => `${count} kelime`
      },
      help: {
        label: "Arama yardımı",
        all: "Yazdığınız bütün kelimeleri içeren parçaları bulur.",
        exact: "Kelimeleri yazdığınız sırayla ve yan yana arar.",
        boolean: "AND/VE, OR/VEYA ve NOT/DEĞİL işleçlerini kabul eder.",
        wildcard: "Joker karakterler her aramada otomatik çalışır: birden çok karakter için * ve tek karakter için ? kullanın.",
        proximity: "Kelimeleri seçilen uzaklık içinde, sıra aramadan bulur.",
        examplesLabel: "Örnekler",
        examples: {
          boolean: [
            "iman AND nur: iki kelime de bulunmalı.",
            "iman OR rahmet: kelimelerden en az biri bulunmalı.",
            "iman AND NOT tabiat: iman bulunmalı, tabiat bulunmamalı."
          ],
          wildcard: [
            "rah*: rahmet, rahman gibi rah ile başlayan kelimeleri bulur.",
            "n?r: nur gibi ortasında tek harf bulunan kelimeleri bulur.",
            "iman*: iman, imanın, imani gibi aynı kökten başlayan kelimeleri bulur."
          ]
        }
      },
      booleanBuilder: {
        label: "Mantıksal arama oluşturucu",
        description: "Her satıra bir kelime veya ifade yazın; satırlar arasındaki ilişkiyi AND, OR veya NOT ile seçin.",
        firstTerm: "İlk metin",
        nextTerm: "Sonraki metin",
        operation: "İşlem",
        addRow: "Satır ekle",
        removeRow: "Satırı kaldır",
        operators: {
          AND: "AND — ikisi de bulunsun",
          OR: "OR — en az biri bulunsun",
          NOT: "NOT — bu metin bulunmasın"
        }
      },
      status: {
        loading: "Metin dizini hazırlanıyor…",
        progress: ({ ready, total }) => `${ready}/${total} kitap hazır`,
        provisional: ({ ready, total }) => `Sonuçlar geçici: ${ready}/${total} kitap hazır.`,
        restored: "Önceki arama sonuçları geri yüklendi.",
        ready: "Tüm seçili kitaplar aramaya hazır.",
        partialFailure: ({ books }) => `Bazı sonuçlar eksik olabilir. Yüklenemeyen kitaplar: ${books}`,
        bookFailure: ({ bookTitle }) => `${bookTitle} metin dizini yüklenemedi.`
      },
      errors: {
        parser: ({ position }) => `Arama ifadesinde ${position}. konumda bir sorun var.`,
        unexpectedToken: "Beklenmeyen bir arama işareti kullanıldı.",
        missingOperand: "Bir işlecin önünde veya arkasında arama kelimesi eksik.",
        queryTooLong: "Arama ifadesi 256 karakterden uzun olamaz."
      },
      results: {
        count: ({ count }) => `${count} sonuç bulundu`,
        fromText: "Metinden",
        noResults: "Aramanızla eşleşen parça bulunamadı.",
        fewerWords: "Daha az kelime veya farklı bir arama biçimi deneyin.",
        enableText: "Parça metinlerinde aramayı açın.",
        clearBooks: "Kitap seçimini temizleyin.",
        clearGrade: "Okul sınıf aralığını temizleyin."
      },
      actions: {
        clear: "Aramayı temizle",
        close: "Aramayı kapat",
        retry: "Yeniden dene",
        searchWithinBook: "Bu kitapta ara",
        globalSearch: "Tüm kitaplarda ara"
      }
    },
    part: {
      eyebrow: ({ partNo }) => `Parça ${partNo}`,
      description: ({ partTitle, bookTitle }) => `${partTitle}, ${bookTitle} içinde.`,
      navigationLabel: "Parçalar arasında gezinme",
      previous: "Önceki",
      next: "Sonraki",
      workflow: {
        heading: "Bu parçayla ne yapabilirim?",
        steps: [
          "Metni okuyun.",
          "Okul sınıf aralığını seçin.",
          "Bilgi kartlarını çalıştırın veya soru kağıdını indirin.",
          "Sorular metin açıkken cevaplanacak şekilde hazırlanmıştır."
        ]
      }
    },
    downloads: {
      label: "İndirmeler ve Çalışmalar",
      heading: "İndirmeler ve Çalışmalar",
      mixedAgeGuidance:
        "Bu bölümde farklı yaşlardan talebeler aynı parçayı çalışabilir; her talebe kendi okul sınıf aralığına uygun bilgi kartı veya soru kağıdını kullanır.",
      variants: {
        BK: "Bilgi Kartı",
        SK: "Soru Kağıdı"
      },
      docx: "Word",
      pdf: "PDF",
      mobilePdf: "Mobil PDF",
      studyHint: "Ders öncesi hazırlık veya tekrar için.",
      questionSheetHint: "Metin açıkken cevaplatmak için.",
      gradeSummary: ({ gradeLabel }) => `${gradeLabel} materyalleri`,
      openGrade: ({ gradeLabel }) => `${gradeLabel} materyallerini aç veya kapat`
    },
    study: {
      availableHeading: "Çalışma desteleri",
      start: "Bilgi Kartlarını Çalış",
      cardCount: ({ count }) => `${count} kart`,
      pageEyebrow: "Çalışma",
      loading: "Yükleniyor...",
      instruction:
        "Kartın sorusunu okuyun, cevabı düşünün, sonra kartı çevirin. Bu çalışma derse hazırlık veya tekrar için kullanılabilir.",
      question: "Soru",
      answer: "Cevap",
      showAnswer: "Cevabı göster",
      viewSource: "Metni Gör",
      sourceEyebrow: "Kaynak metin",
      sourceLoading: "Metin yükleniyor...",
      sourceLoadError: "Metin yüklenemedi.",
      sourceDone: "Çalışmaya dön",
      ratings: {
        again: "Tekrar",
        hard: "Zor",
        good: "İyi",
        easy: "Kolay"
      },
      ratingHints: {
        again: "Yakında",
        hard: "Sonra",
        good: "Bitti",
        easy: "Bitti"
      },
      status: {
        new: "Yeni",
        learning: "Öğrenme",
        review: "Gözden geçirme"
      },
      progress: ({ current, total }) => `${current} / ${total}`,
      complete: "Bu oturum tamamlandı.",
      loadError: "Çalışma destesi yüklenemedi."
    },
    augmentation: {
      launch: "Bu Parçayı Artır",
      launchHelp: "Bu metni diğer risale metinleriyle birleştirip daha büyük bir ders metni hazırlayın.",
      dialogTitle: "Parçalardan Kişisel Çalışma Oluştur",
      intro: "Açık parça korunur. Aynı kitaptan veya başka kitaplardan istediğiniz parçaları ekleyip sıralayın.",
      bookLabel: "Kitap",
      partsHeading: "Eklenebilecek parçalar",
      current: "Açık parça",
      neighbor: "Komşu",
      selectNeighbors: "Komşuları Seç",
      selectedHeading: "Nihai parça sırası",
      moveUp: "Yukarı",
      moveDown: "Aşağı",
      resetOrder: "Otomatik Sıraya Dön",
      gradesHeading: "Okul sınıf aralıkları",
      selectAllGrades: "Tüm uygun aralıkları seç",
      create: "Kişisel Parçayı Oluştur",
      cancel: "Vazgeç",
      loading: "Artırma verileri yükleniyor...",
      creating: "Sorular birleştiriliyor...",
      loadError: "Artırma verileri yüklenemedi.",
      selectAnotherPart: "En az bir ek parça seçin.",
      selectGrade: "En az bir okul aralığı seçin.",
      personalHeading: "Kişisel artırılmış parçalarım",
      personalDescription: "Bu kayıtlar yalnızca bu tarayıcı profilinde saklanır.",
      localBadge: "Yerel",
      noPersonal: "Bu kitap için henüz kişisel parça oluşturulmadı.",
      exportWorkspace: "Yedeği Dışa Aktar",
      importWorkspace: "Yedek İçe Aktar",
      importComplete: "Yedek içe aktarıldı.",
      backupWarning: "Tarayıcı verileri silinebilir; önemli çalışmaların yedeğini indirin.",
      detailEyebrow: "Kişisel artırılmış parça",
      sourcesHeading: "Parça sırası",
      sourceTextHeading: "Birleştirilmiş metin",
      inactiveGrade: "Bu okul aralığı artırılmadı.",
      failedGrade: "Bu okul aralığı oluşturulamadı.",
      questionCount: "Soru",
      setCount: "Seçilen set",
      study: "Bilgi Kartlarını Çalış",
      exportUnavailable: "Belge üretim hizmeti yapılandırılmadı.",
      prepareDocuments: "Belgeleri Hazırla",
      preparingDocuments: "Belgeler hazırlanıyor...",
      exportsReady: "Belgeler indirilmeye hazır.",
      exportFailed: "Belgeler hazırlanamadı:",
      exportServiceUnavailable: "Belge üretim hizmetine ulaşılamıyor. Geliştirme sunucusunu yeniden başlatıp tekrar deneyin.",
      retryExport: "Belgeleri Yeniden Hazırla",
      downloadsHeading: "İndirmeler ve Çalışmalar",
      flashcard: "Bilgi Kartı",
      questionSheet: "Soru Kağıdı",
      word: "Word",
      pdf: "PDF",
      mobilePdf: "Mobil PDF",
      rename: "Yeniden adlandır",
      save: "Kaydet",
      delete: "Sil",
      deleteConfirm: "Bu kişisel parça silinsin mi?",
      missingProject: "Kişisel parça bulunamadı veya tarayıcı verilerinden silinmiş."
    },
    themes: {
      pageTitle: "Temalar",
      eyebrow: "Tema önizleme",
      currentHeading: ({ theme }) => `Geçerli tema: ${theme}`,
      lede: "Bir tema seçin.",
      apply: "Uygula",
      active: "Seçili",
      names: {
        risaleTedris: "RisaleTedris",
        slate: "Arduvaz",
        field: "Saha",
        ink: "Mürekkep",
        school: "Okul"
      },
      descriptions: {
        risaleTedris: "RisaleTedris kimliğine uygun kırmızı vurgular ve sıcak, açık okuma yüzeyleri.",
        slate: "Deniz mavisi ve pas tonlu işlemlerle nötr okuma yüzeyi.",
        field: "Uzun listeler ve belge metinleri için yumuşak yeşil-mavi denge.",
        ink: "Belirgin camgöbeği ve mercan vurgulara sahip koyu arayüz.",
        school: "Mavi ve dut rengi vurgulara sahip açık akademik palet."
      },
      swatchAria: ({ theme }) => `${theme} renk örnekleri`
    }
  },
  en: {
    localeName: "English",
    layout: {
      siteTitle: "Risale Tadrees Web Application",
      defaultDescription: "Risale book parts and grade-specific document downloads.",
      brandMeta: "Books, parts, grade documents",
      menu: "Menu",
      primaryNavigation: "Primary navigation",
      languageSelector: "Language selection"
    },
    nav: {
      books: "Books",
      howItWorks: "How Does It Work?",
      lessonFlow: "Lesson Flow",
      theme: "Theme",
      themes: ({ theme }) => `Themes: ${theme}`
    },
    common: {
      breadcrumb: "Breadcrumb"
    },
    gradeRanges: {
      label: "School grade range",
      mixedAgeNote:
        "Students from different ages can work on the same part; each student uses material suited to their own school range.",
      postHighSchoolLabel: "Post-high-school level"
    },
    actions: {
      open: "Open",
      read: "Read",
      primary: "Primary action",
      secondary: "Secondary action"
    },
    home: {
      pageTitle: "Books",
      description:
        "Prepared question sheets, answer material, Word/PDF outputs, and flashcards for Risale lessons.",
      hero: {
        eyebrow: "Lesson material library",
        heading: "Ready question sheets and flashcards for Risale lessons",
        lede: "How do they manage so many different levels in a single system?",
        featureLabels: [
          "2nd grade",
          "5th grade",
          "8th grade",
          "11th grade",
          "6 different question sets",
          "Automatic preparation"
        ],
        primaryCta: "How Does It Work?",
        secondaryCta: "Lesson Flow",
        gradeLine: "Levels follow regular school grades. The classes are not a separate madrasa classification."
      },
      stats: {
        label: "Library summary",
        books: "Books",
        parts: "Parts",
        gradeLevels: "Levels",
        formats: "Formats",
        formatLabels: {
          word: "Word",
          pdf: "PDF",
          mobilePdf: "Mobile PDF"
        }
      },
      valueHeading: "What does it help with?",
      mixedAgeLead:
        "This system is prepared so students from different ages can study together in the same lesson setting. The lesson leader follows students one by one with material suited to their range instead of solving the same questions with everyone at once.",
      valueCards: [
        {
          title: "Prepared question sheets",
          body: "The lesson leader can reach prepared questions and answer material for each part."
        },
        {
          title: "Text-bound questions",
          body: "Questions are prepared to be answered from the Risale part being read, not from general knowledge."
        },
        {
          title: "Content by grade level",
          body: "The same part has material prepared for different age and study levels."
        },
        {
          title: "Interactive flashcards",
          body: "Flashcards can be used for preparation before the lesson or review after it."
        },
        {
          title: "Mixed-age lesson sessions",
          body:
            "Students from different ages can share one lesson. Each student works with flashcards and question sheets suited to their own school range."
        }
      ],
      lessonFlow: {
        intro:
          "This page shows the practical sequence from preparing a lesson to the end-of-term final.",
        overviewHeading: "Flow at a glance",
        overview: [
          { label: "Before class", value: "Prepare the part and levels" },
          { label: "In class", value: "Cards → text → questions" },
          { label: "At term end", value: "Final → points → rewards" }
        ],
        mediaHeading: "How the flashcards are prepared",
        mediaLead:
          "This video explains how the flashcards are prepared for printing and how four divisions are rotated in class.",
        cardSystem: {
          heading: "The four-division card system",
          body:
            "The aim is to let more students study at the same time while preserving a path through the text from beginning to end, even when a student cannot finish one division.",
          items: [
            "One 24-card set has 4 divisions; each division contains 6 cards.",
            "Two sets make 8 divisions in total. That can be more than the number of students; for example, 6 students can rotate through 8 divisions.",
            "When a student finishes a division, they return it to the card pool and take another remaining division.",
            "The divisions use a step size of 4: 1, 5, 9, 13…; 2, 6, 10, 14…; 3, 7, 11, 15…; 4, 8, 12, 16…. This lets every student encounter the text from beginning to end."
          ]
        },
        videos: [
          {
            title: "How the flashcards are prepared and used",
            description:
              "A 24-card set is divided into 4 divisions of 6 cards, with each division following a step-of-4 sequence such as 1, 5, 9â€¦ or 2, 6, 10â€¦.",
            duration: "Preparation video"
          },
          {
            title: "After cards are distributed",
            description:
              "Shows how students' question sheets are aligned with the card distribution and how undistributed cards on the shared table are integrated into class flow.",
            duration: "Class setup video"
          },
          {
            title: "Answering oral questions from a card",
            description:
              "Demonstrates one-to-one oral checking while students practice, where the instructor asks a random question from the student's card.",
            duration: "Oral check video"
          },
          {
            title: "Collecting cards and distributing questions",
            description:
              "Explains how cards are collected and how different question sheets are distributed by student and level for one-to-one follow-up.",
            duration: "Question handout video"
          },
          {
            title: "After question sheets are handed out",
            description:
              "Explains writing topic and names on the sheet, a correction note for combined passages, and using the text to answer the remaining questions.",
            duration: "Worksheet completion video"
          },
          {
            title: "One-to-one question solving",
            description:
              "After distribution, shows how a student is guided to the answer without direct confirmation from the instructor.",
            duration: "One-to-one coaching video"
          }
        ],
        videoDownloadLabel: "Download video",
        heading: "How does one lesson run from start to finish?",
        steps: [
          {
            phase: "Before class",
            title: "Prepare the part and materials",
            time: "Before starting",
            body: "Choose the book and part, then open the question sheets, answer keys, and flashcards for the relevant school ranges.",
            details: [
              "Set aside material suited to each student's school grade range.",
              "Distribute different question sets when several sets are available for the same part."
            ]
          },
          {
            phase: "Part 1",
            title: "Begin with flashcards",
            time: "About 20 minutes",
            body: "Hand out the cards. Students read the question, try to recall the answer, then turn the card over to check.",
            details: [
              "Use them for short memorisation and preparation.",
              "Collect the cards before moving to the question sheets."
            ]
          },
          {
            phase: "Part 2",
            title: "Open the text and hand out question sheets",
            time: "40 minutes – 1 hour",
            body: "Students answer their level's questions with the Risale part open. The answers come from the text being studied, not general knowledge.",
            details: [
              "Everyone can study the same part while the material changes by level.",
              "Different age groups can work on different parts in the same session when needed."
            ]
          },
          {
            phase: "During class",
            title: "The lesson leader circulates and guides",
            time: "During study time",
            body: "The lesson leader moves around the room, notices where students are stuck, and guides them back to the relevant paragraph instead of giving the answer directly.",
            details: [
              "Use the answer key for checking.",
              "Different question sets make one-to-one support easier to manage; guide each student back to the relevant paragraph."
            ]
          },
          {
            phase: "Close",
            title: "Complete the answers and review",
            time: "Lesson close",
            body: "Check the question sheets against the answer key and return to the text for anything incomplete or incorrect.",
            details: [
              "Reuse the flashcards for review after class.",
              "Confirm which part will be studied next."
            ]
          },
          {
            phase: "End of term",
            title: "Build the final from the term's studied content",
            time: "At term end",
            body: "Select questions from all Risale parts studied during the term and assemble the final exam, bringing the whole period back into review.",
            details: [
              "Select the questions to use in the final from the existing question bank.",
              "Keep the exam within the content actually covered that term."
            ]
          },
          {
            phase: "After the final",
            title: "Track points and distribute rewards",
            time: "Term close",
            body: "Add up points from the term's work and final. A reward proportional to points, rather than limited to the top three, encourages wider participation.",
            details: [
              "Point and reward tracking is not automated in this web app yet.",
              "The lesson leader or institution records and follows the points separately."
            ]
          }
        ],
        supportHeading: "Three things stay consistent",
        supportItems: [
          {
            title: "The text stays open",
            body: "Questions send students back to the paragraph rather than relying on memorisation alone."
          },
          {
            title: "Material follows the student",
            body: "Different ages can share one lesson; each student works with cards and questions for their school range."
          },
          {
            title: "The term connects to the final",
            body: "Lesson work comes together at the final, while points and rewards are tracked separately to close the period."
          }
        ],
        mixedAgeClass: {
          summary: "How does this work in a mixed-age class?",
          body:
            "One session can include students from different ages. Some groups may work on the same part while other groups work on different parts when needed."
        }
      },
      desktopAppNote: {
        heading: "What this app is not",
        body:
          "This web app is for reading, downloading, and studying prepared material. Rebuilding or editing question sheets and flashcards is handled by a separate desktop program."
      },
      booksHeading: "Books"
    },
    library: {
      pageTitle: "Books",
      eyebrow: "Library",
      heading: "Books and grade documents",
      lede:
        "Browse each book, read its parts, and download grade-specific Word/PDF files.\nStudy interactive flashcards.",
      statsLabel: "Library statistics",
      stats: {
        books: "Books",
        parts: "Parts",
        docx: "Word files",
        pdf: "PDF files ready"
      },
      emptyManifestPrefix: "Run",
      emptyManifestSuffix: "to build the library index from assets.",
      bookSummaryAria: ({ bookTitle }) => `${bookTitle} summary`,
      partCount: ({ count }) => `${count} ${count === 1 ? "part" : "parts"}`
    },
    book: {
      eyebrow: "Book",
      description: ({ title }) => `Parts and school-range documents for ${title}.`,
      lede: ({ partCount, gradeCount }) =>
        `${partCount} ${partCount === 1 ? "part" : "parts"}, ${gradeCount} ${
          gradeCount === 1 ? "school grade range" : "school grade ranges"
        }, and direct document downloads for Flashcard and Question Sheet variants.\nInteractive flashcard study sessions.`,
      guide: {
        heading: "How to proceed in this book",
        body:
          "Choose the part you want to teach or study below. Each part brings together the source text, question sheets, and flashcards for multiple school grade ranges."
      },
      searchLabel: "Search parts",
      searchPlaceholder: "Part number or title",
      gradeLabel: "School grade range",
      allGrades: "All school ranges",
      resultCount: ({ count }) => `${count} ${count === 1 ? "result" : "results"} found`,
      noResults: "No results",
      capabilitiesLabel: ({ partTitle }) => `${partTitle} material summary`,
      capabilities: {
        text: "Text available",
        gradeLevels: ({ count }) => `${count} school ${count === 1 ? "range" : "ranges"}`,
        flashcards: "Flashcards",
        questionSheets: "Question sheets"
      }
    },
    search: {
      triggers: {
        global: "Search all books",
        book: "Search this book"
      },
      placeholders: {
        global: "Search books, titles, and texts…",
        book: "Part number, title, or text"
      },
      levels: {
        label: "Search level",
        basic: "Basic",
        advanced: "Advanced"
      },
      modes: {
        label: "Search option",
        all: "All words",
        exact: "Exact phrase",
        boolean: "Boolean operators",
        proximity: "Nearby words"
      },
      scopes: {
        label: "Search in",
        text: "Part text",
        title: "Titles",
        partNo: "Part numbers"
      },
      books: {
        label: "Books",
        all: "All books",
        selectAll: "Select all",
        clearSelection: "Clear selection",
        selectedCount: ({ count }) => `${count} ${count === 1 ? "book" : "books"} selected`,
        atLeastOne: "At least one book must remain selected."
      },
      proximity: {
        label: "Word distance",
        distance: ({ count }) => `${count} words`
      },
      help: {
        label: "Search help",
        all: "Finds parts containing every word you enter.",
        exact: "Finds the words together and in the order entered.",
        boolean: "Accepts AND, OR, and NOT operators.",
        wildcard: "Wildcards work automatically in every search: use * for several characters and ? for one character.",
        proximity: "Finds words within the selected distance in either order.",
        examplesLabel: "Examples",
        examples: {
          boolean: [
            "iman AND nur: both words must be present.",
            "iman OR rahmet: at least one word must be present.",
            "iman AND NOT tabiat: iman must be present and tabiat must be absent."
          ],
          wildcard: [
            "rah*: finds words starting with rah, such as rahmet or rahman.",
            "n?r: finds words such as nur where one character may vary.",
            "iman*: finds words beginning with the same stem, such as iman or imanın."
          ]
        }
      },
      booleanBuilder: {
        label: "Boolean search builder",
        description: "Write one word or phrase per row, then choose AND, OR, or NOT between the rows.",
        firstTerm: "First text",
        nextTerm: "Next text",
        operation: "Operation",
        addRow: "Add row",
        removeRow: "Remove row",
        operators: {
          AND: "AND — require both",
          OR: "OR — allow either",
          NOT: "NOT — exclude this text"
        }
      },
      status: {
        loading: "Preparing text index…",
        progress: ({ ready, total }) => `${ready}/${total} books ready`,
        provisional: ({ ready, total }) => `Results are provisional: ${ready}/${total} books ready.`,
        restored: "Previous search results were restored.",
        ready: "All selected books are ready to search.",
        partialFailure: ({ books }) => `Some results may be missing. Books not loaded: ${books}`,
        bookFailure: ({ bookTitle }) => `The text index for ${bookTitle} could not be loaded.`
      },
      errors: {
        parser: ({ position }) => `There is a search syntax problem at position ${position}.`,
        unexpectedToken: "The search contains an unexpected symbol.",
        missingOperand: "A search term is missing before or after an operator.",
        queryTooLong: "The search query cannot exceed 256 characters."
      },
      results: {
        count: ({ count }) => `${count} ${count === 1 ? "result" : "results"} found`,
        fromText: "From text",
        noResults: "No parts match your search.",
        fewerWords: "Try fewer words or a different search mode.",
        enableText: "Enable searching in part text.",
        clearBooks: "Clear the book selection.",
        clearGrade: "Clear the school grade range."
      },
      actions: {
        clear: "Clear search",
        close: "Close search",
        retry: "Try again",
        searchWithinBook: "Search within this book",
        globalSearch: "Search all books"
      }
    },
    part: {
      eyebrow: ({ partNo }) => `Part ${partNo}`,
      description: ({ partTitle, bookTitle }) => `${partTitle} in ${bookTitle}.`,
      navigationLabel: "Part navigation",
      previous: "Previous",
      next: "Next",
      workflow: {
        heading: "What can I do with this part?",
        steps: [
          "Read the source text.",
          "Choose the school grade range.",
          "Study flashcards or download the question sheet.",
          "Questions are prepared to be answered while the text is open."
        ]
      }
    },
    downloads: {
      label: "Downloads and Studies",
      heading: "Downloads and Studies",
      mixedAgeGuidance:
        "Students from different ages can work on this same part; each student uses material suited to their own school grade range.",
      variants: {
        BK: "Flashcard",
        SK: "Question Sheet"
      },
      docx: "Word",
      pdf: "PDF",
      mobilePdf: "Mobile PDF",
      studyHint: "For preparation before the lesson or review afterward.",
      questionSheetHint: "For answering while the source text is open.",
      gradeSummary: ({ gradeLabel }) => `${gradeLabel} materials`,
      openGrade: ({ gradeLabel }) => `Open or close ${gradeLabel} materials`
    },
    study: {
      availableHeading: "Study decks",
      start: "Study Flashcards",
      cardCount: ({ count }) => `${count} ${count === 1 ? "card" : "cards"}`,
      pageEyebrow: "Study",
      loading: "Loading...",
      instruction: "Read the question, think of the answer, then reveal the card. Use this for lesson preparation or review.",
      question: "Question",
      answer: "Answer",
      showAnswer: "Show answer",
      viewSource: "View Text",
      sourceEyebrow: "Source text",
      sourceLoading: "Loading text...",
      sourceLoadError: "Could not load the source text.",
      sourceDone: "Return to study",
      ratings: {
        again: "Again",
        hard: "Hard",
        good: "Good",
        easy: "Easy"
      },
      ratingHints: {
        again: "Soon",
        hard: "Later",
        good: "Done",
        easy: "Done"
      },
      status: {
        new: "New",
        learning: "Learning",
        review: "Review"
      },
      progress: ({ current, total }) => `${current} / ${total}`,
      complete: "This session is complete.",
      loadError: "Could not load the study deck."
    },
    augmentation: {
      launch: "Augment This Part",
      launchHelp: "Combine this text with other Risale texts to prepare a larger lesson text.",
      dialogTitle: "Create a Personal Part Collection",
      intro: "The open part remains selected. Add and order any parts from this or another book.",
      bookLabel: "Book",
      partsHeading: "Available parts",
      current: "Current part",
      neighbor: "Neighbor",
      selectNeighbors: "Select Neighbors",
      selectedHeading: "Final part order",
      moveUp: "Move up",
      moveDown: "Move down",
      resetOrder: "Restore Automatic Order",
      gradesHeading: "School grade ranges",
      selectAllGrades: "Select every available range",
      create: "Create Personal Part",
      cancel: "Cancel",
      loading: "Loading augmentation data...",
      creating: "Combining questions...",
      loadError: "Could not load augmentation data.",
      selectAnotherPart: "Select at least one additional part.",
      selectGrade: "Select at least one school range.",
      personalHeading: "My augmented parts",
      personalDescription: "These records are stored only in this browser profile.",
      localBadge: "Local",
      noPersonal: "No personal augmented part has been created for this book.",
      exportWorkspace: "Export Backup",
      importWorkspace: "Import Backup",
      importComplete: "Backup imported.",
      backupWarning: "Browser data can be cleared; download a backup of important work.",
      detailEyebrow: "Personal augmented part",
      sourcesHeading: "Part order",
      sourceTextHeading: "Combined source text",
      inactiveGrade: "This school range was not augmented.",
      failedGrade: "This school range could not be generated.",
      questionCount: "Questions",
      setCount: "Selected sets",
      study: "Study Flashcards",
      exportUnavailable: "The document export service is not configured.",
      prepareDocuments: "Prepare Documents",
      preparingDocuments: "Preparing documents...",
      exportsReady: "Documents are ready to download.",
      exportFailed: "Documents could not be prepared:",
      exportServiceUnavailable: "The document export service is unavailable. Restart the development server and try again.",
      retryExport: "Prepare Documents Again",
      downloadsHeading: "Downloads and Studies",
      flashcard: "Flashcard",
      questionSheet: "Question Sheet",
      word: "Word",
      pdf: "PDF",
      mobilePdf: "Mobile PDF",
      rename: "Rename",
      save: "Save",
      delete: "Delete",
      deleteConfirm: "Delete this personal part?",
      missingProject: "The personal part was not found or was removed from browser storage."
    },
    themes: {
      pageTitle: "Themes",
      eyebrow: "Theme preview",
      currentHeading: ({ theme }) => `Current theme: ${theme}`,
      lede: "Select a theme.",
      apply: "Use theme",
      active: "Active",
      names: {
        risaleTedris: "RisaleTedris",
        slate: "Slate",
        field: "Field",
        ink: "Ink",
        school: "School"
      },
      descriptions: {
        risaleTedris: "Red accents and warm, light reading surfaces tailored to the RisaleTedris identity.",
        slate: "Neutral reading surface with teal and rust actions.",
        field: "Soft green-blue balance for long lists and document text.",
        ink: "Dark interface with clear cyan and coral affordances.",
        school: "Light academic palette with blue and berry emphasis."
      },
      swatchAria: ({ theme }) => `${theme} swatches`
    }
  }
} satisfies Record<Locale, UiDictionary>;

export function getUi(locale: Locale): UiDictionary {
  return ui[locale];
}
