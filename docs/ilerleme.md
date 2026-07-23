# İlerleme Kaydı

Bu dosya commit geçmişini teknik Türkçe ile özetler. En yeni kayıt en üstte yer alır.

## 2026-07-23

### MASAUSTU-GEZINME-VE-MOBIL-HERO -- Masaüstü navigasyonu ve dar ekran hero yerleşimi iyileştirildi

Geniş ekranlarda kitaplara ve temel uygulama bölümlerine doğrudan erişim sağlamak için görünür birincil navigasyon eklendi. `960px` ve üzerindeki görünüm masaüstü navigasyonunu, `959px` ve altındaki görünüm mevcut burger menüsünü kullanıyor. İki sunum aynı yerelleştirilmiş bağlantı modelinden üretiliyor, geçerli bölüm durumunu paylaşıyor ve JavaScript çalışmadığında da erişilebilir bağlantılar sunuyor. Arama ile burger menüsünün birbirini kapatma davranışı korundu.

Ana sayfa `640px` ve altında tek sütuna geçtiğinde kitap koleksiyonu görselini gereğinden fazla aşağı iten geniş ekran satır boşluğu ve aşağı yönlü dönüşüm düzeltildi. Dar yerleşimde satır boşluğu `20px` olarak sınırlandı, görselin aşağı ötelenmesi kaldırıldı ve ölçek başlangıcı üst kenara taşındı. `641px` ve üzerindeki yan yana hero sunumu değiştirilmedi.

Arama ve kişisel parça artırma özellikleri birlikte etkinleştirilerek yeni çıktı üretildi. Artırma belge dışa aktarımlarının çalışması için `PUBLIC_AUGMENTATION_EXPORT_API=https://augmentation.risaletedris.com/api/augmentation` production adresi derlenmiş pakete açıkça katıldı. Doğrulanan `dist` çıktısı ana production alanına dokunulmadan Netlify `search-enabled-test` alias'ına `--no-build` ile dağıtıldı.

İlk beta belge hazırlama denemesinde worker CORS listesi yalnız production origin'lerini içerdiği için tarayıcı export isteğini engelledi. Worker systemd yapılandırmasına ayrı `beta-cors.conf` drop-in dosyasıyla `Augmentation__AllowedOrigins__3=https://search-enabled-test--super-duckanoo-207a41.netlify.app` eklendi ve `rissor-augmentation.service` yeniden başlatıldı. Genel wildcard origin açılmadı; yalnız tam beta origin'i izin listesine katıldı.

Doğrulama:

- İlk kırmızı tarayıcı testinde `390px` görünümde eylem düğmeleri ile koleksiyon görseli arasındaki boşluk `175px` ölçüldü ve `96px` üst sınırını aştı.
- Düzenleme sonrasında aynı boşluk `20px` ölçüldü; `320px`, `390px` ve `640px` genişliklerde yatay taşma bulunmadı, `641px` görünümde iki sütunlu düzen korundu.
- Navigasyon tarayıcı testleri `4/4`, mobil hero regresyon testi `1/1` ve CSS sözleşme testleri `12/12` geçti.
- `npm test`: 109 üst düzey grupta 257/257 test başarıyla geçti.
- Astro production build'i `PUBLIC_SEARCH_ENABLED=true`, `PUBLIC_AUGMENTATION_ENABLED=true` ve production artırma API adresiyle 668 statik sayfayı başarıyla üretti.
- Derlenmiş ana sayfada arama denetimi ve search manifesti, örnek parça sayfasında artırma giriş alanı, istemci paketinde production artırma API adresi doğrulandı.
- Worker yeniden başlatıldıktan sonra `https://augmentation.risaletedris.com/health/ready` adresi `Healthy` döndürdü.
- Beta origin'i için CORS preflight yanıtı `204` ile birlikte tam `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods: POST` ve `Access-Control-Allow-Headers: content-type` başlıklarını döndürdü; production origin'i için mevcut CORS erişimi de korundu.
- Netlify deploy ID: `6a61a4c031afde5558d41a1c`; CLI `Deploy is live` sonucunu verdi.
- Test alias'ı: `https://search-enabled-test--super-duckanoo-207a41.netlify.app`
- Ana production URL'sine `--prod` dağıtımı yapılmadı.

## 2026-07-22

### ARAMA-VE-PARCA-ARTIRMA-TEST-DAGITIMI -- Arama ve parça artırma açık test alias'ına dağıtıldı

Arama ve kişisel parça artırma özellikleri production build ortamında birlikte açıldı. Build `PUBLIC_SEARCH_ENABLED=true`, `PUBLIC_AUGMENTATION_ENABLED=true` ve `PUBLIC_AUGMENTATION_EXPORT_API=https://augmentation.risaletedris.com/api/augmentation` değerleriyle üretildi. Ignore edilen belge kaynakları `C:\<kitap>\<sınıf>` ağaçlarından yeniden hazırlandı; 3210 normal DOCX, 3210 normal PDF ve 3210 mobil PDF katalog sözleşmesi korunarak build'e katıldı.

Doğrulanan `dist` çıktısı Netlify site `b27017c2-44f5-4618-a9b4-c3c01299565f` üzerinde yalnızca `search-enabled-test` alias'ına dağıtıldı; ana production URL'sine `--prod` dağıtımı yapılmadı. Netlify deploy kaydı `ready` durumuna geçti, hata bildirmedi ve alias bağlantısını yeni deploy'a bağladı.

Doğrulama:

- `npm run pdf:validate:strict -- --mobile-docx-root C:\`: beklenen 6420/6420 PDF hazır bulundu; 3210 normal ve 3210 mobil PDF doğrulandı.
- Astro production build'i 668 statik sayfayı başarıyla üretti; `dist` içinde 3210 DOCX ve 6420 PDF bulundu.
- Derlenmiş ana sayfada search host/manifest, search worker dosyası, parça sayfasında augmentation giriş alanı ve augmentation bundle'ında production API adresi doğrulandı.
- `https://augmentation.risaletedris.com/health/ready`: HTTP 200 ve `Healthy` döndürdü.
- Netlify deploy ID: `6a603799d330aad8b9688faf`; API durumu `ready`, hata mesajı yok, 668 generated page ve 6428 changed asset raporlandı.
- Test alias'ı: `https://search-enabled-test--super-duckanoo-207a41.netlify.app`
- Kalıcı deploy bağlantısı: `https://6a603799d330aad8b9688faf--super-duckanoo-207a41.netlify.app`
- Bu çalışma ortamından Netlify CDN'e yapılan son HTTP içerik istekleri TLS bağlantı sıfırlamasıyla engellendi. Netlify CLI'nin `Deploy is live` sonucu ve Netlify API'nin `ready` kaydı doğrulandı; tarayıcıdan son kullanıcı smoke kontrolü ayrıca yapılmalıdır.
- `npm run smoke:html`, arama veya augmentation eksikliği nedeniyle değil, betiğin yeni ana sayfada artık bulunmayan eski tanıtım metinlerini beklemesi nedeniyle başarısız oldu. Statik smoke beklentilerinin güncel ana sayfa sözleşmesine uyarlanması sonraki bakım işi olarak açık bırakıldı.

## 2026-07-21

### ARAMA-GERI-DONUS-DURUMU -- Sonuç ve panel durumu geri dönüşte korundu

Ana sayfa araması, exact canonical URL imzasıyla eşleşen son sonuç listesini, toplam sayıyı ve scroll konumunu namespaced `history.state` snapshot'ında tutuyor. Canonical sonuç veya `Bu kitapta ara` bağlantısına basılmadan hemen önce güncel scroll değeri snapshot'a yazılıyor. Back ile ana sayfaya dönüldüğünde eşleşen snapshot sonuçları anında geri getiriliyor ve `Önceki arama sonuçları geri yüklendi` durumu gösteriliyor. URL durumu değişirse eski snapshot temizleniyor; kullanıcı geri yüklenen aramada ilk değişikliği yaptığında worker/shard hattı normal biçimde yeniden hazırlanıyor.

İlk gerçek Chrome denemesi geliştirme sayfasının JavaScript heap'ini BFCache içinde korumadığını gösterdi: scroll tarayıcı tarafından geri gelse de sayfa işaretçisi kayboldu. Davranış bu tarayıcı varsayımına bırakılmadı. History snapshot yedeğiyle aynı Back akışında sonuçlar ve scroll geri geldi; test içi session worker sayacı birde kaldığı için ikinci worker kurulmadığı doğrulandı.

Panelin açık/kapalı sunum durumu global ve kitap bağlamları için ayrı tek-bit anahtarlarla `sessionStorage` içinde tutuluyor. Sorgu, biçim ve filtreler URL/history durumunda kalıyor; sunum modülü sorgu verisi veya `localStorage` kullanmıyor. Menünün aramayı kapatması, Escape/kapatma ve normal açma yolları bu biti güncelliyor. Planın 7.7 ve 7.8 dilimleri tamamlandı; böylece Faz 7'nin sekiz dilimi de işaretlendi.

Doğrulama:

- İlk kırmızı kapıda eksik sunum modülü ve iki ada bağlantısı için 3 beklenen başarısızlık görüldü.
- URL snapshot, session sunum durumu, global/kitap ada ve i18n odak testleri: 25/25 geçti.
- İlk Chrome kapısı BFCache varsayımını reddetti; history snapshot uygulamasından sonra `npm run dev:web -- --port 4322` üzerinde iki tarayıcı dosyası 15/15 geçti.
- `npm test`: 109 üst düzey grupta 254 test başarıyla geçti.
- `npm run check`: 149 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- Geliştirme sunucusu doğrulamadan sonra durduruldu; production build veya dağıtım yapılmadı.

### ARAMA-URL-GECMISI -- Arama durumu yenileme ve tarayıcı geçmişine bağlandı

Global ve sabit-kitap aramasındaki sorgu, biçim, alan, kitap, yakınlık ve okul aralığı geçişleri artık canonical URL parametrelerine aynı anda yazılıyor. Ortak `replaceSearchUrlState` yardımcısı geçerli pathname ile hash'i ve tarayıcının mevcut `history.state` değerini koruyarak `history.replaceState` kullanıyor. Böylece yazılan her karakter paylaşılabilir/yenilenebilir duruma dönüşürken history uzunluğu artmıyor ve Back düğmesi bir tuş vuruşu dizisine dönüşmüyor.

Yeni history girdileri yalnız normal bağlantı gezinmeleriyle oluşuyor: canonical sonuç bağlantısı parça sayfasına, `Bu kitapta ara` bağlantısı sabit kitap bağlamına ve `Tüm kitaplarda ara` bağlantısı global bağlama gidiyor. Gerçek Chrome testleri URL'nin refresh sonrasında sorgu/biçim/kapsamı geri kurduğunu, sonuç sayfasından Back ile global sonuçlara dönüldüğünü, Forward ile aynı parçaya yeniden gidildiğini ve global-kitap bağlam geçişinin Back/Forward boyunca doğru denetimleri koruduğunu doğruladı.

Planın 7.5 ve 7.6 dilimleri tamamlandı. 7.7'deki scroll konumu ve canlı tarayıcı durumu korunurken ikinci tam worker başlangıcını önleme şartı bu committe tamamlanmış sayılmadı; burada yalnız görünür durum ve gezinme doğruluğu kanıtlandı.

Doğrulama:

- İlk kırmızı kapıda URL helper export'u ve iki adanın bağlantısı için 3 beklenen başarısızlık görüldü.
- URL durumu ile global/kitap ada kaynak sözleşmeleri: 12/12 test geçti.
- `npm run dev:web -- --port 4322` geliştirme sunucusunda iki tarayıcı dosyası: 13/13 Chrome testi geçti.
- `npm test`: 108 üst düzey grupta 251 test başarıyla geçti.
- `npm run check`: 147 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- Geliştirme sunucusu doğrulamadan sonra durduruldu; production build veya dağıtım yapılmadı.

### ARAMA-SHARD-ONBELLEGI -- Kitap seçimi artımlı shard yüklemesine bağlandı

Global arama artık ilk açılışta manifestteki bütün shard'ları koşulsuz yüklemek yerine yalnız URL/durum içinde seçili kitapların referanslarını yüklüyor. Shard yükleyicisine kitap slug'ı ile content hash birleşimine dayanan oturum içi bellek cache'i eklendi. Seçili kitaplar değiştiğinde hazır shard'lar ağdan yeniden istenmiyor; worker'a da yalnız yeni indirilen shard'lar `initialize` mesajıyla gönderiliyor. Worker çekirdeğinin mevcut analiz cache'i böylece aynı içerik için ikinci tokenizasyonu önlüyor.

Henüz yüklenmemiş bir kitap seçildiğinde önce hazır kitaplardan gelen mevcut sonuçlar görünür kalıyor ve canlı durum metni sonuçların geçici olduğunu, kaç kitabın hazır bulunduğunu açıkça bildiriyor. Yeni shard indirilip worker tarafından hazırlandıktan sonra aynı sorgu tam seçili bağlamla yeniden yürütülüyor ve durum `hazır` oluyor. Geciktirilmiş shard içeren gerçek tarayıcı testi, kitabı kaldırıp yeniden seçmenin ikinci bir ağ isteği oluşturmadığını doğruluyor.

Tarayıcı kapısı ayrıca loader hazır olayı ile worker'ın ilk `initialize` cevabı arasındaki dar bir yarışı ortaya çıkardı. Arayüz artık worker gerçekten hazır olmadan `hazır` durumu yayımlamıyor; bu aralıkta yapılan kitap seçiminin atlanması engellendi. Planın 7.3 ve 7.4 dilimleri tamamlandı.

Doğrulama:

- İlk kırmızı kapıda cache sonucu, seçim eşzamanlayıcısı ve geçici durum metni için 3 beklenen başarısızlık görüldü.
- Shard yükleyici, ana sayfa kaynak sözleşmesi ve i18n odak testleri: 17/17 geçti.
- `npm run dev:web -- --port 4322` geliştirme sunucusunda ana sayfa Chrome testleri: 8/8 geçti.
- `npm test`: 108 üst düzey grupta 250 test başarıyla geçti.
- `npm run check`: 147 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- Geliştirme sunucusu doğrulamadan sonra durduruldu; production build veya dağıtım yapılmadı.

### KITAP-SECICI-EYLEMLERI -- Ana sayfa kitap seçicisine toplu seçim eylemleri eklendi

Ana sayfadaki kitap filtresi mevcut daraltılabilir ayrıntı denetimi içinde tutuldu ve kalıcı, geniş bir kitap çipi satırı oluşturulmadı. Denetime `Tümünü seç` ve `Seçimi temizle` eylemleri eklendi. Temizleme, üretilmiş kitap sırasındaki ilk kitabı seçili bırakarak en az bir kitap korumasını sürdürüyor; tümünü seçme ise seçimi manifestteki üretilmiş sıraya geri getiriyor. Zaten ulaşılan durumun eylem düğmesi devre dışı bırakılıyor ve tek kalan kitabın onay kutusu mevcut reducer korumasıyla kaldırılamıyor.

Toplu seçim geçişleri ortak arama reducer'ına yalnız global bağlamda çalışan açık eylemler olarak eklendi. Sabit kitap bağlamı bu eylemlerde aynı durum nesnesini koruyor. Türkçe ve İngilizce düğme metinleri tipli sözlüğe katıldı; ortak `SearchControls` sözleşmesi ile ana sayfa bağlantısı ve gerçek tarayıcı davranışı testlerle kapsandı. Planın 7.1 ve 7.2 dilimleri tamamlandı.

Doğrulama:

- Reducer, ortak denetim, ana sayfa ve i18n odak testleri: 23 test başarıyla geçti.
- Önceden başlatılmış `npm run dev:web -- --port 4322` geliştirme sunucusunda yeni kitap seçici Chrome testi: 1/1 geçti.
- `npm test`: 108 üst düzey grupta 249 test başarıyla geçti.
- `npm run check`: 147 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- Geliştirme sunucusu doğrulamadan sonra durduruldu; production build veya dağıtım yapılmadı.

### ARAMA-BAGLAM-AKTARIMI -- Global ve kitap araması arasında açık URL aktarımı eklendi

Global sonuç satırları iki ayrı gezinme amacı sunacak şekilde düzenlendi. Ana sonuç bağlantısı canonical parça yoluna gitmeye devam ediyor. Ayrı `Bu kitapta ara` eylemi ise mevcut sorguyu, arama biçimini, alan kapsamlarını ve yakınlık uzaklığını URL üzerinden ilgili kitap sayfasına taşıyor. Kitap sayfası bu URL durumunu açılışta okuyup bağlamı geçerli kitaba sabitliyor, paneli arama niyetiyle açıyor ve yalnız o kitabın shard'ını hazırlıyor.

Kitap paneline `Tüm kitaplarda ara` eylemi eklendi. Bu eylem JavaScript içi sessiz bir bağlam değişimi yerine normal ve paylaşılabilir bir bağlantı üretiyor; aynı sorgu/biçim/kapsam/uzaklık değerlerini korurken kitap seçimini üretilmiş sıradaki dört kitabın tamamına genişletiyor. Ana sayfa URL ile gelen global durumu geri yüklüyor ve sorgu bulunduğunda arama kaynaklarını arama niyeti olarak hazırlıyor.

Sonuç kartı stilleri canonical parça bağlantısı ile kitap içi arama eylemini ayrı odak hedefleri olarak gösterecek biçimde güncellendi. Dar ekranda iki hedef alt alta yerleşiyor. Planın 6.8 ve 6.9 dilimleri tamamlandı; böylece Faz 6'nın bütün uygulama dilimleri işaretlenmiş oldu.

Doğrulama:

- URL/durum/bileşen/markup/CSS odak testleri: 43 test başarıyla geçti.
- Geliştirme sunucusunda kitap ve ana sayfa birlikte: 9/9 Chrome testi başarıyla geçti.
- `npm test`: 108 üst düzey grupta 248 test başarıyla geçti.
- `npm run check`: 147 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- Geliştirme sunucusu testlerden sonra durduruldu; production build veya dağıtım yapılmadı.
- Normal Astro sayfa geçişi yeni dedicated worker oluşturduğu için sayfalar arası analiz edilmiş worker önbelleği yeniden kullanımına dair kanıt kaydedilmedi; yalnız content-hash'li shard yanıtlarının tarayıcı önbelleğine uygunluğu korunuyor. Bu mimari fark sonraki dayanıklılık/önbellek fazında açıkça ele alınmalı.

