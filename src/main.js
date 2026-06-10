import Phaser from 'phaser';

// --- OYUNUN GÜNCEL DURUMU (Mevcut State Yapınla Birebir Uyumlu) ---
const GameState = {
    gold: 0,
    morale: 100,
    health: 100,
    hunger: 0,     // 0: Tok, 1200: Decadent / Açlık Baremi
    thirst: 0,
    inventory: [],
    raftGrid: [],  // Salın parçaları ve modülleri
    wind: { angle: 0, force: 2 }, // Rüzgar yönü ve gücü
    weather: 'sunny', // sunny, cloudy, rainy, storm
    activeMission: 'Baslangic Gorevi'
};

// --- 1. ANA OYUN SAHNESİ (Top-Down: Sal Seyri ve Okyanus) ---
class MainOceanScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainOceanScene' });
    }

    preload() {
        // Placeholder / Geçici Görseller (Gerçek asset'lerin geldikçe buraya ekleyebilirsin)
        // Eğer elinde asset yoksa Phaser'ın geometrik şekillerini kullanacağız
    }

    create() {
        // Phaser Fizik Dünyası Sınırları (Sonsuz okyanus hissi için geniş bir alan)
        this.physics.world.setBounds(0, 0, 5000, 5000);

        // Kamerayı Ayarla
        this.cameras.main.setBounds(0, 0, 5000, 5000);
        this.cameras.main.setBackgroundColor('#2471a3'); // Deniz rengi

        // Salı Fizik Motoruyla Oluştur (Geçici olarak 64x64 beyaz bir kare çiziyoruz)
        // Kendi görselin olunca: this.physics.add.image(x, y, 'sal_gorseli')
        const raftGraphic = this.add.grid(0, 0, 64, 64, 32, 32, 0xffffff, 0.5);
        this.raft = this.physics.add.image(2500, 2500, null);
        this.raft.add(raftGraphic); // Gridi sala bağla
        
        // --- SENİN PROTOKOLÜNDEKİ SAL FİZİKLERİ ---
        this.raft.setDamping(true);
        this.raft.setDrag(0.15);       // Hafif drift/süzülme etkisi
        this.raft.setAngularDrag(100);  // Salın kendi etrafında dönme direnci

        // Kontrolleri Tanımla (WASD ve Yön Tuşları)
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // Kameraların Salı Takip Etmesi
        this.cameras.main.startFollow(this.raft, true, 0.05, 0.05);

        // UI Elementlerini Başlat (Mevcut DOM fonksiyonlarını tetikler)
        this.initExistingDOM_UI();
        
        // Geçici Bildirim Günlüğü Testi
        console.log("Wayborn: Okyanus Sahnesi Yüklendi. Görev:", GameState.activeMission);
    }

    update(time, delta) {
        // --- KONTROLLER & IVMELENME LOGIĞI ---
        let isMoving = false;
        const speedMultiplier = this.getWeightSpeedModifier(); // Ağırlık sistemi etkisi

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            this.raft.setAngularVelocity(-60); // Sola dönme ivmesi
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            this.raft.setAngularVelocity(60); // Sağa dönme ivmesi
        } else {
            this.raft.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            // Salın baktığı yöne doğru ileri ivme uygula
            this.physics.velocityFromAngle(this.raft.angle - 90, 150 * speedMultiplier, this.raft.body.velocity);
            isMoving = true;
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            // Geri gitme / Fren direnci
            this.physics.velocityFromAngle(this.raft.angle - 90, -50 * speedMultiplier, this.raft.body.velocity);
            isMoving = true;
        }

        // --- RÜZGAR VE DRİFT SİMÜLASYONU ---
        this.applyWindEffects();

        // HUD Bilgilerini Güncelle (Sal Hızı Göstergesi)
        this.updateSpeedHUD(this.raft.body.speed);
    }

    // Prototipindeki Sal Yükü / Ağırlık Sisteminin Hıza Etkisi
    getWeightSpeedModifier() {
        // İleride GameState.inventory.length değerine göre hızı düşüreceğiz
        return 1.0; 
    }

    // Kontrollü Rüzgar Sistemi: Hafif drift, arkadan rüzgar avantajı ve ters rüzgar direnci
    applyWindEffects() {
        // Rüzgar açısı ile Salın açısı arasındaki ilişki hesaplanarak
        // drift kuvveti (push) eklenecek
        const windX = Math.cos(GameState.wind.angle) * GameState.wind.force;
        const windY = Math.sin(GameState.wind.angle) * GameState.wind.force;
        
        // Sal sabit dururken rüzgarın onu hafifçe sürüklemesi (Drift)
        this.raft.body.velocity.x += windX * 0.05;
        this.raft.body.velocity.y += windY * 0.05;
    }

    updateSpeedHUD(speed) {
        let speedText = "Duruyor";
        if (speed > 10 && speed <= 40) speedText = "Çok Yavaş";
        else if (speed > 40 && speed <= 80) speedText = "Yavaş";
        else if (speed > 80 && speed <= 130) speedText = "Normal";
        else if (speed > 130) speedText = "Hızlı";

        // Eğer HTML'de sal-hizi elementi varsa yazdırır
        const hudElement = document.getElementById('speed-hud');
        if (hudElement) hudElement.innerText = `Sal Hızı: ${speedText}`;
    }

    initExistingDOM_UI() {
        // Senin XML dosyasında yazdığın tüm o buton oluşturma, 
        // envanter tabloları basma fonksiyonlarını buraya bağlayacağız.
    }
}

// --- 2. SU ALTI DALIŞ SAHNESİ (Side-Scroller: Yan Kaydırmalı) ---
class UnderwaterScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UnderwaterScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#112233'); // Derin su rengi
        this.add.text(400, 100, 'Su Alti Kesif Sahnesi', { fontSize: '24px', fill: '#ffffff' }).setOrigin(0.5);
        
        // Bu sahneye özel aşağı doğru yerçekimi ekliyoruz (Karakter batabilsin diye)
        this.physics.world.gravity.y = 150;

        // Çıkış butonu yerleştirelim (Adaya veya sala dönmek için)
        const backBtn = this.add.text(400, 500, '[ Yukari Cik ]', { fontSize: '20px', fill: '#00ff00' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            this.scene.start('MainOceanScene'); // Ana okyanusa geri dön
        });
    }

    update() {
        // Hareket ettikçe oksijen maliyeti düşürme formülleri buraya gelecek
    }
}

// --- PHASER KONFİGÜRASYONU ---
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth > 1024 ? 1024 : window.innerWidth,
    height: window.innerHeight > 768 ? 768 : window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true // Grid çarpışma sınırlarını görmek için açık bıraktık
        }
    },
    scene: [MainOceanScene, UnderwaterScene] // Sahneleri ekle
};

const game = new Phaser.Game(config);
export default game;