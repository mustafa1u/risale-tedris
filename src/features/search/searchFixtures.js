export const SEARCH_FIXTURE_BOOK = {
  bookSlug: "arama-fixture",
  bookTitle: "Arama Deneme Kitabı",
  records: [
    {
      partNo: "p01",
      partNumber: 1,
      title: "İman, Işık ve ırmak",
      labelSlug: "turkce-harfler",
      gradeSlugs: ["2-sinif", "8-sinif"],
      text: "İman ıslah ister; I\u0307man tekrar yazılır. “Işık”—ırmak, irfan ve Kur'an'la anılır!"
    },
    {
      partNo: "p02",
      partNumber: 2,
      title: "نور الإيمان",
      labelSlug: "arapca-metin",
      gradeSlugs: ["8-sinif"],
      text: "نور الإيمان، قلبٌ مطمئن. الرحمة؟ نعم."
    },
    {
      partNo: "p03",
      partNumber: 3,
      title: "Yakınlık ve tekrar",
      labelSlug: "yakinlik-tekrar",
      gradeSlugs: ["11-sinif"],
      text: "rahmet bir iki nur; rahmet uzak bir iki üç dört beş nur. rahmet rahmet."
    }
  ]
};

export const SEARCH_FIXTURE_EXPECTATIONS = {
  proximity: {
    partNo: "p03",
    leftTerm: "rahmet",
    rightTerm: "nur",
    leftPositions: [0, 4, 12, 13],
    rightPositions: [3, 11],
    nearestTokenDistance: 3
  }
};