### KITAP-ARAMA-WORKER-ENTEGRASYONU -- Kitap araması ortak denetimlerle worker hattına bağlandı

Ana sayfa aramasındaki biçim, kapsam, mantıksal oluşturucu, yakınlık ve yardım denetimleri `SearchControls` bileşenine ayrıldı; hem global arama hem kitap araması artık aynı Preact denetim sistemini kullanıyor. Kitap sayfasındaki ada yalnız geçerli kitabın content-hash'li shard referansını alıyor, arama niyetiyle bu tek shard'ı yüklüyor ve `book` bağlamındaki worker isteğini başka kitaplara genişletemiyor.

Worker'ın sıralı `partNo` sonuçları önceki committe hazırlanan sunucuya bağlandı. Böylece mevcut Astro parça satırları yeniden üretilmeden taşınıyor/gizleniyor; okul sınıf aralığı worker isteğine katılıyor ve sonuç sayacı aynı satır durumundan güncelleniyor. Shard veya worker arızası halinde aynı giriş ve okul seçimi başlık/parça numarası metadata yedeğini çalıştırıyor; yeniden deneme eylemi görünür kalıyor. Eski ayrı senkron DOM gizleme/sayaç kodu kaldırıldı.

Gerçek tarayıcı kontrolü, bu checkout'ta DOCX/PDF kaynakları ignore edildiği için üretilmiş shard kayıtlarındaki `gradeSlugs` alanlarının boş kaldığını ortaya çıkardı. Arama varlığı üreticisi artık parça derecelerini belge indirmeleri ile mevcut sınıf/parça bilgi kartı destelerinin birleşiminden çıkarıyor. 1605 çalışma destesi bulunan yerel korpusta bu davranış, özgün dört shard hash'ini ve beş sınıf değerini yeniden üretti. Eksik yerel belge kaynaklarının neden olduğu sıfır indirme metadata değişiklikleri geri alındı ve stage alanına katılmadı.

Plan durumu:

- 6.3, 6.4, 6.5, 6.7, 6.10 ve 6.11 tamamlandı; 6.6 önceki committe tamamlanmıştı.
- 6.8 ve 6.9, global-kitap URL bağlam aktarımı ile açık `Tüm kitaplarda ara` eylemi için sonraki commit döngüsüne bırakıldı.

Doğrulama:

- Odak kaynak/durum/route/sunucu testleri: 35 test başarıyla geçti.
- `node --test scripts\search-index-assets.test.mjs`: 8 test başarıyla geçti.
- `npm run manifest:generate`: 4 shard, 321 kayıt ve 533.751 metin baytı; 667.460 JSON baytı ve 213.999 gzip baytı üretildi. Yerel eksik belge metadata çıktıları commit kapsamına alınmadı.
- Kitap Chrome testleri: tek shard, sabit kitap, metin+sınıf kesişimi ve zorlanmış shard arızası yedeği için 2/2 geçti.
- Ana sayfa Chrome regresyonu: ortak denetim ayrıştırmasından sonra 6/6 geçti.
- `npm test`: 108 üst düzey grupta 246 test başarıyla geçti.
- `npm run check`: 146 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- Geliştirme sunucusu kontrollerden sonra durduruldu; production build veya dağıtım yapılmadı.

### KITAP-ARAMA-SATIR-SUNUCUSU -- Sunucu taraflı parça satırları için sıralama sunucusu eklendi

Kitap aramasının worker sonuçlarını mevcut Astro satırlarına bağlayabilmesi için kararlı `partNo` değerleriyle çalışan dar kapsamlı bir sunucu eklendi. Sunucu, worker sırasındaki eşleşen satırları aynı DOM düğümlerini taşıyarak öne alıyor, eşleşmeyenleri gizliyor ve sonuç sayacı ile boş durumunu birlikte güncelliyor. Satırlar yeniden üretilmediği için canonical parça bağlantıları, başlıklar ve yetenek rozetleri mevcut sunucu taraflı içerik olarak kalıyor.

Mevcut metadata araması ve okul sınıf aralığı filtresi de aynı sunucuyu kullanacak şekilde sadeleştirildi. Böylece eski ayrı DOM gizleme/sayaç kodu kaldırılırken full-text shard veya worker arızasında kullanılacak başlık/parça numarası yedeği korunmuş oldu. Planın 6.6 dilimi tamamlandı; worker bağlantısına bağlı 6.5, 6.7, 6.10 ve 6.11 dilimleri çalışma halinde bırakıldı.

Doğrulama:

- İlk çalıştırmada eksik `createPartRowPresenter` dışa aktarımı beklenen kırmızı durumu verdi.
- `node --test src\features\library\bookPageClient.test.mjs src\features\library\pageAccessibility.test.mjs`: 2 test takımı ve 19 test başarıyla geçti.
- Kullanıcı talimatı gereği production build veya dağıtım yapılmadı.

### KITAP-ARAMA-KAPALI-KABUK -- Kitap araması daraltılabilir bağlamsal denetime taşındı

Kitap sayfasındaki her zaman görünür metadata arama alanı ve okul sınıf aralığı seçimi, yerel `details` denetimi içindeki `Bu kitapta ara` / `Search this book` tetikleyicisine taşındı. Bu ilk Faz 6 dilimi worker aramasını bağlamadan önce mevcut başlık/parça numarası filtresini ve sınıf filtresini çalışır durumda tutuyor; JavaScript veya sonraki arama adımları başarısız olduğunda açılabilir metadata denetimleri ile sunucu tarafında üretilmiş parça satırları kullanılabilir kalıyor.

Parça satırlarına worker sonuçlarının sonraki dilimde güvenle bağlanacağı kararlı `partNo` tanımlayıcısı eklendi. Regresyon sözleşmeleri okul aralığı seçeneklerinin iç slug değerlerini, görünen aralık etiketlerini, canonical parça bağlantılarını, yetenek rozetlerini ve sonuç sayacını koruyor. Planın 6.1 ve 6.2 dilimleri tamamlandı; plan ile bu ilerleme kaydı `.gitignore` kapsamındaki `docs/` altında tutulduğu için stage alanına alınmadı.

Doğrulama:

- `node --test src\features\library\pageAccessibility.test.mjs src\features\library\bookPageClient.test.mjs`: 2 test takımı ve 17 test başarıyla geçti.
- `npm run check`: 139 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- Kullanıcı talimatı gereği production build veya dağıtım yapılmadı.

## 2026-07-19

### ARAMA-SECENEKLERI-ORNEKLER-VE-MANTIKSAL-OLUSTURUCU -- Gelişmiş arama açıklamaları ve mantıksal arama oluşturucu eklendi

Ana sayfa global aramasındaki gelişmiş arama seçenekleri daha açıklayıcı hale getirildi. `Mantıksal arama` ve `Joker karakterler` seçenekleri için Türkçe ve İngilizce örnek kullanımlar eklendi. Boolean örnekleri `iman AND nur`, `iman OR rahmet` ve `iman AND NOT tabiat` gibi işleç davranışlarını; joker karakter örnekleri `rah*`, `n?r` ve `iman*` gibi `*` ve `?` kullanımını açıklıyor. Örnekler artık yalnızca kapalı `Arama yardımı` ayrıntısında değil, ilgili arama biçimi seçildiğinde doğrudan görünen ayrı bir örnek panelinde gösteriliyor.

Mantıksal arama için satır tabanlı oluşturucu eklendi. Kullanıcı ilk metni ayrı bir kutuya yazıyor, sonraki satırlarda `AND`, `OR` veya `NOT` işlemini seçip yeni metni giriyor. `Satır ekle` yeni koşul satırı açıyor; `Satırı kaldır` istenmeyen koşulu kaldırıyor. Oluşturucu boş satırları sorguya katmadan güvenli biçimde tek bir Boolean sorgusu üretiyor ve ana arama kutusunu bu sorguyla eşitliyor. Böylece kullanıcı ham `AND/OR/NOT` sözdizimini bilmeden çok koşullu arama yapabiliyor.

Arama motorunda gelişmiş modların yalnız etiket olarak kalmaması için temel davranışlar da bağlandı. `Tam ifade` modu phrase eşleşmesi yapıyor; `Mantıksal arama` modu `AND`, `OR` ve `NOT` işleçlerini değerlendiriyor; `Joker karakterler` modu `*` ve `?` kalıplarını normalized tokenlar üzerinde çalıştırıyor. Bu ilk uygulama güvenli ve sınırlı bir yerel arama davranışı sunuyor; daha kapsamlı parser hata bildirimi ve gelişmiş proximity/wildcard sınırları planın sonraki fazlarında ayrıntılandırılabilir.

Arayüzde `Satır ekle` ve `Satırı kaldır` düğmelerinin üzerine gelindiğinde engelli imleci görünmesine neden olan genel `.button-muted` kuralı düzeltildi. Aktif muted düğmeler artık normal tıklanabilir imleç gösteriyor; devre dışı düğmeler ve tıklanamaz `span.button-muted` yer tutucuları `not-allowed` davranışını koruyor.

Notlar:

- `docs/some-problems-to-solve.md` boş ve bu iş kapsamıyla ilişkisi doğrulanmadığı için stage alanına alınmadı.
- Bu dilimde production build veya Netlify dağıtımı yapılmadı.

Doğrulama:

- `node --test src\features\search\searchEngine.test.mjs src\features\search\HomeSearch.test.mjs src\i18n\uiContract.test.mjs`: 22 test başarıyla geçti.
- `node --test src\styles\globalCssContract.test.mjs`: 10 test başarıyla geçti.
- `node --test src\features\search\HomeSearch.test.mjs src\styles\globalCssContract.test.mjs`: 12 test başarıyla geçti.
- `npm run check`: 139 dosyada 0 hata, 0 uyarı ve 0 ipucu.

## 2026-07-19

### ANA-SAYFA-GORSEL-VIDEO-VE-TEST-ARAMA -- Ana sayfa görseli yenilendi, ders akışı videosu eklendi ve arama açık test yayını alındı

Ana sayfadaki çizim kitap görseli kaldırılarak `src/assets/home/rahle-boy-kulliyat-2.webp` içindeki rahle üzerindeki külliyat görseli kullanılacak hale getirildi. Mevcut hero yerleşimi korunarak görsel responsive, dekoratif ve hızlı yüklenebilir şekilde Astro asset hattına bağlandı.

`Örnek Ders Akışı` sayfasına yazılı akıştan önce video bölümü eklendi. İlk video olarak `src/assets/lesson-flow/bilgi-kartlari-nasil-kullanilir.mp4` dosyası yerleştirildi; bölüm metinleri Türkçe ve İngilizce sözlüklere eklendi. Video bölümü, ileride gelecek videoların aynı kart/grid yapısına eklenebilmesi için ayrı bir medya bölümü olarak tasarlandı. Kullanıcı önce kısa video açıklamasını görebiliyor, videoyu sayfadan ayrılmadan oynatabiliyor ve hemen altında mevcut yazılı ders akışını okumaya devam edebiliyor.

Ana sayfa global araması production dışı test yayını için etkinleştirildi. Arama özelliği build sırasında `PUBLIC_SEARCH_ENABLED=true` ile açıldı; üretilen HTML içinde arama tetikleyicisi, global manifest bağlantısı ve kitap shard referansları doğrulandı. Netlify yayını `--prod` kullanılmadan draft/alias olarak alındı; mevcut üretim sitesi üzerine yazılmadı.

Test yayını:

- `https://search-enabled-test--super-duckanoo-207a41.netlify.app`
- Netlify dağıtım kaydı: `https://app.netlify.com/projects/super-duckanoo-207a41/deploys/6a5871e055df3878713ed228`

Notlar:

- Önceki draft adresi immutable olduğu için aynı URL üzerinde değiştirilemedi; arama açık sürüm için yeni `search-enabled-test` alias yayını oluşturuldu.
- Yerel ortamdan Netlify URL'sine yapılan `curl` kontrolü bağlantı sıfırlama hatası verdi; Netlify CLI dağıtımı canlı olarak raporladı.
- `docs/some-problems-to-solve.md` boş ve bu iş kapsamıyla ilişkisi doğrulanmadığı için stage alanına alınmadı.

Doğrulama:

- `node --test src\features\library\pageAccessibility.test.mjs src\styles\globalCssContract.test.mjs src\i18n\uiContract.test.mjs`: 31 test başarıyla geçti.
- `npm run check`: 139 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- `npm run build`: 668 statik sayfa başarıyla üretildi; 6420/6420 beklenen PDF hazır bulundu.
- `PUBLIC_SEARCH_ENABLED=true npm run build`: arama açık production çıktısı üretildi; `dist/index.html` içinde `data-home-search-host`, arama manifesti ve `Tüm kitaplarda ara` tetikleyicisi doğrulandı.
- `netlify.cmd deploy --dir=dist --no-build --site b27017c2-44f5-4618-a9b4-c3c01299565f --alias search-enabled-test`: production dışı draft/alias yayını başarıyla tamamlandı.

## 2026-07-13

### GELISTIRME-SUNUCUSU-ASTRO-ONBELLEK-KURTARMA -- Windows cache kilidi için dev runner toparlaması eklendi

`npm run dev` sırasında Astro'nun `.astro/data-store.json.tmp` dosyasını `.astro/data-store.json` üzerine yeniden adlandırırken Windows `EPERM` hatasıyla çıkabilmesi için dar kapsamlı bir toparlama yolu eklendi. Dev runner artık Astro başlangıcı sıfırdan farklı çıkışla biterse ve başarısız content-store temp dosyası kalmışsa yalnız üretilmiş `.astro/data-store.json.tmp` ve `.astro/data-store.json` cache dosyalarını temizliyor, ardından Astro'yu bir kez yeniden başlatıyor. Worker yaşam döngüsü ve normal Astro hataları için mevcut davranış korunuyor; kaynak dosyalarına veya production build hattına dokunulmadı.

Bu davranış için `scripts/dev.test.mjs` içine iki odak test eklendi: temp dosyası yokken temizliğin atlanması ve rename hatasından kalan temp/store dosyalarının temizlenmesi. Böylece Windows'a özgü bu geliştirme sunucusu arızası kullanıcının elle `.astro` temizlemesini gerektirmeden bir sonraki başlangıçta toparlanabiliyor.

Doğrulama:

- `node --test scripts\dev.test.mjs`: 5 test başarıyla geçti.
- `npm test`: 103 üst düzey gruptaki 232 testin tamamı başarıyla geçti.
- `npm run dev`: izinli yerel çalıştırmada export worker `http://127.0.0.1:5098`, Astro `http://127.0.0.1:4321/` üzerinde hazır oldu.
- `curl.exe -I http://127.0.0.1:4321/`: ana sayfa `HTTP/1.1 200 OK` döndürdü.
- Geliştirme sunucusu doğrulamadan sonra durduruldu; `4321` ve `5098` portlarında dinleyici kalmadı.
- Kullanıcı talimatı gereği production build çalıştırılmadı.

### PARCA-ARAMA-TDD-FAZ-5-UI -- Ana sayfa global arama dikey dilimi uygulandı

Ana sayfa üst bölümüne grid menü denetiminin hemen solunda `Tüm kitaplarda ara` düğmesi eklendi. İlk HTML içinde küçük ve kullanılabilir bir arama host'u ile statik tetikleyici korunuyor; Preact yalnız bu host içine bağlanıyor, bütün başlık veya ana sayfa hydrate edilmiyor. Arama açıldığında input odağı otomatik alıyor; fare/dokunma eşdeğeri tıklama, `Enter` ve `Space` ile açma çalışıyor. Arama ile yerel `<details>` grid menüsü küçük özel olaylarla birbirini kapatıyor ve arama sorgusu ile seçilmiş seçenekler bu geçişlerde korunuyor.

Global arama kontrolleri Faz 1'in ortak durum modeli ile Faz 3-4'ün shard loader, worker client, scheduler ve arama motoruna bağlandı. Varsayılan durumda dört kitabın tamamı, parça metni, başlık ve parça numarası kapsamları ile `Tüm kelimeler` biçimi seçili; yakınlık uzaklığı kullanılacağı zamana kadar beş kelime olarak korunuyor. Tam ifade, mantıksal, joker karakter ve yakınlık seçenekleri görünür; kitap ve kapsam seçimlerinde son seçeneği kaldırma korumaları ortak reducer üzerinden devam ediyor. Global manifest, Vite worker girişi ve dört content-hashed shard ilk sayfa yükünde değil, yalnız kullanıcı aramayı açtığında getiriliyor.

Gerçek worker sonuçları tek bir kitaplar-arası relevance listesinde sunuluyor. Her satır kitap adını, parça numarasını, parça başlığını ve yerelleştirilmiş canonical parça bağlantısını içeriyor; toplam sonuç sayısı canlı bölgeyle bildiriliyor. Kapatma sorguyu ve seçenekleri koruyor; temizleme yalnız sorguyu ve sonuçları sıfırlıyor. JavaScript kapalı Chrome senaryosunda logo, ana başlık, `Kitaplar`, `Ders Akışı` ve üç bağlantılı native menü kullanılabilir kaldı.

Yerel geliştirme sırasında Astro'nun Preact SSR renderer'ı Vite iç taşıma katmanında `context.js` yüklerken tekrar üretilebilir 60 saniyelik zaman aşımına uğradı. Preact bileşeni korunarak Astro renderer direktifi yerine ayrılmış istemci mount modülü kullanıldı ve `@astrojs/preact` Vite SSR'den dışsallaştırıldı. Bu sınır için kaynak sözleşme testi eklendi. Böylece ön ısıtılan `npm run dev:web` ana sayfası HTTP 200 verdi ve gerçek Chrome kapısı güvenilir biçimde çalıştı. Büyük generated library modülünün soğuk Babel dönüşümü nedeniyle Playwright'ın yalnız web-server hazır olma sınırı 360 saniyeye çıkarıldı; tekil testlerin 30 saniyelik davranış sınırı değiştirilmedi.

Plan durumu:

- `docs/part-search-tdd-plan.md` Faz 5 dilimleri 5.1-5.12 `[X]` olarak işaretlendi.
- Dilim 5.13 `[!]` kaldı: kaynak HTML beklentileri mevcut, fakat kullanıcının açık `build çalıştırmama` talimatı nedeniyle fresh built-HTML smoke yürütülmedi.
- Bu nedenle Faz 5'in görünür/dev dikey dilimi uygulanmış olsa da production build doğrulaması tamamlanmış sayılmıyor.

Doğrulama:

