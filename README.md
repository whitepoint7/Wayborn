# Wayborn

Mobil yatay ekran icin hazirlanan hafif HTML5 / Phaser prototipi.

## Calistirma

```powershell
npm install
npm run dev
```

Tarayicida verilen local adresi ac. Telefonda denemek icin bilgisayar ve telefon ayni agdaysa Vite'in verdigi `Network` adresini kullan.

## Ilk prototipte olanlar

- Deniz ustunde sal hareketi
- Sol altta dokunmatik joystick
- Klavyede WASD / ok tuslari
- Kontrollu ruzgar sistemi: hafif drift, arkadan ruzgar avantaji ve ters ruzgar direnci
- Hava ve deniz durumu: gunesli/kapali/yagmur/firtina ile duz/dalgali/sert dalga etkileri
- Yagmur su toplayiciyi guclendirir; firtina ve sert dalga agir/hasarli sali zorlayabilir
- Pusula craft edildikten sonra acilan ruzgar oku, yon/guc bilgisi ve seyir durumu
- Sal hizi HUD'da duruyor/cok yavas/yavas/normal/hizli/cok hizli olarak gosterilir
- Suruklenen odun, ip, kumas, hurda ve yemek toplama; salin merkez parcasi dogrudan toplar
- Kapasiteli envanter ve Kucuk Sandik ile ayri sal deposu
- Envanter ekraninda item kullanma, atma, sandiga koyma ve sandiktan alma
- Sal parcasi, toplama agi, olta, zipkin, pusula, su toplayici, ocak, sandik, tamir cekici ve sal tamiri craft etme
- Craft ekraninda eksik malzemenin hangi item oldugunu gosterme
- Craft edilen sal parcasini secilebilir grid noktasina yerlestirme
- Su toplayici, ocak ve sandik icin bos sal modul alani gerekir; craft sonrasi mavi + ile genisletilmis sal parcasinda yer secilir
- Sal ustunde su toplayici, ocak, sandik ve basit direk gorsel olarak gorunur
- Basit Direk ve Durbun ile kesif menzili artar; pusula hedef mesafesi daha net gosterilir
- Fiziksel Baglanti Kirisi: sal uzerindeki kirişli parcanin cevresindeki 8 kare genisleme alani olur; kirisli parcaya ag takilamaz
- Sal Yuk sistemi: parca, ag, modul ve tasinan esya agirligi sal hizini ve ivmeyi etkiler
- Toplama agi modul alani kaplamaz; sari + ile secilen agsiz yan parcanin altina takilir, temas eden esyayi toplar ve kopek baligi saldirisinda hasar alabilir
- Gorsel Sal Duzenle ekrani: Ag / Sal / Modul katmanlariyla tasima ve silme; uygun hedefleri + ile gosterme
- Cek / gevset mantikli 100 birim yakinlik barina sahip balikcilik mini-game'i
- Balik turune gore karsi cekis, misina gerginligi, stamina, deger ve basit placeholder balik gorseli
- Saglam Misina, Guclu Olta ve Balik Yemi ile balikcilik ekipman progression'i
- Balik tier'ina gore ekipmansiz zorlasan ama dogru misina/olta/yem ile daha yonetilebilir mücadele
- Su Toplayici ile otomatik temiz su biriktirme ve susuzluk toparlama
- Basit Ocak ile balik pisirme, acikinca pismis balik/yemek tuketme
- Sabit Capa At / Capa Al baglamsal aksiyonu
- Adaya yaklasinca ayni aksiyonun Adaya Cik'a donusmesi
- Ada kesif panelinden odun, yemek ve ip toplama
- Ada kesif panelinden ada cevresinde sig su dalisi yapma
- Adada dinlenerek can toparlama ve kopek baligi ilgisini dusurme sansi
- Kopek baligi tehdidi
- Kopek baliklari ada carpisma alanindan gecemez, adanin kenarindan dolasir/itilir
- Olay gunlugu ve kopek baligi saldiri/uzaklasma bildirimleri
- Menuden Kaydet/Yukle ile localStorage tabanli prototip kaydi
- HUD'da aktif gorev satiri ve kayda dahil edilen baslangic gorev zinciri
- Gorev odulleri: altin, moral, yem ve kucuk kaynaklar
- Haritada Kucuk Liman noktalarina yaklasip ticaret paneli acma
- Altin para birimi; balik, pismis balik, mercan, hurda, tas ve yemek satma
- Limandan yemek, odun, ip, kumas, hurda ve balik yemi alma
- Liman servisleri: tedavi, sal tamiri ve su/yemek ikmali
- Liman kontratlari: balik, pismis balik, hurda, tas ve mercan icin Gorevi Al / Teslim Et akisiyle daha iyi oduller alma
- Pusula acikken ustte Skyrim benzeri yon seridi ve alinmis kontratin limanini gosteren kirmizi hedef isareti
- Kesif Defteri: gorulen ada, liman, resif ve derin su noktalarini kaydetme, listeden takip hedefi secme
- Basit Zipkin craft'i ve yakin kopek baligini uzaklastiran Saldir aksiyonu
- Tamir Cekici acildiktan sonra oyuncunun solunda beliren hizli Tamir aksiyonu
- Kopek baligi saldirilari sal parcalariyla yon bazli engellenir; merkez aciksa oyuncu hasar alir
- Capa atiliyken konuma gore acilan dalis modu; sig su, resif, acik okyanus ve derin su bolgeleri
- Haritada gorunen resif ve derin su dalis alanlari
- Sig suda dusuk sansli kiyi mercani; maske icin ilk mercan kilitlenmez
- Dalis Maskesi ile daha iyi oksijen/gorus, Basit Dalis Tupu ile derin su erisimi
- Dalis bolgesine gore degisen oksijen maliyeti, kaynak sansi ve bolgeye ozel su alti riskleri
- Dalis aksiyonu ayri yan kaydirmali su alti kesif sahnesine gecer; hareket oksijen harcar, kaynaklara yaklasinca toplar, tehlikeler can/oksijen azaltir
- Su alti sahnesinde deniz tabani, kaya cikintilari, maden/mercan damar noktalari ve basit hazine sandigi placeholder'lari
- Kopek baligi saldirdikca sal govdesi hasar alir; Tamir Cekici ile Sal Tamir tarifi acilir
- Aclik, susuzluk, can ve moral degerleri

## Sonraki mantikli adimlar

- Dalis sahnesine ekipman dayanimi, cikis noktasi ve daha zengin su alti engelleri ekleme
- Ada ici ayri kesif sahnesi
- Sal grid sistemine kirilma, tamir ve ust yapilar ekleme
- Balikcilik mini-game'ine balik turleri, yem ve nadirlik
- Craft tarif agaci ve item detaylari
- Procedural chunk harita