- `npm run test:browser`: gerçek Chrome içinde 6/6 test geçti; worker sonucu, varsayılanlar, menü koordinasyonu, durum koruma ve JavaScriptsiz gezinme kapsandı.
- Ön ısıtılmış tam tarayıcı kapısı 12,5 saniyede tamamlandı; soğuk `npm run dev:web -- --port 4322` ana sayfa isteği HTTP 200 ve 65.861 bayt döndürdü.
- `npm test`: 101 üst düzey gruptaki 230 testin tamamı başarılı geçti.
- `npm run check`: 139 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- Kullanıcının isteği doğrultusunda production build ve built-HTML smoke çalıştırılmadı.

### PARCA-ARAMA-TDD-FAZ-4 -- Varsayılan tüm-kelimeler motoru ve deterministic sıralama tamamlandı

Worker içinde önceden tokenize edilmiş alanları kullanan varsayılan `all` arama motoru eklendi. Boş sorgu canonical kitap/parça sırasını koruyor; normal sorgularda bütün normalized kelimelerin seçili alanların birleşiminde bulunması gerekiyor. Yinelenen sorgu kelimeleri kayıt içinde aynı sayıda occurrence arıyor. `text`, `title` ve `partNo` kapsamları birbirinden bağımsız çalışıyor; gövde metni varsayılan kapsam olmasına rağmen kullanıcı tarafından kapatıldığında text-only eşleşmeler sonuçtan çıkıyor. Parça numarası araması `P55`/`p55` gibi case farklarını normalize ediyor fakat `p01` için `p1` gibi yaklaşık veya zero-padding'i bozan eşleşme yapmıyor.

Global bağlamdaki seçili kitap filtresi ve kitap bağlamındaki sınıf aralığı kesişimi doğrudan worker motorunda uygulanıyor; sonuç listesi, toplam sayı ve sıralama tek atomik yanıttan çıkıyor. Puanlar merkezi ve açık ağırlıklara bağlandı: tam parça numarası 1000, tam normalized başlık 800, başlıkta tüm kelimeler 450, metinde tüm kelimeler 150 ve alanlara dağılmış tüm-kelime eşleşmesi 100. Eşit puanlarda generated kitap sırası ve canonical `partNumber` kullanılıyor. Bir karakterlik text/title sorguları çalıştırılmıyor; geçerli tam parça numarası sorguları kısa olsalar da kabul ediliyor.

Worker core gerçek `search` işlemini yeni motora bağladı ve runtime artık placeholder hata yerine sözleşmeyle doğrulanmış `results` yanıtı döndürüyor. Boş sorgudaki canonical liste için `matchedFields` dizisinin boş olmasına sonuç sözleşmesinde izin verildi. İstemci tarafına 200 ms varsayılan debounce scheduler eklendi; hızlı yazmada yalnız son sorgu çalışıyor, `Enter`, temizleme/reset ve boş sorgu ise beklemeden gönderiliyor. Var olan request-ID/stale-response koruması scheduler'dan bağımsız olarak devam ediyor.

Gerçek corpus performansını tekrar üretmek için `npm run search:benchmark` komutu eklendi. Dört kitap ve 321 parçada full worker analizi yerel Node ölçümünde 1.672,01 ms sürdü; analizden sonra `iman nur`, `rahmet` ve `P55` sorgularının 100 tekrar ortalaması 25,164–26,135 ms aralığında kaldı. Query süresi 100 ms desktop hedefinin altında; full global başlangıç maliyeti worker ve intent-triggered yükleme kararını doğruluyor ve ilerideki ölçüm/optimizasyon fazı için açık bir sinyal olarak kaydedildi.

Doğrulama:

- Engine/scheduler/worker odak testleri tüm-kelimeler, scope, filtre, sıralama, min-length, debounce ve protokol yürütmesini başarılı biçimde kapsadı.
- `npm run search:benchmark`: 4 kitap, 321 kayıt; sorgu ortalamaları 25,164–26,135 ms.
- `npm test`: 97 üst düzey gruptaki 224 testin tamamı başarılı geçti.
- `npm run check`: 132 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- Kullanıcının isteği doğrultusunda production build çalıştırılmadı.

### PARCA-ARAMA-TDD-FAZ-3 -- Unicode analiz, worker cache ve güvenli shard yükleme temeli tamamlandı

Arama metnini görüntülenen kaynağı değiştirmeden eşleştirmeye hazırlayan saf `searchAnalyzer` modülü eklendi. Türkçe locale-aware küçük harf dönüşümü, noktalı/noktasız `i` eşitlemesi, Unicode ayrıştırma, combining diacritic kaldırma, yinelenen boşlukların daraltılması ve typographic tırnak normalizasyonu tek yerde uygulanıyor. Token'lar normalized değerle birlikte özgün metindeki UTF-16 `start`/`end` aralıklarını ve sıralı konumlarını taşıyor. Böylece ilerideki excerpt/vurgu üretimi ikinci bir yaklaşık metin araması yapmadan canonical Türkçe ve Arapça sunumu koruyabilecek.

Tarayıcı ana thread'inden bağımsız çalışan module worker girişi, browser API'sinden bağımsız worker core ve istek runtime'ı eklendi. Core, gelen shard sözleşmesini ve semantic SHA-256 özetini analizden önce doğruluyor; veriyi `bookSlug + contentHash` anahtarıyla cache'liyor. Aynı shard yeniden initialize edildiğinde veya global bağlamdan aynı kitap bağlamına geçildiğinde kayıtlar tekrar tokenize edilmiyor. Tek ve çoklu shard hazırlığı, her kitap için `idle/ready` durumu, request ID eşleme ve kontrollü `errorCode` yanıtları sözleşmeye bağlı tutuldu.

Worker istemcisi artan request ID'leri atıyor, daha yeni sorgu geldiğinde önceki sorguyu `SUPERSEDED` olarak sonlandırıyor, gecikmiş yanıtları yok sayıyor ve dispose sonrasında bekleyen işleri kontrollü biçimde kapatıyor. Ayrı shard loader ana sayfa için varsayılan iki eşzamanlı istek sınırı uyguluyor; kitap bağlamında tek referans doğal olarak tek istek oluşturuyor. Yeni yükleme önceki network işini `AbortController` ile iptal ediyor; dispose veya supersession sonrasında gecikmiş hazır/hata durumları UI callback'ine yayımlanmıyor. Kısmi network hataları kitap bazında `failed` durumu olarak korunurken başarılı shard'lar kullanılabilir kalıyor.

TDD sırasında analyzer, worker core/client/runtime ve loader modüllerinin yokluğu beklenen kırmızı durumları sağladı. Testler Türkçe/Arapça/emoji/combining mark sınırlarını, özgün offset'leri, geçersiz şema ve hash'i, cache tekrar kullanımını, stale worker yanıtını, bounded concurrency'yi, network iptalini ve dispose güvenliğini kapsıyor. `docs/part-search-tdd-plan.md` içindeki Faz 3'ün 11 diliminin tamamı `[X]` olarak işaretlendi.

Doğrulama:

- Faz 3 odak testi: 6 suite içindeki 14 test başarılı geçti.
- `npm test`: 93 üst düzey gruptaki 213 testin tamamı başarılı geçti.
- `npm run check`: 127 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- Kullanıcının isteği doğrultusunda production build çalıştırılmadı.

### PARCA-ARAMA-TDD-FAZ-2 -- Deterministik arama shard'ları üretim hattına bağlandı

Canonical parça metinlerinden tekrar üretilebilir arama varlıkları oluşturan `scripts/search-index-assets.mjs` eklendi. Üretici her kitap için özgün metni ve parça metadata'sını içeren ayrı bir JSON shard ile bunlara işaret eden küçük, sürümlü bir global manifest oluşturuyor. Kitap ve parça sırası sabit tutuluyor; dosya adları semantic SHA-256 içerik özeti taşıyor. Bir kitaptaki metin değişikliği yalnız o kitabın shard özetini ve global manifest özetini değiştiriyor; diğer kitapların URL'leri geçerli kalıyor.

Üretim iki aşamaya ayrıldı: canonical metinler bir kez okunup hazırlanıyor, ardından mevcut library manifest içeriğiyle birlikte ortak `generatedAt` değeri seçilerek dosyalar yazılıyor. Aynı baytları taşıyan mevcut dosyalar yeniden yazılmıyor, eski üretilmiş hash dosyaları temizleniyor. Eksik, okunamayan veya boş metinler ve tekrarlı kitap/parça kimlikleri kontrollü hata ile işlemi durduruyor. Yazımdan sonra şema, bire bir kitap/parça kapsamı, shard URL'si, kayıt sayısı, ham metin baytı, içerik özeti ve dosya adı tekrar doğrulanıyor; bu doğrulama mevcut `manifest:generate`/`prebuild` hattının parçası olduğu için library verisiyle arama verisi sessizce ayrışamıyor.

Hafif `libraryIndex` verisine global manifest referansı ve her kitap özeti için aynı content-hashed shard referansı eklendi; canonical gövde metni TypeScript modülüne veya ilk HTML'e taşınmadı. Üretim çıktısı kitap başına kayıt, ham metin, JSON ve yerel gzip boyutlarını raporluyor. Gerçek dört kitap için 321 kayıt ve 533.751 bayt canonical metin üretildi; global manifest dahil JSON toplamı 667.460 bayt, yerel gzip ölçümü 214.000 bayt oldu. Aynı girdiyle ikinci `manifest:generate` çalıştırması generation zamanını ve arama varlıklarının dosya zamanlarını korudu.

TDD kapsamında önce eksik üretici ve eksik doğrulayıcı export'larıyla beklenen kırmızı durumlar alındı. Geçici fixture dizinlerinde çalışan testler deterministic çıktı, değişiklik izolasyonu, hata politikası, mtime/churn davranışı, boyut raporu ve bozuk URL/hash/kapsam reddini kapsıyor. Üretilmiş library veri testi gerçek global manifest ile dört shard referansının bire bir eşleştiğini ve hafif indekste gövde metni bulunmadığını doğruluyor. `docs/part-search-tdd-plan.md` içindeki Faz 2'nin 13 diliminin tamamı `[X]` olarak işaretlendi.

Doğrulama:

- `node --test scripts/search-index-assets.test.mjs src/data/library.generated.test.mjs`: 2 suite içindeki 13 test başarılı geçti.
- `npm run manifest:generate`: 4 kitap, 321 arama kaydı ve 5 content-hashed JSON varlığı üretildi ve doğrulandı; ikinci çalışma değişmeyen arama dosyalarına dokunmadı.
- `npm test`: 87 üst düzey gruptaki 199 testin tamamı başarılı geçti.
- `npm run check`: 117 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- Kullanıcının isteği doğrultusunda production build çalıştırılmadı.

### PARCA-ARAMA-TDD-FAZ-0-1 -- Global ve kitap içi aramanın ölçüm, sözleşme ve durum temeli tamamlandı

Ana sayfayı öncelikli global arama giriş noktası, kitap sayfalarını ise aynı arama modelinin kitapla sınırlandırılmış biçimi olarak ele alan UX/UI şartnamesi, mimari seçenekler ve ayrıntılı TDD uygulama planı tamamlandı. Uygulama başlamadan önce temsilî Türkçe/İngilizce rotaları, dört kitaptaki 321 canonical metin parçasını ve mevcut HTML/JavaScript/metadata filtre sürelerini tekrar üretilebilir şekilde ölçen `scripts/search-baseline.mjs` eklendi; sonuçlar `docs/part-search-baseline.md` içinde kaydedildi.

Gerçek tarayıcı doğrulaması için Playwright geliştirme bağımlılığı, ayrı `npm run test:browser` komutu ve sistemdeki Chrome'u kullanan ana sayfa odak smoke testi eklendi. Üretimde geri alınabilir dağıtım için `PUBLIC_SEARCH_ENABLED` bayrağı tanımlandı; geliştirmede arama yolu açık tutulurken mevcut kitap metadata filtresi açıkça işaretlenmiş fallback olarak korunuyor. Menü denetimine daha sonraki arama/menü koordinasyonunda kullanılacak kararlı veri kancaları eklendi.

Arama varlıkları ve worker iletişimi için sürümlü, tarayıcı API'lerinden bağımsız çalışma zamanı sözleşmeleri oluşturuldu. Global manifest, kitap shard'ı, worker istek/yanıtları, sonuç, güvenli vurgu aralığı, hazır olma, kısmi hata ve parser hatası doğrulayıcıları alan yolunu belirten kontrollü hatalar üretiyor. Global ve kitap bağlamları için tek durum modeli; tüm kitaplar/tüm alanlar varsayılanları; son kitap ve son kapsam korumaları; açık bağlam genişletme/daraltma işlemleri; kararlı URL parse/serialize davranışı ve güvenli bilinmeyen parametre geri dönüşleri eklendi. Ham sorgu `localStorage` içinde saklanmıyor.

Türkçe ve İngilizce typed UI sözlükleri; arama düğmeleri, placeholder'lar, beş arama biçimi, kapsamlar, kitap seçimi, yakınlık mesafesi, yardım, yükleme/hazır/kısmi hata durumları, parser hataları, sonuç ve sonuçsuzluk yönlendirmeleri ile temizle/kapat/yeniden dene işlemlerini kapsayacak şekilde genişletildi. Türkçe noktalı/noktasız `i`, combining mark, Arapça, noktalama, tekrar ve bilinen yakınlık konumlarını içeren ortak arama test fixture'ı hazırlandı. `docs/part-search-tdd-plan.md` içindeki Faz 0 ve Faz 1 dilimlerinin tamamı `[X]` olarak işaretlendi; sıradaki çalışma deterministic kitap shard'ları ve global manifest üretimidir.

Doğrulama:

- `npm test`: Faz 1 sonrasında 86 üst düzey gruptaki 191 testin tamamı başarılı geçti.
- `npm run check`: 115 dosyada 0 hata, 0 uyarı ve 0 ipucu.
- `npm run test:browser`: ana sayfanın açılması ve grid menü tetikleyicisinin gerçek Chrome içinde odaklanması testi başarılı geçti.
- Faz 0 ölçümü sırasında `npm run build:timed`: 668 statik sayfa üretildi; Astro adımı 301,32 saniye, toplam süre 336,29 saniye olarak kaydedildi.
- Bu kayıttan sonraki uzun geliştirme çalışmasında production build çalıştırılmayacak; yerel görüntüleme için `npm run dev` ve hedefli/full testler kullanılacak.

## 2026-07-12

### RISALE-TEDRIS-ANA-SAYFA-VE-TEMA -- Ana sayfa, tam ekran menü ve kırmızı varsayılan tema yenilendi

Uygulamanın ana sayfası verilen RisaleTedris tasarımına göre yeniden düzenlendi. Her sayfada kullanılan üst bölümde sağlanan RisaleTedris logosu yer alıyor; logo dışarıdaki mutlak bir dosya yoluna bağımlı kalmaması için uygulama içine gömüldü. Sağ üstteki `Menü` denetimi tam ekran gezinme panelini açıyor. Menü sırasıyla `Kitaplar`, `Örnek Ders Akışı` ve etkin temanın adını gösteren tema seçimi bağlantılarını içeriyor.

Ana sayfa yalnız tanıtım metni, iki temel işlem düğmesi ve responsive kitap kompozisyonunu gösteren sade bir giriş ekranına dönüştürüldü. Ana sayfadaki `Kitaplar` düğmesi ile menüdeki `Kitaplar` öğesi aynı `/books/` sayfasına bağlandı; mevcut kitaplar ve sınıf belgeleri bu ayrı sayfada listeleniyor. `Ders Akışı` düğmesi ile menüdeki `Örnek Ders Akışı` öğesi aynı `/lesson-flow/` sayfasına bağlandı. Daha önce ana sayfaya dağılmış ders yürütme adımları, karışık yaş grubu açıklamaları, fayda kartları ve masaüstü uygulama notu bu sayfada toplandı. Aynı yapı İngilizce rotalarda da korundu.

Mevcut dört temaya `RisaleTedris` adlı beşinci tema eklendi ve yeni varsayılan tema yapıldı. Bu tema marka tasarımına uygun kırmızı işlem renkleri, sıcak açık yüzeyler ve uyumlu metin/sınır tonları kullanıyor. Önceki `Arduvaz`, `Saha`, `Mürekkep` ve `Okul` temaları tema seçim sayfasında kullanılabilir durumda kaldı. Kullanıcının seçtiği tema mevcut `localStorage` akışıyla korunuyor; menüdeki üçüncü öğenin etiketi de etkin temaya göre çalışma zamanında güncelleniyor. Üst başlık, menü paneli ve ana sayfa yüzeyleri sabit beyaz renkler yerine tema değişkenlerini kullanacak şekilde düzenlendi.

Doğrulama:

- `npm test`: ana sayfa ve rota ayrımından sonra 160 testin tamamı başarıyla geçti.
- `node --test src\config\themes.test.mjs src\layouts\BaseLayout.markup.test.mjs src\styles\globalCssContract.test.mjs src\i18n\uiContract.test.mjs`: yeni tema ve menü sözleşmelerini kapsayan 22 test başarıyla geçti.
- `npm run check`: tema eklemesinden sonra Astro denetimi 0 hata, 0 uyarı ve 0 ipucuyla tamamlandı.
- `npx astro build`: ana sayfa ve yeni rotalar eklendikten sonra 668 statik sayfa başarıyla üretildi.
- Yerel `http://127.0.0.1:4321/`, `/books/`, `/lesson-flow/` ve `/themes/` sayfaları `200 OK` verdi; varsayılan `risaleTedris` teması, beş temalı çalışma zamanı yapılandırması, üçüncü menü bağlantısı ve beş tema kartı HTML çıktısında doğrulandı.

## 2026-07-03

### KISISEL-PARCA-ARTIRMA-UX-VE-EXPORT-DURUMU -- Belge hazirlama arayuzu ve hazir belge geri yukleme duzeltildi

Kisisel parca artirma arayuzunde sinif secimi varsayilani degistirildi. Artirma penceresi artik uygun siniflarin tamamini otomatik secili getirmiyor; kullanici hic sinif secmeden basliyor ve gerekirse `Tum Uygun Araliklari Sec` dugmesiyle tum uygun siniflari tek seferde secebiliyor. Bu dugme sinif checkbox listesinin ustunden altina tasindi.

Birlestirilmis kaynak metinde her parcanin basina eklenen basliklar ortak `partText` yardimcilariyla tespit edilmeye baslandi. `---` ayiraciyla bolunmus artirilmis metinlerde bolum basliklari hem kisisel detay sayfasinda hem de bilgi karti kaynak metni diyalogunda daha kalin ve biraz daha buyuk gosteriliyor; normal tek parca metinlerinde bu stil uygulanmiyor. CSS ve erisilebilirlik sozlesme testleri bu yeni siniflari koruyacak sekilde guncellendi.

`Belgeleri Hazirla` durum mesajlari ozet kolonundan indirme paneline, dugmenin hemen altina tasindi. Worker tek export isi icin yalniz `queued/running/ready/failed` durumlarini dondurdugu ve guvenilir yuzde bilgisi vermedigi icin determinate progress bar yerine indeterminate spinner kullanildi. Hazirlaniyor, hazir ve hata mesajlari bu yerel export durum alanindan gosteriliyor.

Belge hazirlandiktan sonra `Bilgi Kartlarini Calis` sayfasina gidip tarayici geri tusuyla kisisel detay sayfasina donuldugunde indirme linklerinin kaybolmasi duzeltildi. Export istemcisi artik proje id'si ve compact export request imzasi ile `localStorage` icinde son kullanilabilir export job bilgisini sakliyor. Detay sayfasi acilirken eslesen, suresi dolmamis `queued/running/ready` job varsa yeni `POST /exports` istegi atmadan `GET /exports/{id}` ile job durumunu dogruluyor; hazirsa linkleri hemen geri yukluyor, kuyrukta veya calisiyorsa polling'e devam ediyor. Suresi dolmus, terminal veya proje tarifiyle eslesmeyen cache girdileri temizleniyor. Proje yeniden adlandirilinca veya silinince export cache'i de temizleniyor.

Dogrulama:

- `node --test src\features\augmentation\augmentationExportClient.test.mjs src\features\library\pageAccessibility.test.mjs src\features\library\partText.test.mjs src\features\study\studyPageClient.test.mjs src\features\augmentation\augmentationProject.test.mjs src\styles\globalCssContract.test.mjs`: 46 test basariyla gecti.
- `npm run dev`: yerelde worker `http://127.0.0.1:5098/health/ready` icin `Healthy` dondu, Astro `http://127.0.0.1:4321/` adresinde `200 OK` verdi.
- `npm run build` calistirilmadi; bu turda yalniz yerel gelistirme sunucusu ve hedefli testler kullanildi.

## 2026-06-30

### KISISEL-PARCA-ARTIRMA-DOMAIN -- Worker gerçek alan adına taşındı

Kişisel parça artırma export worker'ı geçici `sslip.io` adresinden `augmentation.risaletedris.com` alt alan adına taşındı. Squarespace DNS tarafında `augmentation.risaletedris.com` için `138.197.190.74` IP adresine giden A kaydı kullanıldı. DigitalOcean sunucusundaki Caddy yapılandırması bu alan adı için güncellendi ve Let's Encrypt sertifikası otomatik olarak alındı.

Netlify proxy yaklaşımı yeni alan adına geçişte tekrar denendi; worker doğrudan sağlık ve export isteklerine cevap verirken Netlify proxy üzerinden yapılan test istekleri bağlantı reseti ile sonlanabildi. Bu nedenle production frontend, belge üretimi için `/api/augmentation` Netlify rewrite'ı yerine `https://augmentation.risaletedris.com/api/augmentation` adresini doğrudan kullanacak şekilde yeniden derlendi. Worker CORS yapılandırması production Netlify origin'ine izin verecek şekilde korunuyor.

`public/_redirects` dosyasından artırma worker proxy kuralı kaldırıldı; dosyada yalnız eski çalışma sayfalarını yeni study route'una yönlendiren kurallar bırakıldı. Site `PUBLIC_AUGMENTATION_ENABLED=true` ve `PUBLIC_AUGMENTATION_EXPORT_API=https://augmentation.risaletedris.com/api/augmentation` ile yeniden build edilip Netlify production ortamına `--no-build` deploy edildi.

Doğrulama:

- `Resolve-DnsName augmentation.risaletedris.com`: A kaydı `138.197.190.74` adresine çözümlendi.
- `curl https://augmentation.risaletedris.com/health/ready`: `Healthy`.
- Direct worker smoke export: Küçük Sözler P08+P09, 5. sınıf tarifi `ready` durumuna geçti ve 6 artifact üretti (`SK` DOCX/PDF/Mobil PDF, `BK` DOCX/PDF/Mobil PDF).
- Netlify production dağıtımı: `https://super-duckanoo-207a41.netlify.app` ve unique deploy `https://6a443217f594186550357eb1--super-duckanoo-207a41.netlify.app`.

## 2026-06-29

### KISISEL-PARCA-ARTIRMA-PRODUCTION-WORKER -- DigitalOcean export worker ve Netlify proxy devreye alindi

Kisisel parca artirma arayuzu production ortaminda `PUBLIC_AUGMENTATION_ENABLED=true` ile yeniden derlenip Netlify'a dagitildi. Ilk production denemesinde `Belgeleri Hazirla` istegi `/api/augmentation/exports` icin 404 dondu; sebebin statik Netlify sitesinde export worker bulunmamasi oldugu dogrulandi. Belge uretimi LibreOffice, QAGeneratorLib, gecici is dizini ve polling durumunu gerektirdigi icin worker'in kalici bir sunucuda calismasi gerektigi netlestirildi.

DigitalOcean Frankfurt bolgesindeki `138.197.190.74` IP'li Ubuntu 24.04 x64 Droplet uzerine ASP.NET export worker dagitildi. Worker Windows gelistirme makinesinde Linux x64 self-contained olarak publish edildi; pakete yalniz calisan worker dosyalari, `assets/augmentation-catalog.json` ve dort kitabin `augmentation-bank` JSON kaynaklari dahil edildi. Sunucuda LibreOffice, Caddy ve gerekli font paketleri kuruldu. Worker `/opt/rissor/augmentation-worker` altinda, kaynaklar `/opt/rissor/assets` altinda, gecici isler `/var/lib/rissor-augmentation/jobs` altinda tutuluyor.

Worker `rissor-augmentation.service` systemd servisi olarak `127.0.0.1:5098` uzerinde calisacak sekilde yapilandirildi. Caddy, `https://138.197.190.74.sslip.io` adresinden worker'a TLS sonlandirmali reverse proxy sagliyor. Netlify tarafinda `public/_redirects` icine `/api/augmentation/* https://138.197.190.74.sslip.io/api/augmentation/:splat 200!` kurali eklendi; boylece tarayici ayni origin altindaki `/api/augmentation` yolunu kullanmaya devam ediyor.

Yerel `.deploy/` klasoru worker publish paketi ve gecici dagitim arsivi icin kullanildigindan `.gitignore` listesine eklendi. Bu klasor repoya alinmayacak; worker yeniden dagitimi gerektiginde publish adiminda tekrar uretilecek.

Dogrulama:

- `curl https://138.197.190.74.sslip.io/health/ready`: `Healthy`.
- Netlify uzerinden bos export istegi: 404 yerine worker kaynakli 400 validation problemi dondu; proxy'nin aktif oldugu dogrulandi.
- Production smoke export: Kucuk Sozler P08+P09, 5. sinif tarifi `ready` durumuna gecti ve 6 artifact uretti (`SK` DOCX/PDF/Mobil PDF, `BK` DOCX/PDF/Mobil PDF).
- Netlify production dagitimi: `https://super-duckanoo-207a41.netlify.app` ve unique deploy `https://6a41dfdfff0f54c9171e548b--super-duckanoo-207a41.netlify.app`.

## 2026-06-28

### DOCX-PDF-YENILEME-DEVAMI -- Dort kitap yenilendi, manifest ve production build dogrulandi

Dort kitap icin yenilenen DOCX kaynaklari uzerinden PDF yenileme proseduru tamamlandi. Ilk tek seferlik betik calismasi LibreOffice'in Meyve Risalesi 11. sinif normal PDF uretimi sirasinda `SfxBaseModel::impl_store` hatasiyla durdu. Devam isleminde `soffice.com` kullanildi ve LibreOffice kullanici profili `SOFFICE_USER_INSTALLATION` ile izole edildi; boylece mevcut LibreOffice profil kilidi veya bozuk oturum durumlari yenileme hattini etkilemeden devam edebildi. Bu ihtiyac icin `scripts/generate-pdfs.mjs` ortam degiskeninden gelen izole profil parametresini LibreOffice komutuna ekleyecek sekilde guncellendi.

Meyve Risalesi PDF uretimi kaldigi yerden tamamlandi. Windows yol uzunlugu/LibreOffice cikti davranisi sebebiyle normal cikti klasorunde eksik kalan iki uzun dosya adi kisa gecici cikti klasorune donusturulup hedef uzun yollara kopyalandi. Ardindan Tabiat Risalesi icin normal ve mobil PDF uretimi tamamlandi. Diger iki kitapta onceki yenileme ciktisi korunarak tum kitaplar icin PDF kapsami yeniden sayildi.

DOCX ve PDF dosyalari `assets` ve `public/assets` tarafina esitlendi. Dort kitap icin calisma desteleri ve soru bankasi JSON'lari yeniden ice aktarildi; soru bankasi ciktisi public varliklara da esitlendi. Manifest tekrar uretildi ve site verisi 4 kitap, 321 parca, 1605 calisma destesi, 3210 DOCX, 3210 normal PDF ve 3210 mobil PDF olarak guncellendi.

Tek seferlik yenileme betigi `scripts/one-refresh-proc.ps1` repoya alindi. Gecici LibreOffice profilleri ve kisa PDF cikti klasorleri icin `.tmp/` ignore listesine eklendi; bu klasor yenileme sirasinda yerel gecici calisma alani olarak kalmali, repoya girmemeli.

Dogrulama:

- PDF kapsami: 6420/6420 beklenen PDF mevcut; 3210 normal ve 3210 mobil PDF.
- `npm run manifest:generate`: 4 kitap, 321 parca, 1605 calisma destesi, 3210 DOCX, 3210 normal PDF ve 3210 mobil PDF ile basariyla tamamlandi.
- `npm run pdf:validate`: 6420/6420 PDF hazir.
- `npm run build:timed`: varlik esitleme, manifest, PDF dogrulamasi ve Astro production build basariyla tamamlandi; 664 sayfa uretildi, toplam sure yaklasik 687 saniye.

### KISISEL-PARCA-ARTIRMA-DEVAM -- Dagitim, kaynak metni ve mobil calisma duzeltmeleri tamamlandi

Kisisel parca artirma paketinin takip duzeltmeleri TDD yaklasimiyla uygulandi. QAGeneratorLib 4.1.13 icindeki yeni soru dagitim mantigi tarayici tarafindaki `augmentationDomain` ve belge uretiminde kullanilan .NET `AugmentationEngine` tarafina paralel olarak tasindi. Sorular artik kaynak setlerdeki soru pozisyonuna gore `S1Q1, S2Q1, S1Q2...` sirasi ile duzlestiriliyor; bagimlilikli sorular ayni blokta tutuluyor ve bloklar en az dolu hedef sete atanarak secili parca sirasi ve bagimliliklar yeniden dagitimdan sonra da korunuyor. Bu uygulamada 60 ve alti soru icin ilk 6 set sabit kural oldugu icin QAGeneratorLib'deki sonraki `TrimExcess` adimi alinmadi; aksi halde kucuk artirmalarda gecerli bagimlilik cocuklari kirpilabiliyordu.

Parca ve kisisel artirma sayfalarinda sinif gruplari varsayilan olarak kapali hale getirildi. Boylesi ozellikle telefon ekranlarinda 2. sinif materyallerinin acik gelip diger siniflari asagi itmesini engelliyor. Artirma penceresindeki sinif sirasi alfabetik siradan okul ilerleyisine cekildi; `11. sinif` artik `8. sinif`tan sonra ve `Lise sonrasi seviye`den once geliyor. Artirilmis belge adlari yalnizca `P05 + P06` yerine mevcut slug dosya adinin ilk bes tokenini kullanarak `P05 ... + P06 ...` seklinde daha acik uretiliyor. Turkce belge ciktilarinda cevap kelime sayisi `6` yerine `6 kelime` olarak yaziliyor.

Kisisel artirilmis calismalar icin kaynak metni de artik artiriliyor. Artirma katalogu her parcanin metin URL'sini tasiyor; proje olusturma sirasinda secili parca metinleri secili parca sirasina gore yuklenip tek bir `sourceText` alaninda saklaniyor. Bu alan workspace yedegiyle birlikte disari aktarilip geri alinabiliyor. Eski kaydedilmis projelerde `sourceText` yoksa kisisel detay sayfasi katalogdan parca metinlerini en iyi caba ile yeniden yukleyip projeye geri kaydediyor.

Bilgi karti calismasinda yerel artirilmis desteler de artik kaynak metni tasiyor. Calisma kabugu sadece `sourceTextUrl` olan statik destelerde degil, inline `sourceText` olan kisisel destelerde de `Metni Gor` dugmesini gosteriyor ve mevcut kaynak metin diyalogunu kullanarak birlestirilmis metni aciyor. Telefon tarayicilarinda `Metni Gor` dugmesinin puanlama dugmelerine gore ortalanmis gorunmesine sebep olan mobil CSS kurali da duzeltildi; ana kontrol satiri mobilde tekrar alttan hizalaniyor, puanlama satiri ise kendi icinde merkezli kalabiliyor.

Kisisel artirilmis parca detay sayfasina, `Belgeleri Hazirla`, `Yedegi Disa Aktar` ve indirme kontrollerinin bulundugu sayfada gorunen `Birlestirilmis metin` bolumu eklendi. Bu bolum normal parca sayfalarindaki `part-text` bicimlendirmesini ve Latin/Arapca segment ayirimini yeniden kullaniyor; ozet ve metin sol kolonda, belge/calisma paneli sag kolonda sticky kalacak sekilde yerlestirildi. Mobilde sayfa tek kolona dusuyor.

`.gitignore` tekrar incelendi. Yeni degisiklikler kaynak kod, test, katalog ve dokumantasyon niteliginde oldugu; gecici betik dosyasi veya uretilmis belge ciktisi kalmadigi icin yeni ignore kuralina ihtiyac gorulmedi. Ilgisiz `docs/some-problems-to-solve.md` untracked bir calisma notu olarak stage disinda birakildi.

Dogrulama:

- `dotnet run --no-restore --project services\Rissor.Augmentation.Core.Tests\Rissor.Augmentation.Core.Tests.csproj`: 6 test basariyla gecti.
- `dotnet run --no-restore --project services\Rissor.Augmentation.Export.Tests\Rissor.Augmentation.Export.Tests.csproj`: 6 test basariyla gecti.
- `node --test scripts\augmentation-bank.test.mjs src\features\augmentation\augmentationProject.test.mjs src\features\augmentation\augmentationStudy.test.mjs src\features\study\studyPageClient.test.mjs`: hedefli artirma/metin/calisma testleri basariyla gecti.
- `node --test src\features\augmentation\augmentationProject.test.mjs src\features\library\pageAccessibility.test.mjs src\styles\globalCssContract.test.mjs src\i18n\uiContract.test.mjs`: kisisel detay metni, erisilebilirlik, CSS ve i18n sozlesmeleri basariyla gecti.
- `npm test`: 21 test takimi ve 156 test basariyla gecti.
- `npm run check`: 96 dosyada 0 hata, 0 uyari ve 0 ipucu.
- `git diff --check` ve `git diff --cached --check`: bosluk hatasi yok; yalniz Git'in mevcut LF -> CRLF uyarilari goruldu.
- `npm run build` calistirilmadi; kullanici bu is akisi icin uzun production build'i sona birakmayi tercih etti.

## 2026-06-27

### KISISEL-PARCA-ARTIRMA -- TDD plani duzeltildi ve tarayici/worker paketi uygulandi

`docs/augmentation-tdd-plan.md` uygulamadan once TDD acisindan genisletildi. Ozellikle 60/61/70 soru sinirlari, parca sirasi, kaynak kimligi cakismalari, bagimliliklarin nihai soru kimliklerine yeniden yazilmasi, sinif bazli kismi hatalar, IndexedDB surum/cakisma/ithalat guvenligi, gecici belge islerinin izolasyonu ve LibreOffice ortam farklari ayri test yukumluluklerine donusturuldu. Uygulama sonunda plan gercek duruma gore isaretlendi; tarayiciya ozgu kota/eviction fault injection, kaydedilmis bir projeyi sonradan yeniden birlestirme ve coklu kaynak metni diyalogu ilk surum disinda birakildi.

Tam soru verisi icin `npm run augmentation:import` hatti eklendi. Text Data Editor kaynak manifestleri ve asil `SveC_*.txt` dosyalari kullanilarak dort kitap, 321 parca ve bes okul araligi icin 1605 tembel yuklenen parca/sinif JSON'u ile surumlu `augmentation-catalog.json` uretildi. Kaynak sorular, setler, ipuclari, kelime sayilari, bagimliliklar ve kitap/parca provenance bilgisi korunuyor; 24 kartlik mevcut calisma desteleri tam kaynak yerine kullanilmiyor.

Preact adasi canonical parca sayfasina ortam bayragi arkasinda eklendi. Acik parca kilitli ve merkezde, komsular isaretli, ayni veya baska kitaptan herhangi bir parca secilebilir. Ayni kitap otomatik manifest sirasini, diger kitaplar secim sirasini kullanir; kullanici erisilebilir yukari/asagi kontrolleriyle nihai sirayi degistirebilir. Bir veya tum siniflar bagimsiz uretilir, basarisiz sinif digerlerini bozmaz. Kisisel projeler IndexedDB'de revision kontroluyle saklanir, kitap listesinin ustunde yerel olarak gorunur, JSON workspace olarak yedeklenip geri alinabilir ve mevcut calisma sayfasi uzerinden en fazla 24 kartla calisilabilir.

Belge uretimi icin .NET 9 ASP.NET Core isci eklendi. Istemciden soru metni degil surumlu tarif alinir; worker canonical katalog ve kaynaklari tekrar okuyup ayni artirma motorunu calistirir. QAGeneratorLib standart/mobil soru kagidi ve bilgi karti DOCX'lerini uretir, izole LibreOffice profiliyle PDF'lere cevirir ve her aktif sinif icin Word/PDF/Mobil PDF olmak uzere alti gorunur artifact sunar. Kuyruk sinirli, is kimlikleri rastgele, ayni aktif tarif idempotent, dosyalar is bazinda izole, iptal/timeout/expiry/restart temizligi ve rate-limit/health/readiness uclari mevcuttur. Tek worker replica ve same-origin proxy siniri `docs/augmentation-export-deployment.md` icinde belgelendi.

Gercek pilotta Kucuk Sozler P08+P09, 5. sinif tarifi basariyla tamamlandi. Iki DOCX gecerli ZIP paketi, dort PDF `%PDF-` basligi ve toplam alti indirilebilir artifact verdi. Ilk pilotta gorulen LibreOffice profil cakismasi ile Windows Event Log izin hatasi izole profil ve yalniz console logger kullanilarak giderildi.

Ozellik `npm run dev` sirasinda otomatik aciliyor. Uretim derlemelerinde varsayilan olarak kapali ve `PUBLIC_AUGMENTATION_ENABLED=true` ile aciliyor. Statik site-worker adresi `PUBLIC_AUGMENTATION_EXPORT_API` ile yapilandiriliyor; worker ve katalog ayni revizyonda dagitilmadan uretim bayragi acilmamali.

Belge hazirlama sirasinda gorulen ham `NetworkError`, gelistirme sunucusunun export worker'i baslatmamasi ve `/api/augmentation` proxy'sinin bulunmamasi olarak tespit edildi. `npm run dev` artik once .NET worker'i baslatip readiness kontrolunu bekliyor, sonra Astro'yu same-origin proxy ile aciyor. Yalniz statik arayuz icin `npm run dev:web`, worker'i ayri calistirmak icin `npm run augmentation:worker` komutlari eklendi. Worker erisilemezse arayuz ham tarayici hatasi yerine yerellestirilmis aciklama gosteriyor.

Dogrulama:

- `npm test`: 21 test takimi ve 139 test basariyla gecti.
- `npm run check`: 92 dosyada 0 hata, 0 uyari ve 0 ipucu.
- Core test kosucusu: 4/4; export entegrasyon test kosucusu: 5/5.
- `npm run dev`: ana sayfa, kitap, P08 parca, kisisel detay, calisma, katalog ve tembel soru bankasi rotalari 200 dondu.
- Gercek QAGeneratorLib/LibreOffice pilotu: 6/6 artifact indirildi ve yapisal imzalari dogrulandi.
- Tek final `npm run build`: 6420/6420 PDF hazir, 664 statik sayfa, toplam Astro build 603,73 saniye.
- `npm run smoke:html -- --augmentation`: temel ve artirma-ozel taze `dist` kontrolleri basariyla gecti.

## 2026-06-20

### UX-MATERYAL-ODAKLI-ARAYUZ-PAKETI -- Dil secimi, ana sayfa chipleri ve parca akordeonlari birlestirildi

Turkce materyal odakli UX duzeltmeleri tek commit kaydi altinda birlestirildi. Mevcut materyaller yalnizca Turkce oldugu icin ust gezinmedeki gorunur dil secenegi Turkce ile sinirlandi. `BaseLayout` icinde gorunur diller `VISIBLE_LOCALES` listesi uzerinden yonetiliyor; Ingilizce i18n/route altyapisi gelecekte Ingilizce kitaplar yuklendiginde geri acilabilecek sekilde korunuyor.

Interaktif bilgi karti calismasindaki uzun okul araligi notu kaldirildi. Sayfa basligi alaninda tek kez `Kartın sorusunu okuyun, cevabı düşünün, sonra kartı çevirin. Bu çalışma derse hazırlık veya tekrar için kullanılabilir.` yonergesi gosteriliyor ve secili okul araligi satiriyla ayni hizda sola dayali tutuluyor. Alt kisimdaki ikinci yonerge kopyasi kaldirildi; obsolete `rangeNote` i18n girdisi, istemci selector'u ve CSS yolu temizlendi.

`docs/UX-tasarim-3.md` icindeki tavsiye edilen ana sayfa cozumune gecildi. Uzun okul araligi satiri ve ayrica gosterilen okul/medrese notu kaldirildi; `Seviyeler okul sınıflarına göredir. Sınıflar ayrı bir medrese sınıflandırması değildir.` cumlesi ve hemen altinda iki satirli seviye chip/kart dizilimi kullanildi. Chip verisi `libraryHome` icindeki `getHomepageGradeRanges` yardimcisindan ve merkezi `getGradeRangeDisplay` etiketlerinden geliyor. Ana sayfa hero basligi da `Risale-i Nur dersleri için hazır soru kağıtları ve bilgi kartları` olarak netlestirildi. Ayni UX metin degisikliklerinin Ingilizce karsiliklari da i18n tarafinda guncellendi, ancak Ingilizce dil secenegi gorunur degil.

Parca sayfasindaki indirme ve calisma panelinde okul araligi materyal gruplarina ac/kapat oku eklendi. Native `details` akordeon davranisi korunurken `summary` icindeki uzun etiket ayri bir label span'ine, ok ise `aria-hidden` bir span'e tasindi. Tarayici varsayilan disclosure marker'i gizlendi ve ozel ok collapsed durumda saga, acik durumda asagi bakacak sekilde donduruldu.

`docs/ux-development-tdd-plan.md` icinde 15-17. fazlar bu paket icin tamamlanmis olarak islendi. `docs/UX-tasarim-3.md` de takip edilen tasarim notu olarak repoya alindi. `.gitignore` incelendi; yeni eklenen dosyalar proje dokumani veya test dosyasi oldugu icin ignore kuralina ihtiyac gorulmedi.

Dogrulama:

- `node --test src\layouts\BaseLayout.markup.test.mjs src\features\study\StudyPage.markup.test.mjs src\features\study\studyPageClient.test.mjs src\i18n\uiContract.test.mjs src\styles\globalCssContract.test.mjs src\features\library\pageAccessibility.test.mjs scripts\static-html-smoke.test.mjs`: 7 test takimi ve 42 test basariyla gecti.
- `node --test src\features\library\libraryHome.test.mjs src\features\library\pageAccessibility.test.mjs src\i18n\uiContract.test.mjs src\styles\globalCssContract.test.mjs scripts\static-html-smoke.test.mjs`: 5 test takimi ve 35 test basariyla gecti.
- `node --test src\features\library\pageAccessibility.test.mjs src\styles\globalCssContract.test.mjs`: parca sayfasi akordeon oklari icin 2 test takimi ve 17 test basariyla gecti.
- `node --test src\i18n\uiContract.test.mjs scripts\static-html-smoke.test.mjs`: hero basligi kopya duzeltmesi icin 2 test takimi ve 14 test basariyla gecti.
- `npm test`: 21 test takimi ve 100 test basariyla gecti.
- `npm run check`: Astro tip denetimi 69 dosyada 0 hata, 0 uyari ve 0 ipucu ile gecti.
- `npm run build` ve `npm run smoke:html` calistirilmadi; kullanici bu turda build calistirilmamasini istedi.

### GELISTIRME-HATTI-FAZ-6 -- Calisma sayfalari tek statik kabuga tasindi

`development-pipeline-plan.md` icindeki 6. faz uygulandi. Calisma sayfalari artik her kitap, sinif ve parca icin ayri Astro HTML sayfasi uretmiyor. Eski per-deck modeldeki 1605 calisma destesi iki dilde 3210 statik calisma sayfasi uretirken, yeni model Turkce `/study/` ve Ingilizce `/en/study/` kabuk sayfalarini kullaniyor. Secili deste `book`, `grade` ve `part` query parametrelerinden cozuluyor.

Manifest uretimi calisma kabugu icin hafif `src/data/study-index.generated.json` dosyasini da uretecek sekilde genisletildi. Bu indeks kitap slug/baslik bilgisini, calisma destesi basligini, kart sayisini, deste JSON adresini ve kaynak parca bilgisini tasiyor; tam indirme verisi yine kitap bazli uretilen modullerde kaliyor. Statik endpoint `/assets/study-index.generated.json` bu dosyayi build ciktisina koyuyor; mevcut deste JSON dosyalari `/assets/...` altinda cachelenebilir statik varlik olarak kaldi.

Parca sayfalarindaki calisma baglantilari merkezi `studyDeckPath` yardimcisi uzerinden yeni query route bicimine tasindi. Eski `/books/:bookSlug/study/:gradeSlug/:partNo/` ve `/en/books/:bookSlug/study/:gradeSlug/:partNo/` adresleri icin `public/_redirects` altinda Netlify wildcard yonlendirmeleri eklendi. Calisma sayfasi istemci tarafinda hafif indeksi yukleyip secili desteyi buluyor, baslik/kart sayisi/kaynak bilgisini guncelliyor ve ardindan ilgili deste JSON'unu yukleyerek mevcut tekrar oturumunu baslatiyor. JavaScript gerektiren kabuk icin statik fallback mesaji korunuyor.

Route hacmi ve build suresi icin `npm run routes:report` ve `npm run build:timed` komutlari eklendi. Guncel raporda Phase 5 tabani 3864 HTML sayfa, Phase 6 sonrasi 656 HTML sayfa ve 1 JSON cikti olarak gorunuyor; boylece 3208 calisma HTML sayfasi uretimden kalkti.

Dogrulama:

- `npm run routes:report`: 3864 HTML sayfadan 656 HTML sayfaya inildigi ve 1 ek JSON ciktisi uretildigi dogrulandi.
- `npm test`: 20 test takimi ve 98 test basariyla gecti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyari ve 0 ipucu ile gecti.
- `npm run build:timed`: varlik esitleme 7.73s, manifest uretimi 3.20s, PDF dogrulamasi 3.25s, Astro build 325.09s, toplam 339.27s ile tamamlandi; Astro 656 sayfa uretti.
- Astro build ayrintisi: statik entrypoint asamasi 184.14s, statik route uretimi 9.82s olarak olculdu.
- `npm run smoke:html`: fresh build ciktisi uzerinde statik HTML smoke kontrolleri basariyla gecti.

### GELISTIRME-HATTI-FAZ-5 -- Uretilen kutuphane verisi kitap bazinda bolundu

`development-pipeline-plan.md` icindeki 5. faz dilimlere ayrildi ve uygulandi. Tek buyuk `src/data/library.generated.ts` dosyasi yerine kucuk bir uretilen indeks ve kitap bazli `src/data/books/<kitap>.generated.ts` modulleri uretiliyor. Indeks; genel istatistikleri, kitap ozetlerini, parca sayilarini, calisma destesi sayilarini ve statik route uretimi icin hafif parca/calisma route bilgisini tasiyor. Tam parca, indirme ve deste verisi ilgili kitap modulunde kaliyor.

`scripts/generate-manifest.mjs` kitap modullerini uretmeye, eski kitap modulu kalintilarini temizlemeye ve icerik degismediyse `generatedAt` alanini korumaya devam edecek sekilde guncellendi. Uretilen indeks `loadBook(bookSlug)` ile tek kitap yuklemeyi ve ihtiyac halinde `loadLibrary()` ile tam manifesti olusturmayi destekliyor.

Ana sayfa artik kitap kartlari ve istatistikler icin kucuk `libraryIndex` verisini kullaniyor. Turkce ve Ingilizce kitap, parca ve calisma route dosyalari `getStaticPaths` icin indeks route bilgisini kullaniyor; sayfa render edilirken yalnizca ilgili kitap `loadBook` ile yukleniyor. Boylece yeni kitaplar eklendikce yerel gelistirme tarafinda her sayfa icin tek buyuk manifesti okumaya bagimlilik azaltilmis oldu.

Dogrulama:

- `npm run manifest:generate`: `src/data/library.generated.ts` ve 4 kitap modulu uretildi.
- `node --test src\data\library.generated.test.mjs src\features\library\libraryHome.test.mjs`: 2 test takimi ve 6 test basariyla gecti.
- `npm test`: 19 test takimi ve 86 test basariyla gecti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyari ve 0 ipucu ile gecti.
- Ilk `npm run build` denemesi 240 saniyelik komut zaman asimina takildi; bu noktada varlik esitleme, manifest uretimi ve PDF dogrulamasi basariyla tamamlanmisti.
- Daha uzun zaman asimiyla `npm run build`: 6420/6420 PDF dogrulamasi ve 3864 statik sayfa uretimi basariyla tamamlandi.
- `npm run smoke:html`: fresh build ciktisi uzerinde statik HTML smoke kontrolleri basariyla gecti.

### UX-DEVAM-HANDOFF-DOGRULAMASI -- Devam UX kapsamı build ve smoke ile doğrulandı

`docs/ux-development-tdd-plan.md` içindeki 14. aşama tamamlandı. Okul sınıf aralığı sözlüğü, ana sayfa karışık yaş dersi metinleri, kitap sayfası filtresi, parça indirme görünümü, çalışma sayfası bağlamı ve responsive CSS sözleşmeleri için odaklı devam testleri yeniden çalıştırıldı. Ardından tam test, Astro tip denetimi, statik build ve HTML smoke doğrulaması yapıldı.

Fresh build sonrasındaki ilk HTML smoke kontrolü, çalışma sayfası okul aralığı notunda Türkçe metnin `için için` tekrarına düşebildiğini yakaladı. Bunun sebebi açıklayıcı okul aralığı etiketinin zaten `için` ile bitmesi ve çalışma notunun ayrıca `için` eklemesiydi. Çalışma notu Türkçe ve İngilizcede `Bu deste şu okul aralığı için hazırlanmıştır: ...` / `This deck is prepared for this school range: ...` biçimine çekildi; i18n sözleşmesi ve statik HTML smoke beklentileri bu kullanıcıya görünen düzeltmeyi denetleyecek şekilde güncellendi.

Build hattı da tam olarak çalıştırıldı. `assets:sync` değişen varlık bulmadı, manifest 4 kitap, 321 parça, 1605 çalışma destesi, 3210 DOCX, 3210 normal PDF ve 3210 mobil PDF ile yeniden üretildi. PDF doğrulaması 6420/6420 beklenen PDF dosyasını hazır buldu. Astro statik build 3864 sayfa üretti ve sonrasında temsilî Türkçe/İngilizce ana sayfa, kitap sayfası, parça sayfası ve çalışma sayfası HTML smoke kontrolünden geçti.

Doğrulama:

- `node --test src\i18n\libraryLabels.test.mjs src\i18n\uiContract.test.mjs src\features\library\pageAccessibility.test.mjs src\features\library\bookPageClient.test.mjs src\features\library\partDownloads.test.mjs src\features\study\StudyPage.markup.test.mjs src\features\study\studyPageClient.test.mjs src\styles\globalCssContract.test.mjs scripts\static-html-smoke.test.mjs`: 9 test takımı ve 48 test başarıyla geçti.
- `node --test src\i18n\uiContract.test.mjs scripts\static-html-smoke.test.mjs`: çalışma notu kopya `için` düzeltmesi için 2 test takımı ve 13 test başarıyla geçti.
- `npm test`: 18 test takımı ve 83 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build`: varlık eşitleme, manifest üretimi, 6420/6420 PDF doğrulaması ve 3864 sayfalık Astro build başarıyla tamamlandı.
- `npm run smoke:html`: fresh build çıktısı üzerinde statik HTML smoke kontrolleri başarıyla geçti.

## 2026-06-18

### UX-CALISMA-SAYFASI-OKUL-ARALIGI-VE-RESPONSIVE-INCELEME -- Çalışma bağlamı ve responsive kontrol tamamlandı

`docs/ux-development-tdd-plan.md` içindeki 12. aşama uygulandı. Çalışma sayfası başlığının altındaki bilgi satırı artık yalnızca kısa seviye etiketini değil, seviye ile okul sınıf aralığını birlikte gösteren açıklayıcı etiketi kullanıyor. Böylece kullanıcı hangi desteği açtığını ilk ekranda `8. sınıf seviyesi - 7-9. okul sınıfları için` gibi net bir ifadeyle görebiliyor.

Aynı alana kısa bir not eklendi: bu desteğin seçilen okul aralığı için hazırlandığı, aynı parçayı çalışan diğer talebelerin kendi okul aralığına uygun desteyi kullanabileceği anlatılıyor. Kart öncesi çalışma yönergesi, kaynak metnin yalnızca cevap açıldıktan sonra görülebilmesi ve cevap açıldığında puanlama kontrollerine otomatik kaydırma davranışı korunuyor.

Ardından 13. aşamadaki responsive inceleme tamamlandı. Ana sayfa, kitap sayfası, parça sayfası ve çalışma sayfası yerel Astro geliştirme sunucusunda Chrome DevTools Protocol ile 320px, 390px, 640px, 860px ve 1280px genişliklerinde kontrol edildi. Son ölçümlerde tüm temsilî sayfalarda `clientWidth == scrollWidth` sonucu alındı; yatay belge taşması ölçülmedi. İnceleme notu `docs/responsive-review-20260619.md` dosyasına kaydedildi.

İlk dar ekran geçişinde görülen başlık ve üst menü kırpılmaları için `body`, `.page-title` ve `h1` genişlik/sarma kuralları sıkılaştırıldı; mobilde üst aksiyon satırı ve gezinme kontrolleri tam satır genişliğine alındı. Uzun okul aralığı metinleri, ana sayfa seviye satırı ve parça başlıkları için sarmalama sözleşmesi eklendi. Çalışma kartı telefon genişliklerinde tekrar küçültüldü; uzun seçili okul aralığı bağlamı eklendikten sonra da cevap açma sonrası kaynak/puanlama kontrollerinin erişilebilir kalması hedeflendi.

Doğrulama:

- `node --test src\i18n\uiContract.test.mjs src\features\study\StudyPage.markup.test.mjs src\features\study\studyPageClient.test.mjs src\styles\globalCssContract.test.mjs scripts\static-html-smoke.test.mjs`: çalışma sayfası okul aralığı bağlamı için odaklı testler başarıyla geçti.
- `node --test src\styles\globalCssContract.test.mjs`: responsive CSS sözleşmesi için 10 test başarıyla geçti.
- `npm test`: 18 test takımı ve 83 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build` çalıştırılmadı; tam build ve HTML smoke doğrulaması planın 14. aşamasındaki handoff adımına bırakıldı.

### UX-PARCA-SAYFASI-KARISIK-YAS-MATERYAL-SECIMI -- Parça indirmelerinde okul aralığı bağlamı netleştirildi

`docs/ux-development-tdd-plan.md` içindeki 11. aşama uygulandı. Parça sayfasındaki `İndirmeler ve Çalışmalar` paneline, farklı yaşlardan talebelerin aynı parçayı çalışıp kendi okul sınıf aralığına uygun bilgi kartı veya soru kağıdını kullanabileceğini anlatan kısa bir açıklama eklendi.

İndirme gruplarındaki sınıf başlıkları artık yalnızca seviye adını değil, seviye ile okul sınıf aralığını birlikte gösteren açıklayıcı etiketi kullanıyor. Aynı etiket `summary` erişilebilirlik açıklamasına da taşındı; böylece ekran okuyucu kullanıcıları hangi okul aralığı materyalini açıp kapattığını duyabiliyor. Yerel `details` akordeon yapısı korunurken indirme görünüm modeli için Study/Word/PDF/Mobil PDF bağlantılarının değişmediğini doğrulayan test genişletildi.

Doğrulama:

- `node --test src\i18n\uiContract.test.mjs src\features\library\pageAccessibility.test.mjs src\features\library\partDownloads.test.mjs src\styles\globalCssContract.test.mjs scripts\static-html-smoke.test.mjs`: odaklı testler başarıyla geçti.
- `npm test`: 18 test takımı ve 81 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build` çalıştırılmadı; tam build ve HTML smoke doğrulaması planın 14. aşamasındaki handoff adımına bırakıldı.
- Yoğun parça mobil tarayıcı kontrolü bu turda çalıştırılmadı; 13. aşamadaki responsive incelemeye bırakıldı.

### UX-KITAP-SAYFASI-OKUL-ARALIGI-FILTRESI -- Kitap sayfası filtresi okul aralığına göre netleştirildi

`docs/ux-development-tdd-plan.md` içindeki 10. aşama uygulandı. Kitap sayfasındaki sınıf filtresi artık `Sınıf` yerine `Okul sınıf aralığı` kavramını kullanıyor; tüm seçenek etiketi `Tüm okul aralıkları` oldu. Seçeneklerin görünen metni kısa okul aralığı etiketlerine taşındı (`2-3. okul sınıfları`, `grades 2-3` gibi), fakat filtre değerleri mevcut `2-sinif`, `5-sinif`, `8-sinif`, `11-sinif` ve `lisans` iç kimlikleriyle kaldı.

Kitap yönlendirme metni her parçanın birden çok okul sınıf aralığı için materyal içerebileceğini açıklayacak şekilde güncellendi. Parça kartlarındaki kapasite rozeti de `5 seviye` yerine `5 okul aralığı` / `5 school ranges` çizgisine çekildi. Daha uzun filtre etiketleri için dar araç çubuklarında taşmayı azaltan CSS sözleşmesi eklendi. Aynı çalışma içinde ana sayfadaki kısa `Aç` düğmesinin dar alanda `A` ve `ç` olarak iki satıra kırılması da giderildi; genel düğme sarmalama kuralı `break-word` çizgisine çekildi ve kitap kartı aksiyon düğmesi tek satırda tutuldu.

Doğrulama:

- `node --test src\i18n\uiContract.test.mjs src\features\library\pageAccessibility.test.mjs src\features\library\bookPageClient.test.mjs src\styles\globalCssContract.test.mjs scripts\static-html-smoke.test.mjs`: odaklı testler başarıyla geçti.
- `npm test`: 18 test takımı ve 80 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build` çalıştırılmadı; tam build ve HTML smoke doğrulaması planın 14. aşamasındaki handoff adımına bırakıldı.

### UX-ANA-SAYFA-KARISIK-YAS-AKISI -- Ana sayfaya karışık yaş dersi vurgusu eklendi

`docs/ux-development-tdd-plan.md` içindeki 9. aşama uygulandı. Ana sayfa artık okul sınıf aralığı bilgisini kısa bir bağlam notuyla gösteriyor ve bu etiketlerin medrese sınıfı değil normal okul sınıfı aralıkları olduğunu ilk ekranda netleştiriyor.

Değer kartlarına karışık yaş gruplarıyla aynı derste çalışma senaryosu eklendi. Ders akışı; kitap/parça seçimi, her talebe için uygun okul aralığı materyalini belirleme, aynı parçayı farklı seviyedeki kart veya soru kağıtlarıyla çalışma, metin açıkken cevaplama ve cevabı doğrudan söylemeden ilgili paragrafa yönlendirme adımlarını anlatacak şekilde güncellendi. Akışın ana kısmı görünür kalırken karışık sınıf uygulaması için yerel `details` açıklaması eklendi.

Doğrulama:

- `node --test src\i18n\uiContract.test.mjs src\features\library\pageAccessibility.test.mjs src\styles\globalCssContract.test.mjs scripts\static-html-smoke.test.mjs`: odaklı testler başarıyla geçti.
- `npm test`: 18 test takımı ve 75 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build` çalıştırılmadı; tam build ve HTML smoke doğrulaması planın 14. aşamasındaki handoff adımına bırakıldı.

### UX-OKUL-SINIF-ARALIGI-SOZLUGU -- Sınıf etiketleri okul aralığı kavramına taşındı

`docs/UX-tasarim-2.md` devam notuna göre UX planının 8. aşaması uygulandı. Mevcut `2-sinif`, `5-sinif`, `8-sinif`, `11-sinif` ve `lisans` iç kimlikleri değiştirilmeden, kullanıcıya gösterilecek sınıf ifadeleri merkezi bir okul sınıf aralığı yardımcısına taşındı. Yardımcı artık kısa etiket, seviye etiketi, aralık etiketi ve açıklayıcı etiketi Türkçe/İngilizce olarak üretiyor.

İngilizce kullanıcı yüzündeki `Undergraduate` anlamı, mevcut `lisans` materyal kovasının gerçek kullanımını daha iyi anlatan `Post-high-school level` ifadesine çevrildi. Türkçe tarafta da `Lise sonrası seviye` ve okul sınıf aralığı notları eklendi. `src/i18n/index.ts` içine okul sınıf aralığı, normal okul sınıfı açıklaması, karışık yaş grubu notu ve lise sonrası seviye sözleşmesi eklendi.

Doğrulama:

- `node --test src\i18n\libraryLabels.test.mjs src\i18n\uiContract.test.mjs`: odaklı testler başarıyla geçti.
- `npm test`: 18 test takımı ve 72 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build` çalıştırılmadı; tam build ve smoke doğrulaması planın 14. aşamasındaki handoff adımına bırakıldı.

## 2026-06-17

### KISMI-DOCX-PDF-SEL-YENILEME -- Yenilenen dosyalar seçili olarak eşitlendi

`C:\<kitap>\backup-redistribution-redo-20260617-001330` klasörlerinde yedeği alınan dosyalar yenilenen kaynak listesinin sınırı olarak kullanıldı. Yalnızca bu listedeki DOCX ve SEL dosyaları `C:\<kitap>\<sınıf>` ve `C:\<kitap>\<sınıf>\mobile` klasörlerindeki yeni sürümlerden alındı; diğer DOCX/PDF ve çalışma desteleri yeniden üretilmedi.

Normal ve mobil DOCX dosyaları `assets` ve `public/assets` altına eşitlendi. LibreOffice dönüştürmesi, mevcut LibreOffice profilinde takılma görüldüğü için izole geçici kullanıcı profiliyle çalıştırıldı; dönüşüm yarıda kaldığında eksik PDF listesi yedek dosya adlarından tekrar çıkarıldı ve yalnızca eksik hedefler yeniden denendi. Kalan LibreOffice geçici `.tmp` dosyaları temizlendi.

SEL seçim dosyalarından yalnızca yenilenen 975 etkileşimli çalışma destesi yeniden üretildi ve `public/assets` altına kopyalandı. Manifest yeniden üretildi.

Doğrulama:

- Yenilenen kaynak sayımı: 3900 DOCX ve 975 SEL dosyası işlendi.
- Kitap bazında SEL güncellemesi: Küçük Sözler 181, Âyetü'l-Kübra 387, Tabiat Risalesi 123 ve Meyve Risalesi 284 deste yazıldı.
- Yenilenen DOCX/PDF kontrolü: 3900/3900 PDF `assets` ve `public/assets` altında bulundu; eksik hedef kalmadı.
- `npm run manifest:generate`: manifest 4 kitap, 321 parça, 1605 çalışma destesi, 3210 DOCX, 3210 normal PDF ve 3210 mobil PDF ile üretildi.
- `npm run pdf:validate:strict`: `6420/6420` beklenen PDF hazır bulundu.
- `npm test`: 17 test takımı ve 66 test başarıyla geçti.
- `npm run build`: 3864 statik sayfa başarıyla üretildi.

## 2026-06-16

### UX-MOBIL-BILGI-KARTI-KONTROLLERI -- Mobil çalışma kartı ve cevap düğmeleri erişilebilir hale getirildi

Çalışma ekranında mobil telefonda kart çok yüksek kaldığı için cevap açıldığında `Metni Gör`, `Tekrar`, `Zor` ve `Kolay` kontrolleri görünür alanın altında kalabiliyordu. Bu nedenle telefon genişliklerinde çalışma kartı için ayrı bir yükseklik kuralı eklendi: kart artık daha küçük bir `clamp` yüksekliği kullanıyor, uzun cevaplar kart içinde kaydırılabiliyor ve metin boyutu mobilde daha sıkı ayarlanıyor.

Cevap gösterildiğinde çalışma kontrollerinin kullanıcıya gelmesi için `scrollAnswerControlsIntoView` yardımcısı eklendi. Kart çevrildiğinde önce `Metni Gör` ve değerlendirme satırı görünür hale getiriliyor, ardından değerlendirme satırı yumuşak şekilde görünür alana kaydırılıyor. Böylece kullanıcı çalışma sırasında yukarı kaydırmış olsa bile cevap sonrasında puanlama düğmelerine ulaşmak için ayrıca aşağı inmek zorunda kalmıyor.

Doğrulama:

- `node --test src\features\study\studyPageClient.test.mjs src\styles\globalCssContract.test.mjs`: odaklı testler başarıyla geçti.
- `npm test`: 17 test takımı ve 66 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build` çalıştırılmadı.

### UX-GORSEL-SISTEM-ERISILEBILIRLIK -- Odak görünürlüğü ve taşma sözleşmeleri eklendi

`docs/ux-development-tdd-plan.md` içindeki 6. aşamanın testlenebilir kısmı tamamlandı. Yeni `globalCssContract` testi; ana sayfa değer kartları, ders akışı, yönlendirme panelleri, rozetler, indirme grupları ve çalışma yönergesi için CSS sözleşmesini denetliyor. Kart/panel köşe yarıçaplarının 8px çizgide kalması, yeni yüzeylerin tema değişkenleriyle çalışması ve yeni/öğrenme çalışma durumlarının tek renkli bir palete dönüşmemesi de test kapsamına alındı.

Klavye kullanıcıları için arama alanı, sınıf filtresi, gezinti bağlantıları, parça başlığı bağlantıları ve indirme `summary` kontrollerinde görünür `focus-visible` çizgileri eklendi. Kompakt kontrollerde uzun Türkçe/İngilizce metinlerin taşmasını azaltmak için düğmeler, rozetler, istatistik metinleri, indirme özetleri ve indirme düğmeleri üzerinde `overflow-wrap` ve genişlik sınırları güçlendirildi. Ayrıca sayfa bileşenlerinde tek `h1`, etiketli istatistik bölümü, yönlendirme panelleri, parça gezinmeleri, indirme alanı ve çalışma kaynak metin diyaloğu için statik erişilebilirlik sözleşmesi eklendi.

Doğrulama:

- `node --test src\styles\globalCssContract.test.mjs src\features\library\pageAccessibility.test.mjs`: odaklı testler başarıyla geçti.
- `npm test`: 17 test takımı ve 62 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build` çalıştırılmadı; kullanıcı bu turda build çalıştırılmamasını istedi.
- Manuel responsive ekran notları henüz alınmadı; ilgili plan dilimi açık bırakıldı.

### UX-CALISMA-SAYFASI-YONLENDIRME -- Çalışma sayfasına kısa kart yönergesi eklendi

`docs/ux-development-tdd-plan.md` içindeki 5. aşama büyük ölçüde tamamlandı. Çalışma sayfasında kartın üstüne kısa bir yönerge eklendi: kullanıcı önce soruyu okuyacak, cevabı düşünecek, sonra kartı çevirecek. Bu açıklama tur veya uzun onboarding eklemeden çalışma akışını ilk ekranda daha anlaşılır hale getiriyor.

Çalışma sayfası için yeni statik markup sözleşmesi eklendi. Testler yönergenin etkileşimli karttan önce geldiğini, ilk kart tarafının soru olarak kaldığını ve `Metni Gör` düğmesinin başlangıçta gizli davranışını koruduğunu doğruluyor. Kaynak metnin yalnızca cevap gösterildikten sonra açılabilmesi `canOpenSourceText` yardımcısıyla testlenebilir hale getirildi; oturum kuyruğu ve mevcut kaynak metin modal davranışı değiştirilmedi.

Doğrulama:

- `node --test src\features\study\studyPageClient.test.mjs src\features\study\StudyPage.markup.test.mjs src\i18n\uiContract.test.mjs`: odaklı testler başarıyla geçti.
- `npm test`: 15 test takımı ve 52 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build` çalıştırılmadı; kullanıcı bu turda build çalıştırılmamasını istedi.
- Mobil görsel yerleşim kontrolü henüz yapılmadı; ilgili plan dilimi açık bırakıldı.

### UX-PARCA-SAYFASI-AKIS-VE-INDIRME -- Parça sayfası iş akışı ve indirme grupları netleştirildi

`docs/ux-development-tdd-plan.md` içindeki 4. aşama büyük ölçüde tamamlandı. Parça okuma sayfasında metnin üstüne kısa bir "Bu parçayla ne yapabilirim?" paneli eklendi. Panel kullanıcıya metni okuma, sınıf düzeyini seçme, bilgi kartı çalıştırma veya soru kağıdı indirme akışını kısa adımlarla gösteriyor.

İndirme paneli `src/features/library/partDownloads.js` yardımcısına taşınan testli bir görünüm modeliyle yeniden düzenlendi. Her sınıf düzeyi native `details` bölümü olarak gösteriliyor; ilk sınıf açık geliyor, diğer sınıflar JavaScript gerektirmeden açılıp kapanabiliyor. Her sınıf içinde Bilgi Kartı ve Soru Kağıdı ayrı materyal blokları olarak görünüyor. Bilgi Kartı için hazırlık/tekrar açıklaması, Soru Kağıdı için metin açıkken cevaplama açıklaması eklendi. Word, PDF, Mobil PDF ve mevcutsa çalışma bağlantıları aynı URL'leri koruyacak şekilde render ediliyor.

Doğrulama:

- `node --test src\features\library\partDownloads.test.mjs src\i18n\uiContract.test.mjs`: odaklı testler başarıyla geçti.
- `npm test`: 13 test takımı ve 48 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build` çalıştırılmadı; kullanıcı bu turda build çalıştırılmamasını istedi.

### UX-KITAP-SAYFASI-YONLENDIRME -- Kitap sayfasına parça seçimi yönlendirmesi ve materyal rozetleri eklendi

`docs/ux-development-tdd-plan.md` içindeki 3. aşama tamamlandı. Kitap sayfasının görevi aynı kaldı: kullanıcı bu ekranda işleyeceği veya çalışacağı parçayı seçiyor. Bu akışı daha açık hale getirmek için filtrelerin üstüne kısa bir yönlendirme paneli eklendi; panel, parçayı seçince metin, sınıf düzeyine göre soru kağıtları ve bilgi kartlarının birlikte geleceğini söylüyor.

Parça satırlarına küçük materyal rozetleri eklendi. Rozetler parçada metin bulunduğunu, kaç seviye için materyal olduğunu, bilgi kartı ve soru kağıdı bulunup bulunmadığını `LibraryPart` verisinden türetiyor. Bu mantık `src/features/library/libraryBook.js` yardımcısına taşındı ve regresyon testleri eklendi. Kitap sayfasındaki arama ve sınıf filtresi de `src/features/library/bookPageClient.js` içine alındı; Türkçe arama normalizasyonu ve sınıf filtreleme davranışı testlerle güvence altına alındı.

Doğrulama:

- `node --test src\features\library\libraryBook.test.mjs src\features\library\bookPageClient.test.mjs src\i18n\uiContract.test.mjs`: odaklı testler başarıyla geçti.
- `npm test`: 12 test takımı ve 44 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build` çalıştırılmadı; kullanıcı bu turda build çalıştırılmamasını istedi.

### UX-ANA-SAYFA-TDD -- Ana sayfa ders materyali kütüphanesi olarak yeniden konumlandırıldı

`docs/ux-development-tdd-plan.md` planındaki ilk UX dilimleri uygulanmaya başlandı. Planın başlangıç/test altyapısı, ana sayfa içerik sözleşmesi ve ana sayfa ilk ekran düzeni dilimleri tamamlandı olarak işaretlendi; kitap, parça ve çalışma sayfası iyileştirmeleri sonraki aşamalara bırakıldı. Manuel responsive ekran kontrolü henüz tamamlanmadığı için ilgili dilim açık bırakıldı.

Ana sayfa artık doğrudan belge arşivi gibi başlamıyor; ilk ekranda Risale dersleri için hazır soru kağıtları ve bilgi kartları mesajını, `Kitapları Gör` ve `Örnek Ders Akışı` çağrılarını, sınıf düzeyleri satırını ve kitap/parça/seviye/format özetini gösteriyor. Devamında dört kısa fayda kartı, örnek ders akışı ve web uygulamasının soru düzenleme programı olmadığına dair açıklama eklendi. Mevcut kitap kartları korunarak yeni `#books` bölümüne taşındı.

Ana sayfa verisi için `src/features/library/libraryHome.js` yardımcısı ve testleri eklendi. `src/i18n/index.ts` içine Türkçe/İngilizce ana sayfa metin sözleşmesi eklendi; `src/i18n/uiContract.test.mjs` bu anahtarların iki dilde de bulunmasını ve masaüstü düzenleme notunun hero mesajına taşınmamasını denetliyor. `scripts/static-html-smoke.mjs` ve `npm run smoke:html` komutu eklendi; bu kontrol ana sayfalarla birlikte temsilî kitap, parça ve çalışma rotalarının build çıktısında beklenen metin ve bağlantıları içerdiğini doğruluyor.

Doğrulama:

- `node --test src\features\library\libraryHome.test.mjs src\i18n\uiContract.test.mjs scripts\static-html-smoke.test.mjs`: odaklı testler başarıyla geçti.
- `npm test`: 10 test takımı ve 39 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build`: PDF doğrulaması `6420/6420` beklenen PDF dosyasını hazır buldu ve 3864 statik sayfa başarıyla üretildi. İlk deneme 5 dakikalık komut zaman aşımına takıldığı için build daha uzun süre sınırıyla tekrar çalıştırıldı.
- `npm run smoke:html`: Türkçe/İngilizce ana sayfa, temsilî kitap sayfası, parça sayfası ve çalışma sayfası smoke kontrolleri başarıyla geçti.

## 2026-06-15

### CALISMA-KAYNAK-METIN-GORUNTULEME -- Cevap sonrası kaynak metin görüntüleme eklendi

Bilgi kartı çalışma ekranına, cevap gösterildikten sonra aynı oturum içinde kaynak parça metnini açan `Metni Gör` / `View Text` düğmesi eklendi. Bu düğme soru tarafı görünürken gizli kalıyor; yalnızca cevap açıldıktan sonra kullanılabiliyor. Kaynak metin ayrı bir sayfaya yönlendirmeden, çalışma sayfasındaki modal görüntüleyicide açılıyor. Böylece çalışılan kart sayısı, yeni/öğrenme sayaçları, mevcut kart ve oturum kuyruğu korunuyor. Modal açıkken değerlendirme tıklamaları ve klavye kısayolları işlenmiyor; kullanıcı `Çalışmaya dön` / `Return to study` ile aynı oturuma devam ediyor.

Kaynak metinler çalışma sayfalarının HTML çıktısına gömülmek yerine mevcut parça metni URL'sinden ihtiyaç anında yükleniyor. Bu, 1605 çalışma destesinin iki dilde ürettiği statik sayfalarda aynı metnin tekrar tekrar çoğaltılmasını engelliyor ve build çıktısını daha küçük tutuyor. Normal parça okuma sayfası ile çalışma içi kaynak metin görüntüleyicisi aynı paragraf ve Arapça/Latin metin ayrıştırma mantığını kullanacak şekilde `src/features/library/partText.js` ortak yardımcısına taşındı; bu yardımcı için regresyon testleri eklendi.

`flashcard-study-tdd-plan.md` dosyasında kaynak metin görüntüleme dilimi tamamlandı olarak işaretlendi. Kabul ölçütlerine, kaynak metnin soru tarafında açılamaması ve aç-kapat işleminin çalışma oturumunu sıfırlamaması eklendi.

Doğrulama:

- `npm test`: 7 test takımı ve 30 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build`: PDF doğrulaması `6420/6420` beklenen PDF dosyasını hazır buldu ve 3864 statik sayfa başarıyla üretildi.
- Örnek çalışma sayfası çıktısında `Metni Gör` düğmesinin gizli başladığı, `Good` düğmesinin görünmediği, kaynak metin URL'sinin bulunduğu ve kaynak metnin HTML'e gömülmediği doğrulandı.

## 2026-06-14

### ANKI-OTURUM-RENKLERI-VE-DUGME-SADELESTIRME -- Çalışma oturumunda yeni/öğrenme durumu ve üç düğmeli değerlendirme eklendi

Çalışma ekranında uzun dönem tekrar istatistiği tutulmadan Anki'ye daha yakın bir oturum içi durum gösterimi eklendi. Her kart oturum başında mavi/yeni olarak başlıyor; `Again` ve `Hard` verilen kartlar aynı oturum içinde kırmızı/öğrenme durumuna geçiyor. Kalıcı tekrar geçmişi olmadığı için yeşil/gözden geçirme durumu şimdilik arayüzde gösterilmiyor. Çalışma sayfası aktif destedeki yeni ve öğrenme kartı sayılarını canlı olarak gösteriyor; kartın kenarlığı ve taraf etiketi de kartın oturum durumuna göre renklendiriliyor.

Değerlendirme düğmelerinin üstüne gerçek zaman aralığı iddiası taşımayan kısa sonuç etiketleri eklendi: `Again` için `Soon`/`Yakında`, `Hard` için `Later`/`Sonra`, `Easy` için `Done`/`Bitti`. Zaman ölçümü ve kalıcı zamanlayıcı henüz olmadığı için `Good` düğmesi görünür arayüzden ve klavye kısayollarından kaldırıldı; kullanıcı şu anda `Again`, `Hard` ve `Easy` ile çalışıyor. İç oturum kuyruğu `Good` değerini desteklemeye devam ediyor, böylece zaman tabanlı tekrar algoritması eklenince düğme geri getirilebilecek.

`flashcard-study-tdd-plan.md` dosyasında tamamlanan dilimler işaretlendi; zaman tabanlı öğrenme adımları, dakika/gün etiketleri ve `Good` düğmesinin farklı bir aralıkla geri getirilmesi ileri geliştirme maddesi olarak kaydedildi.

Doğrulama:

- `npm test`: 6 test takımı ve 27 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build`: PDF doğrulaması `6420/6420` beklenen PDF dosyasını hazır buldu ve 3864 statik sayfa başarıyla üretildi.
- Netlify üretim yayını güncellendi; canlı çalışma sayfasında yalnızca `Tekrar`, `Zor` ve `Kolay` düğmeleri ile `Yakında`, `Sonra`, `Bitti` etiketleri doğrulandı.

### DORT-KITAP-DOCX-PDF-SEL-TEKRAR-YENILEME -- Dört kitap yenilenen kaynaklardan baştan eşitlendi

Âyetü'l-Kübra, Küçük Sözler, Meyve Risalesi ve Tabiat Risalesi için DOCX kaynakları yeniden `C:\<kitap>` klasörlerinden alındı. Önce eski PDF çıktıları dört kitap için `assets` altında temizlendi; ardından `scripts/generate-pdfs.mjs` ile normal `BK_`/`SK_` ve mobil `BK6_`/`SK6_` PDF dosyaları yeniden üretildi. Üretilen PDF dosyaları `public/assets` altına tekrar eşitlendi.

DOCX dosyaları da aynı kaynak klasörlerden `assets` ve `public/assets` altına yeniden kopyalandı. Etkileşimli bilgi kartı desteleri dört kitap için `SEL_*.json` kaynaklarından yeniden üretildi ve `public/assets` altındaki soru bankaları da yenilendi. Böylece mobil flashcard PDF'lerinde kullanılan seçimler ile tarayıcıdaki etkileşimli bilgi kartları tekrar aynı `SEL` seçimlerine bağlandı.

Doğrulama:

- PDF üretimi: Âyetü'l-Kübra 1160 normal + 1160 mobil, Küçük Sözler 670 normal + 670 mobil, Meyve Risalesi 1060 normal + 1060 mobil, Tabiat Risalesi 320 normal + 320 mobil PDF ile tamamlandı.
- PDF/DOCX sayımı: `assets` ve `public/assets` altında toplam 6420 PDF ve 6420 DOCX bulundu; kitap bazında Âyetü'l-Kübra 2320, Küçük Sözler 1340, Meyve Risalesi 2120 ve Tabiat Risalesi 640 dosya eşleşti.
- `npm run study:import:bulk`: Âyetü'l-Kübra 580/580, Küçük Sözler 335/335, Meyve Risalesi 530/530 ve Tabiat Risalesi 160/160 deste yazıldı.
- SEL kontrolü: 1605/1605 çalışma destesi `selection.source = "SEL"` olarak üretildi. Kaynak seçimlere uygun olarak yalnızca `ayetul-kubra/8-sinif/p07` 23 kart, `kucuk-sozler/2-sinif/p29` 17 kart ve `meyve-risalesi/8-sinif/p99` 18 kart içeriyor.
- `npm run manifest:generate`: manifest 4 kitap, 321 parça, 1605 çalışma destesi, 3210 DOCX, 3210 normal PDF ve 3210 mobil PDF ile üretildi.
- `npm run pdf:validate` ve `npm run pdf:validate:strict`: `6420/6420` beklenen PDF hazır bulundu.
- `npm test`: 6 test takımı ve 25 test başarıyla geçti.
- `npm run build`: Astro statik build başarıyla tamamlandı.

### MEYVE-RISALESI-YENILEME -- DOCX/PDF çıktıları ve SEL çalışma desteleri yenilendi

Meyve Risalesi için yenilenen kaynaklar `C:\meyve-risalesi` klasöründen alındı. Her sınıf düzeyinde 106 parça için normal `BK_`/`SK_` DOCX dosyaları ve mobil `BK6_`/`SK6_` DOCX dosyaları işlendi. Eski Meyve PDF çıktıları `assets/meyve-risalesi` altında temizlendi; ardından `scripts/generate-pdfs.mjs` ile normal ve mobil PDF dosyaları yeniden üretildi. Yenilenen DOCX ve PDF dosyaları `assets` ve `public/assets` altındaki Meyve Risalesi klasörlerine eşitlendi.

Etkileşimli bilgi kartı çalışmaları da aynı kaynak klasördeki `SEL_*.json` seçim dosyalarından yeniden üretildi. 530 çalışma destesinin tamamı `selection.source = "SEL"` olacak şekilde yazıldı; böylece Meyve Risalesi için tarayıcıdaki çalışma kartları da flashcard belgelerinde kullanılan seçilmiş kartlarla aynı hale geldi. `8-sinif/p99` destesinin 18 kart içermesi kaynak `SEL_` dosyasındaki `flashcardQuestions = 18` değeriyle uyumlu olarak korundu.

PDF doğrulama betiği, yenilenen belge yapısındaki mobil DOCX dosyalarının doğrudan `mobile` klasöründe bulunmasını da destekleyecek şekilde güncellendi. Böylece `pdf:validate` artık `mobile/docx` yanında `mobile` klasörlerini de tarıyor ve mobil PDF beklentilerini doğru sayıyor. DOCX/PDF yenileme runbook'u Meyve Risalesi komutları, sayımları ve `SEL_` içe aktarma adımıyla genişletildi.

Doğrulama:

- `npm run pdf:generate -- --book meyve-risalesi --docx-root C:\ --mode all --force`: 1060 normal ve 1060 mobil PDF işiyle tamamlandı.
- DOCX/PDF sayımı: `assets` ve `public/assets` altında Meyve Risalesi için 1060 normal DOCX, 1060 mobil DOCX, 1060 normal PDF ve 1060 mobil PDF bulundu.
- `npm run study:import:bulk -- --source-root C:\meyve-risalesi --assets-root assets --report build\study-import-meyve-risalesi-sel-report.json`: 530/530 deste yazıldı; boş veya atlanan deste olmadı.
- SEL sayımı: Meyve Risalesi 530/530 çalışma destesi `selection.source = "SEL"` olarak üretildi; yalnızca `8-sinif/p99` destesi kaynak seçim dosyasına uygun olarak 18 kart içeriyor.
- Temsilî `8-sinif/p99` kontrolünde `SEL` flashcard kimlikleri ile etkileşimli deste kimlikleri 18/18 aynı sırada eşleşti.
- `npm run manifest:generate`: manifest 4 kitap, 321 parça, 1605 çalışma destesi, 3210 DOCX, 3210 normal PDF ve 3210 mobil PDF ile üretildi.
- `npm run pdf:validate` ve `npm run pdf:validate:strict`: `6420/6420` beklenen PDF hazır bulundu; 3210 normal ve 3210 mobil PDF doğrulandı.
- `npm test`: 6 test takımı ve 25 test başarıyla geçti.

### SECILI-BILGI-KARTI-DESTELERI -- Etkileşimli çalışma desteleri SEL seçimleriyle eşitlendi

Küçük Sözler, Âyetü'l-Kübra ve Tabiat Risalesi için yenilenen belge klasörlerindeki `SEL_*.json` dosyaları etkileşimli bilgi kartı çalışmasının kaynak verisi yapıldı. Bu dosyalardaki `flashcards.questions` listesi, `questionSheet.questions` içindeki soru ve cevaplarla birleştirilerek `assets/<kitap>/question-bank/<sınıf>/<parça>.json` çalışma destelerine yazılıyor. Böylece mobil flashcard PDF'lerinde kullanılan seçilmiş kartlar ile tarayıcıdaki etkileşimli çalışma kartları aynı soru kümesini ve aynı sırayı kullanıyor.

Toplu içe aktarma hattı `SEL_*.json` dosyalarını `SveC_*.txt` kaynaklarına tercih edecek şekilde güncellendi. `SEL_` bulunmayan eski kaynaklar için mevcut QAGeneratorLib ön seçim yolu korunuyor; ancak bu üç kitapta tüm ilgili desteler `SEL` seçimiyle üretildi. Çalışma destesi üretimi için `scripts/study-question-bank.mjs` içine `SEL` seçim JSON'undan deste kuran yol eklendi ve `flashcardIndex` sırasının korunması için regresyon testi yazıldı.

DOCX/PDF yenileme runbook'u `docs/docx-pdf-refresh-procedure.md` içinde `SEL_` tabanlı etkileşimli deste yenileme adımını, kullanılan komutları ve doğrulama kontrolünü içerecek şekilde genişletildi. Üretilen çalışma desteleri `public/assets` altına da eşitlendi; geçici `build/` raporları commit kapsamı dışında bırakıldı.

Doğrulama:

- `npm run study:import:bulk -- --source-root C:\ayetul-kubra --assets-root assets --report build\study-import-ayetul-kubra-sel-report.json`: 580/580 deste yazıldı; boş veya atlanan deste olmadı.
- `npm run study:import:bulk -- --source-root C:\kucuk-sozler --assets-root assets --report build\study-import-kucuk-sozler-sel-report.json`: 335/335 deste yazıldı; boş veya atlanan deste olmadı.
- `npm run study:import:bulk -- --source-root C:\tabiat-risalesi --assets-root assets --report build\study-import-tabiat-risalesi-sel-report.json`: 160/160 deste yazıldı; boş veya atlanan deste olmadı.
- SEL sayımı: Âyetü'l-Kübra 580/580, Küçük Sözler 335/335 ve Tabiat Risalesi 160/160 çalışma destesi `selection.source = "SEL"` olarak üretildi.
- Temsilî Âyetü'l-Kübra `11-sinif/p01` kontrolünde `SEL` flashcard kimlikleri ile etkileşimli deste kimlikleri 24/24 aynı sırada eşleşti.
- `npm test`: 6 test takımı ve 25 test başarıyla geçti.
- `npm run manifest:generate`: manifest 4 kitap, 321 parça, 1605 çalışma destesi, 3210 DOCX, 3210 normal PDF ve 2680 mobil PDF ile üretildi.
- `npm run pdf:validate`: `3740/3740` beklenen PDF hazır bulundu; 3210 normal ve 530 mobil PDF doğrulandı.

## 2026-06-13

### ARAYUZ-METNI-VE-PARCA-GEZINMESI -- Uygulama adı, açıklamalar ve parça gezinmesi güncellendi

Uygulama adı locale bazlı hale getirildi. Türkçe sayfalarda marka başlığı `Risale Tedris Ağ Uygulaması`, İngilizce sayfalarda `Risale Tadrees Web Application` olarak gösteriliyor; İngilizce arayüzde `Ağ Uygulaması` karşılığı `Web Application` yapıldı. Türkçe ve İngilizce kitap listesi ile kitap detay açıklamaları Word/PDF indirmelerini ve etkileşimli bilgi kartı çalışmalarını ayrı satırda gösterecek şekilde güncellendi.

Parça okuma sayfalarında metin paragraflara ayrıldı; sadece Arapça yazıdan oluşan paragraflar ortalanıyor, Türkçe/Arapça veya İngilizce/Arapça karışık paragraflar mevcut sol hizalı akışı koruyor. Aynı kitabın önceki ve sonraki parçasına doğrudan geçmek için parça metninin üstüne ve altına gezinme düğmeleri eklendi.

Doğrulama:

- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `http://127.0.0.1:4321/books/kucuk-sozler/parts/p28/`: HTTP 200 döndü; sayfada `p27` ve `p29` bağlantıları bulundu.
- `http://127.0.0.1:4321/`, `http://127.0.0.1:4321/en/`, `http://127.0.0.1:4321/books/kucuk-sozler/` ve `http://127.0.0.1:4321/en/books/kucuk-sozler/`: güncellenen açıklama metinleri ayrı satırlarla render edildi.

### AYETUL-KUBRA-KUCUK-SOZLER-YENILEME -- Soru bankaları ve PDF çıktıları yenilendi

Ayetül Kübra ve Küçük Sözler kitapları için yeni bölümleme, etiket, soru-cevap ve bağımlılık çıktıları yerel varlıklara işlendi. Ayetül Kübra parça dosyaları ve `part-labels.json` yeni bölüm adlarıyla eşitlendi; Küçük Sözler mevcut parça yapısını korudu. İki kitap için soru bankası JSON dosyaları yeniden toplu içe aktarıldı ve QAGeneratorLib tarafından bağımlılık destekli 24 kart seçimiyle üretilen çalışma desteleri güncellendi.

Yeni DOCX kaynakları `C:\ayetul-kubra` ve `C:\kucuk-sozler` altından kullanılarak normal ve mobil PDF dosyaları yeniden üretildi. `scripts/generate-pdfs.mjs` dosyasına `--docx-root` desteği eklendi; mobil kaynakların `C:\<kitap>\<sinif>\mobile` altında bulunması desteklendi ve aynı PDF çıktı adının birden fazla kaynak kökünden iki kez işlenmesi engellendi. Üretilen PDF dosyaları `assets/` altına yazıldı ve hedeflenen PDF klasörleri `public/assets/` altına eşitlendi.

Belge çıktılarının commit kapsamında kalmaması için `.gitignore` içinde üretilen DOCX, mobil DOCX, normal PDF ve mobil PDF klasörleri açık şekilde yok sayıldı. Değişiklikler stage alanına alındı; DOCX/PDF ve `public/assets/` çıktıları yok sayılmaya devam ediyor.

Doğrulama:

- `npm run pdf:generate -- --book ayetul-kubra --docx-root C:\ --mode all --force`: 1160 normal ve 1160 mobil PDF işiyle tamamlandı.
- `npm run pdf:generate -- --book kucuk-sozler --docx-root C:\ --mode all --force`: 670 normal ve 670 mobil PDF işiyle tamamlandı.
- Hedef PDF sayımı: `assets` ve `public/assets` altında Ayetül Kübra için 1160 normal + 1160 mobil, Küçük Sözler için 670 normal + 670 mobil PDF bulundu.
- `npm run manifest:generate`: manifest 4 kitap, 321 parça, 1605 çalışma destesi, 3210 DOCX, 3210 normal PDF ve 2520 mobil PDF ile üretildi.
- `npm run pdf:validate`: `3900/3900` beklenen PDF hazır bulundu; 3210 normal ve 690 mobil PDF doğrulandı.
- `npm test`: 6 test takımı ve 23 test başarıyla geçti.
- `npm run refresh`: `assets:sync` adımında 15 dakikadan uzun süre takıldı; kalan Node süreçleri durduruldu. Bu nedenle manifest üretimi ve hedeflenen PDF eşitlemesi ayrı komutlarla tamamlandı.

## 2026-06-10

### CALISMA-DESTESI-ON-SECIMI -- Bağımlılık destekli 24 kart seçimi QAGeneratorLib tarafına taşındı

Çalışma destesi seçimi tarayıcı tarafından içe aktarma hattına taşındı. `QAGeneratorLib` içine DOCX üretmeden bağımlılıkları dikkate alan 24 bilgi kartı verisi döndüren bir köprü metodu eklendi. `rissor-ag` toplu içe aktarıcısı bu metodu kullanarak her kitap, sınıf ve parça için yalnızca seçilmiş 24 kartı JSON'a yazıyor. Tarayıcı tarafında bağımlılık çözümleme kaldırıldı; çalışma ekranı gelen JSON sırasını koruyarak kartları gösteriyor.

`hierarchy_preview` alanı çok derin olan bir bağımlılık sidecar dosyası için QAGeneratorLib JSON okuma derinliği artırıldı ve regresyon testi eklendi. Böylece toplu içe aktarım sırasında sidecar verisi geçersiz sayılmadan QAGeneratorLib tarafında okunabiliyor.

Doğrulama:

- `dotnet test C:\Users\musta\source\repos\QAGeneratorLib\QAGeneratorLib.Tests\QAGeneratorLib.Tests.csproj --no-restore`: 70 test başarıyla geçti.
- `dotnet build scripts\study-preselector\StudyPreselector.csproj`: başarıyla geçti; yalnızca mevcut .NET 6 destek sonu uyarıları görüldü.
- `npm test`: 6 test takımı ve 23 test başarıyla geçti.
- `npm run study:import:bulk`: 1605 planlanan destenin tamamı yazıldı; boş veya atlanan deste olmadı.
- Çalışma destesi sayımı: 1605 JSON dosyasının tamamı 24 kart içeriyor; tamamı `QAGeneratorLib` seçimiyle üretildi, fallback yok.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build`: 3864 statik sayfa başarıyla üretildi.

### BILGI-KARTI-CALISMA-MODU -- Parça bazlı çalışma oturumu ve soru bankası içe aktarımı eklendi

Bu committe mobil PDF sayfalarını çalışma kaynağı olarak kullanmak yerine yapılandırılmış soru bankası JSON dosyalarını kullanan Bilgi Kartı çalışma modu eklendi. `QAGeneratorLib` tarafından kullanılan soru bankası çıktılarından statik deste oluşturmak için tekil ve toplu içe aktarma betikleri yazıldı. Toplu içe aktarma hattı tüm kitap, sınıf ve parça eşleşmeleri için `assets/<kitap>/question-bank/<sınıf>/<parça>.json` dosyalarını üretti; toplam 1605 çalışma destesi manifestte görünür hale geldi. Geçici toplu içe aktarma raporu `.gitignore` kapsamına alındı.

Çalışma modu Astro uygulamasında statik route olarak eklendi. Her parça sayfasında, ilgili soru bankası destesi varsa Flashcard indirme satırının altında `Study Flashcards` / `Bilgi Kartlarını Çalış` düğmesi gösteriliyor. Çalışma sayfası her oturumda en fazla 24 kart seçiyor, önce soruyu gösteriyor, kartın kendisine tıklama/dokunma veya `Show answer` düğmesiyle cevabı açıyor ve oturum içi `Again`, `Hard`, `Good`, `Easy` sıralamasıyla Anki benzeri kısa tekrar davranışı sağlıyor. Uzun dönem kayıt tutma bu ilk sürümde eklenmedi.

Uygulama metinleri de bu özelliğe göre güncellendi. Parça sayfasındaki bölüm başlığı İngilizcede `Downloads and Studies`, Türkçede `İndirmeler ve Çalışmalar` oldu. Çalışma düğmesi İngilizcede `Study Flashcards`, Türkçede `Bilgi Kartlarını Çalış` olarak değiştirildi; Türkçe çalışma ekranındaki aksanlı metinler düzeltildi. Çalışma özelliğinin TDD planı `flashcard-study-tdd-plan.md` dosyasına kaydedildi ve tamamlanan dilimler işaretlendi.

Doğrulama:

- `npm run study:import:bulk`: 1605 planlanan destenin tamamı yazıldı; boş veya atlanan deste olmadı.
- `npm run manifest:generate`: çalışma desteleri manifestte 1605 adet olarak üretildi.
- `npm run assets:sync`: yeni soru bankası JSON varlıkları `public/assets/` altına eşitlendi.
- `npm test`: 6 test takımı ve 24 test başarıyla geçti.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build`: 3864 statik sayfa başarıyla üretildi.

## 2026-06-09

### TEMA-VE-METIN-TIPOGRAFISI -- Tema önizlemesi sadeleştirildi ve parça metni tipografisi ayrıştırıldı

- Parça okuma sayfasında kaynak metin Latin/Türkçe ve Arapça yazı aralıklarına göre ayrıştırılarak ayrı yazı tipi sınıflarıyla işlendi.
- Türkçe ve İngilizce metinler Souvenir öncelikli yazı tipi ailesiyle, Arapça pasajlar Uthman Taha öncelikli yazı tipi ailesiyle gösterilecek hale getirildi; uygun sistem fallback fontları korundu.
- Tema sayfasındaki ayrı `Secondary action` / `Button theme` denemesi kaldırıldı; bağımsız düğme teması seçimi gerçek bir özellik olmadığı için sayfada yalnızca ana tema seçimi bırakıldı.
- Tema açıklaması Türkçede `Bir tema seçin.`, İngilizcede `Select a theme.` olarak sadeleştirildi.
- Tema kartlarının kendi tema değişkenlerinden gelen metin renklerini kullanması sağlandı; böylece Ink ve açık temalar arasında geçiş yapıldığında diğer tema kartlarının metinleri görünmez olmadı.
- `.button-secondary` genel uygulama düğmeleri için tekrar muted surface davranışına döndürüldü.
- Değişiklikler Netlify üretim ortamına dağıtıldı.

Doğrulama:

- `npm run check` başarıyla tamamlandı.
- `npm run build` başarıyla tamamlandı; 654 statik sayfa üretildi ve 4815/4815 PDF doğrulaması geçti.
- `netlify deploy --dir=dist --prod` başarıyla tamamlandı.
- Üretim adresi: `https://super-duckanoo-207a41.netlify.app`
- Dağıtım adresi: `https://6a28412ae6c7ad81826c6b0d--super-duckanoo-207a41.netlify.app`
- `/`, `/themes/`, `/books/ayetul-kubra/parts/p03/` ve örnek mobil PDF bağlantısı HTTP 200 ile kontrol edildi.

## 2026-06-08

### GELISTIRME-HATTI-VE-ARAYUZ-DUZELTMELERI -- Geliştirme hattı hızlandırıldı ve arayüz davranışları iyileştirildi

Bu committe yerel geliştirme hattı, küçük arayüz değişikliklerinde binlerce belge dosyasını yeniden kopyalamayacak şekilde düzenlendi. `predev` betiği kaldırıldı; `npm run dev` Astro geliştirme sunucusunu doğrudan başlatacak hale getirildi. Varlık ve manifest yenileme işlemi `npm run refresh` komutuna ayrıldı. `scripts/sync-assets.mjs` tam silme ve yeniden kopyalama yerine değişen dosyaları kopyalayan, değişmeyenleri atlayan ve artık kaynakta bulunmayan hedef dosyaları temizleyen artımlı eşitleme mantığına geçirildi. `scripts/generate-manifest.mjs`, katalog içeriği değişmediğinde `generatedAt` alanını koruyacak şekilde güncellendi; böylece yalnızca zaman damgası yüzünden `src/data/library.generated.ts` kirlenmedi. `.netlify/` yerel yayın durumu klasörü commit kapsamı dışında bırakıldı.

Arayüzde uygulama adı `Rissor Ağ Uygulaması` olarak değiştirildi. Tema seçimi geliştirici amaçlı kullanım için çalışır hale getirildi; seçilen tema tarayıcı depolamasında saklandı, sayfaya uygulandı ve tema kartlarındaki durum bilgisi güncellendi. Kitap sayfasındaki arama ve sınıf filtresi listeyi gerçekten filtreleyecek hale getirildi; bulunan sonuç sayısı ve sonuç yok mesajı eklendi. İndirme panellerindeki gereksiz Word/PDF sayı özetleri kaldırıldı. Türkçe ve İngilizce arayüz metinleri bu değişikliklere uygun şekilde güncellendi.

Geliştirme hattı için `development-pipeline-plan.md` dosyası eklendi. Planda hızlı geliştirme başlangıcı, build/deploy doğrulamasının korunması, artımlı varlık eşitlemesi, isteğe bağlı yerel Windows junction kullanımı ve ileride kitap bazlı manifest bölme adımları kaydedildi. İlk üç aşama uygulanmış olarak işaretlendi.

Doğrulama:

- `npm run assets:sync`: kararlı durumda 0 dosya kopyalandı, 9959 dosya değişmemiş olarak atlandı.
- `npm run manifest:generate`: manifest 4 kitap, 321 parça, 3210 DOCX, 3210 normal PDF ve 1605 mobil PDF ile üretildi; içerik değişmediğinde `generatedAt` alanı korunacak hale geldi.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.
- `npm run build`: PDF doğrulaması `4815/4815` beklenen PDF dosyasını hazır buldu ve 654 statik sayfa başarıyla üretildi.
- `npm run dev -- --port 4329`: varlık eşitlemesi çalışmadan Astro geliştirme sunucusu yaklaşık 21 saniyede hazır hale geldi.

## 2026-06-07

### PARCA-ETIKETLERI-VE-ARAYUZ-METNI -- Parça başlıkları ve indirme metinleri iyileştirildi

Bu committe kitap ve parça başlıkları slug tabanlı dosya adlarından türetilmek yerine yerel metadata ve etiket dosyalarından okunacak şekilde düzenlendi. `assets/<kitap>/book.json` dosyaları eklendi; Ayetül Kübra, Küçük Sözler, Meyve Risalesi ve Tabiat Risalesi kitap adları manifestte doğru Türkçe karakterlerle kaydedildi. `assets/<kitap>/part-labels.json` dosyaları eklendi ve Âyetü'l-Kübra, Küçük Sözler, Meyve Risalesi ile Tabiat Risalesi için daha düzgün Türkçe parça etiketleri kaydedildi. `scripts/generate-manifest.mjs` bu metadata ve etiketleri okuyup manifestteki kitap ve parça başlıklarına uygulayacak şekilde güncellendi; veri bulunmadığında eski slug tabanlı başlık üretimi yedek davranış olarak korundu. `src/data/library.generated.ts` yeni başlıklarla yeniden üretildi.

Arayüz metinleri de sadeleştirildi. PDF bağlantılarının üretim durumunu ve statik indirme mantığını açıklayan gereksiz metinler kaldırıldı. Görünen DOCX ifadeleri Word olarak değiştirildi. Türkçe sayaçlarda sayıdan sonra tekil adlar kullanıldı. Parça satırlarında Word çeşidi sayısını belirten metin kaldırıldı. Kitap özetlerinde ve parça sayfasındaki indirme türü etiketlerinde BK/SK kısaltmaları yerine Türkçede Bilgi Kartı/Soru Kağıdı, İngilizcede Flashcard ve Question Sheet ifadeleri kullanıldı.

Doğrulama:

- `node scripts\generate-manifest.mjs`: manifest 4 kitap, 321 parça, 3210 DOCX, 3210 normal PDF ve 1605 mobil PDF ile yeniden üretildi.
- `npm run check`: Astro tip denetimi 0 hata, 0 uyarı ve 0 ipucu ile geçti.

## 2026-06-04

### COK-DILLI-ARAYUZ-VE-MOBIL-PDF -- Türkçe varsayılan dil yapıldı ve mobil PDF kaynağı yenilendi

Bu committe uygulamanın arayüz metinleri Türkçe varsayılan olacak şekilde yeniden düzenlendi. İngilizce seçeneği `/en/...` yolları altında korunarak aynı kitap, tema ve parça sayfaları için paylaşılabilir statik sayfalar üretildi. `src/i18n/` altında tipli sözlükler, yerelleştirilmiş sınıf etiketleri ve yol yardımcıları eklendi. Sayfa gövdeleri `src/features/` altındaki locale-aware bileşenlere taşındı; Türkçe ve İngilizce route dosyaları bu ortak bileşenleri kullanacak şekilde inceltildi.

Gezinme yapısı `src/config/navigation.ts` üzerinden merkezi hale getirildi. Tema adı ve açıklamaları gibi görünen metinler tema yapılandırmasından ayrılıp i18n sözlüklerine taşındı. `BaseLayout` dil bilgisini, dil seçicisini, yerelleştirilmiş üst menüyü ve alt bilgi metnini destekleyecek şekilde güncellendi.

Mobil PDF üretim hattı da yenilendi. `scripts/generate-pdfs.mjs` artık mobil PDF için normal DOCX dosyalarını UNO ile yeniden sayfa boyutlandırmak yerine `C:\<kitap>\<sınıf>\mobile\docx` altındaki mobil amaçlı DOCX dosyalarını doğrudan LibreOffice ile PDF'e çevirdi. `scripts/generate-manifest.mjs` mobil indirme bağlantılarını bu yeni `BK6_...pdf` dosyalarına yönlendirecek şekilde güncellendi; eski `BK_...` ve `SK_...` mobil PDF dosyaları indirme bağlantısı olarak kullanılmadı. `scripts/validate-pdfs.mjs` normal PDF'leri normal DOCX kaynaklarından, mobil PDF'leri ise mobil DOCX kaynaklarından bekleyecek şekilde değiştirildi.

Yerelde 1605 adet `BK6_...pdf` mobil PDF dosyası üretildi ve `public/assets/` eşitlendi. Mobil kaynaklarda `SK6_...docx` dosyaları bulunmadığı için SK satırlarında mobil PDF düğmeleri pasif kaldı; bu durum eski SK mobil PDF dosyalarına bağlantı verilmesini engelledi.

Doğrulama:

- `node scripts\generate-pdfs.mjs --mode mobile --book meyve-risalesi --grade 11-sinif --limit 1 --force`: örnek mobil DOCX doğrudan `BK6_...pdf` dosyasına başarıyla çevrildi.
- `node scripts\generate-pdfs.mjs --mode mobile`: 1605 mobil PDF dosyası yerelde üretildi.
- `node scripts\validate-pdfs.mjs --strict`: `4815/4815` beklenen PDF dosyası hazır bulundu; 3210 normal ve 1605 mobil PDF doğrulandı.
- `node scripts\generate-manifest.mjs`: manifest 4 kitap, 321 parça, 3210 DOCX, 3210 normal PDF ve 1605 mobil PDF ile yeniden üretildi.
- `node scripts\sync-assets.mjs`: üretilen varlıklar `public/assets/` altına eşitlendi.
- `npm run check`: Astro tip denetimi 0 hata ve 0 uyarı ile geçti.
- `npm run build`: PDF doğrulaması ve manifest üretimiyle birlikte 654 statik sayfa başarıyla üretildi.
- Örnek `meyve-risalesi` parça sayfasında mobil PDF bağlantısının `BK6_...pdf` dosyasına gittiği, eski `SK_...` mobil bağlantısının kullanılmadığı doğrulandı.

### ILK-KURULUM -- Astro tabanlı kitap ve belge indirme uygulaması kuruldu

Bu committe Astro tabanlı statik web uygulaması kuruldu. Kitap listesi, kitap detay sayfaları, parça okuma sayfaları, sınıf düzeyi indirme panelleri ve tema önizleme sayfası eklendi. Uygulama `assets/` altındaki hafif metin parçalarını kaynak veri olarak kullandı; DOCX, normal PDF ve mobil PDF bağlantıları üretilen manifest üzerinden gösterildi.

Dosya sistemi taramasıyla `src/data/library.generated.ts` üretildi. `scripts/generate-manifest.mjs`, `scripts/sync-assets.mjs`, `scripts/validate-pdfs.mjs` ve `scripts/generate-pdfs.mjs` ile varlık eşleme, manifest üretimi, PDF doğrulama ve LibreOffice tabanlı PDF üretimi hazırlandı. Mobil PDF üretimi için LibreOffice UNO kullanan `scripts/libreoffice-mobile-export.py` eklendi.

`.gitignore` proje kapsamına uygun hale getirildi. Bağımlılık klasörleri, Astro/Vite çıktıları, `public/assets/`, günlük dosyaları, geçici betik çıktıları, yerel ortam dosyaları, editör/işletim sistemi artıkları, Office dosyaları ve büyük belge çıktıları commit kapsamı dışında bırakıldı. Bu nedenle DOCX ve PDF dosyaları yerelde üretilip doğrulanmış olsa da stage alanına alınmadı; yalnızca kaynak kod, yapılandırma, belge, görev notu ve parça metinleri stage edildi.

Doğrulama:

- `npm run check`: Astro tip denetimi 0 hata ve 0 uyarı ile geçti.
- `npm run pdf:validate:strict`: `6420/6420` beklenen PDF dosyası yerelde hazır bulundu.
- `npm run build`: 327 statik sayfa başarıyla üretildi.
- `Invoke-WebRequest http://127.0.0.1:4321/`: geliştirme sunucusu ana sayfası `200 OK` döndürdü.
- `node -e "fetch(...)"`: örnek parça sayfasında Türkçe UTF-8 içerik, normal PDF bağlantısı ve mobil PDF bağlantısı doğrulandı; mojibake görülmedi.
- Örnek normal PDF ve mobil PDF doğrudan indirme adresleri `200` döndürdü.

## Biçim Açıklaması ve Uyarılar

- Yeni kayıtlar her zaman bu dosyanın en üstündeki ilk tarihli kayıt olarak eklenir.
- Commit mesajı biçimi `KISA-ETIKET -- Düzenli commit mesajı` şeklindedir.
- Commit mesajı Türkçe yazılır; İngilizce ve Türkçe kelimeler gereksiz şekilde karıştırılmaz.
- Teknik terimler gerektiğinde özgün adıyla kullanılır, ancak açıklama dili düzgün ve anlaşılır Türkçe olmalıdır.
- Doğrulama kısmına çalıştırılan komutlar ve sonuçları yazılır; çalıştırılamayan kontroller ayrıca belirtilir.
- Geçici çıktı klasörleri, Office dosyaları, işlem geçmişi, API anahtarları ve büyük belge çıktıları commit kapsamına alınmaz.
