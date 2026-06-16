import Phaser from 'phaser';

// --- OYUNUN BİYOLOJİK MOTORU VE DURUMU (State) ---
const GameState = {
    survival: {
        hunger: 3,       // Max 3 (-2, -1, 0, 1, 2, 3)
        thirst: 3,       // Max 3
        protein: 4,      // Max 4
        vitamin: 4,      // Max 4
        
        health: 100,     
        maxHealth: 100,  
        actionPoints: 1.0 
    },

    timeMode: 'Normal', // 'Normal' veya 'Uzun'
    isPaused: false,    // Zamanı durdurma bayrağı ⏸️
    intervals: {
        thirst: 25,     
        hunger: 40      
    },

    debuffs: {
        scurvyTier: 0,
        atrophyTier: 0,
        _lastScurvyTier: 0,  // Sayaç tetiklemek için eski durum takibi
        _lastAtrophyTier: 0
    },

    timers: {
        hungerTick: 0,
        thirstTick: 0,
        vitaminZeroDuration: 0,
        proteinZeroDuration: 0,
        scurvyEvolutionTick: 0,
        atrophyEvolutionTick: 0,
        scurvyDuration: 0,   // Debuff'ın kalıcı aktif kalma süresi ⏳
        atrophyDuration: 0,  // Debuff'ın kalıcı aktif kalma süresi ⏳
        regenTick: 0,
        stunCheckTick: 0,
        activeStunDuration: 0
    },

    lastLeaveTimestamp: null, 
    isStunned: false, 
    activeDebuffsList: [], 
    inventory: ['grain_bread', 'dried_fish', 'wild_fruit', 'royal_stew'], 
    raftGrid: [{ x: 0, y: 0, type: 'center' }],
    tileSize: 42
};

const ItemDatabase = {
    'grain_bread': { name: "🍞 Tahıl Ekmeği", hunger: 2, thirst: -1, protein: 0, vitamin: 0 },
    'wild_fruit':  { name: "🍊 Yaban Meyvesi", hunger: 1, thirst: 1, protein: 0, vitamin: 3 },
    'dried_fish':  { name: "🐟 Kurutulmuş Balık", hunger: 2, thirst: -1, protein: 3, vitamin: 0 },
    'royal_stew':  { name: "🍲 Denizci Yahnisi", hunger: 3, thirst: 2, protein: 4, vitamin: 4 }
};

class MainOceanScene extends Phaser.Scene {
    constructor() { super({ key: 'MainOceanScene' }); }
    preload() {
        let img = this.make.graphics({ x: 0, y: 0, add: false });
        img.fillStyle(0xa0522d); img.fillRect(0, 0, GameState.tileSize, GameState.tileSize);
        img.generateTexture('tile_center', GameState.tileSize, GameState.tileSize);
    }

    create() {
        this.physics.world.setBounds(0, 0, 5000, 5000);
        this.cameras.main.setBackgroundColor('#2471a3');

        this.raftContainer = this.add.container(2500, 2500);
        this.physics.add.existing(this.raftContainer);
        this.raftContainer.body.setDamping(true);
        this.raftContainer.body.setDrag(0.15);

        this.renderRaft();

        // UI Katmanını Kur ve Dinleyicileri Bağla
        this.initStaticUIStructure();
        this.setupUIEventListeners();

        // Sekme Değişimi Takibi
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                GameState.lastLeaveTimestamp = Date.now();
            } else {
                if (GameState.lastLeaveTimestamp && !GameState.isPaused) {
                    const elapsedSeconds = (Date.now() - GameState.lastLeaveTimestamp) / 1000;
                    this.simulateOfflineTime(elapsedSeconds);
                    GameState.lastLeaveTimestamp = null;
                }
            }
        });

        this.updateDynamicHUD();
    }

    update(time, delta) {
        if (!this.raftContainer || !this.raftContainer.body) return;
        
        // EĞER OYUN PAUSE EDİLDİYSE: Hiçbir şey işleme, döngüden çık ⏸️
        if (GameState.isPaused) {
            this.raftContainer.body.setVelocity(0, 0);
            this.raftContainer.body.setAngularVelocity(0);
            return;
        }

        if (GameState.isStunned) {
            this.raftContainer.body.setVelocity(0, 0);
            this.raftContainer.body.setAngularVelocity(0);
            this.tickCoreSurvival(delta / 1000);
            return;
        }

        const ap = GameState.survival.actionPoints;
        this.cursors = this.input.keyboard.createCursorKeys();
        if (this.cursors.left.isDown) this.raftContainer.body.setAngularVelocity(-100 * ap);
        else if (this.cursors.right.isDown) this.raftContainer.body.setAngularVelocity(100 * ap);
        else this.raftContainer.body.setAngularVelocity(0);

        if (this.cursors.up.isDown) {
            this.physics.velocityFromAngle(this.raftContainer.angle - 90, 160 * ap, this.raftContainer.body.velocity);
        }

        this.tickCoreSurvival(delta / 1000);
    }

    renderRaft() {
        this.raftContainer.removeAll(true);
        GameState.raftGrid.forEach(tile => {
            this.raftContainer.add(this.add.image(tile.x * GameState.tileSize, tile.y * GameState.tileSize, `tile_${tile.type}`).setOrigin(0.5));
        });
        this.raftContainer.body.setSize(GameState.tileSize, GameState.tileSize);
        this.raftContainer.body.setOffset(-GameState.tileSize / 2, -GameState.tileSize / 2);
    }

    // --- ⏰ SURVIVAL ZAMAN AKIŞ SİMÜLASYONU ---
    tickCoreSurvival(seconds) {
        if (GameState.isStunned) {
            GameState.timers.activeStunDuration -= seconds;
            if (GameState.timers.activeStunDuration <= 0) GameState.isStunned = false;
        }

        // --- KALICI DEBUFF GERİ SAYIM MOTORLARI ⏳ ---
        // Scurvy Süre Kontrolü
        if (GameState.debuffs.scurvyTier > 0) {
            GameState.timers.scurvyDuration -= seconds;
            if (GameState.timers.scurvyDuration <= 0) {
                GameState.debuffs.scurvyTier = 0;
                GameState.debuffs._lastScurvyTier = 0;
                GameState.timers.scurvyDuration = 0;
                console.log("🍊 İskorbüt hastalığı süresi bitti ve düştü!");
            }
        }

        // Atrophy Süre Kontrolü
        if (GameState.debuffs.atrophyTier > 0) {
            GameState.timers.atrophyDuration -= seconds;
            if (GameState.timers.atrophyDuration <= 0) {
                GameState.debuffs.atrophyTier = 0;
                GameState.debuffs._lastAtrophyTier = 0;
                GameState.timers.atrophyDuration = 0;
                console.log("🥩 Kas Erimesi hastalığı süresi bitti ve düştü!");
            }
        }

        // Standart Tisk Birikimleri
        GameState.timers.thirstTick += seconds;
        GameState.timers.hungerTick += seconds;

        if (GameState.timers.thirstTick >= GameState.intervals.thirst) {
            GameState.survival.thirst = Math.max(-2, GameState.survival.thirst - 1);
            GameState.timers.thirstTick = 0;
            this.calculateVitalsAndDebuffs();
        }

        if (GameState.timers.hungerTick >= GameState.intervals.hunger) {
            GameState.survival.hunger = Math.max(-2, GameState.survival.hunger - 1);
            GameState.survival.protein = Math.max(0, GameState.survival.protein - 1);
            GameState.survival.vitamin = Math.max(0, GameState.survival.vitamin - 1);
            GameState.timers.hungerTick = 0;
            this.calculateVitalsAndDebuffs();
        }

        // Doğal Rejenerasyon
        if (GameState.survival.hunger >= 1 && GameState.survival.thirst >= 1) {
            GameState.timers.regenTick += seconds;
            if (GameState.timers.regenTick >= 4) {
                if (GameState.survival.health < GameState.survival.maxHealth) {
                    GameState.survival.health = Math.min(GameState.survival.maxHealth, GameState.survival.health + 2);
                }
                GameState.timers.regenTick = 0;
            }
        } else { GameState.timers.regenTick = 0; }

        const HASTALIK_LIMITI = GameState.timeMode === 'Normal' ? 25 : 300;
        this.handleDiseaseEvolution(seconds, HASTALIK_LIMITI);

        // Atrophy Kan Kaybı ve Şokları
        if (GameState.debuffs.atrophyTier >= 1) {
            if (GameState.survival.health > 1) GameState.survival.health = Math.max(1, GameState.survival.health - (0.6 * seconds));
            if (GameState.debuffs.atrophyTier >= 2 && !GameState.isStunned) {
                GameState.timers.stunCheckTick += seconds;
                if (GameState.timers.stunCheckTick >= 8) {
                    GameState.timers.stunCheckTick = 0;
                    if (Phaser.Math.RND.between(1, 100) <= 25) {
                        GameState.isStunned = true;
                        GameState.timers.activeStunDuration = GameState.debuffs.atrophyTier === 2 ? 2 : 5;
                    }
                }
            }
        }

        this.updateDynamicHUD();
    }

    simulateOfflineTime(totalSeconds) {
        const steps = Math.min(3600, Math.round(totalSeconds));
        for (let i = 0; i < steps; i++) { this.tickCoreSurvival(1); }
    }

    // --- 🧬 HASTALIK DOĞUŞ VE ZAMAN ATAMA ALGORİTMASI ---
    handleDiseaseEvolution(seconds, triggerLimit) {
        // Scurvy Gelişimi
        if (GameState.survival.vitamin === 0) {
            if (GameState.debuffs.scurvyTier === 0) {
                GameState.timers.vitaminZeroDuration += seconds;
                if (GameState.timers.vitaminZeroDuration >= triggerLimit) GameState.debuffs.scurvyTier = 1;
            } else if (GameState.debuffs.scurvyTier < 3) {
                GameState.timers.scurvyEvolutionTick += seconds;
                if (GameState.timers.scurvyEvolutionTick >= 15) {
                    GameState.timers.scurvyEvolutionTick = 0;
                    if (Phaser.Math.RND.between(1, 100) <= 30) GameState.debuffs.scurvyTier++;
                }
            }
        } else { GameState.timers.vitaminZeroDuration = 0; GameState.timers.scurvyEvolutionTick = 0; }

        // Atrophy Gelişimi
        if (GameState.survival.protein === 0) {
            if (GameState.debuffs.atrophyTier === 0) {
                GameState.timers.proteinZeroDuration += seconds;
                if (GameState.timers.proteinZeroDuration >= triggerLimit) GameState.debuffs.atrophyTier = 1;
            } else if (GameState.debuffs.atrophyTier < 3) {
                GameState.timers.atrophyEvolutionTick += seconds;
                if (GameState.timers.atrophyEvolutionTick >= 15) {
                    GameState.timers.atrophyEvolutionTick = 0;
                    if (Phaser.Math.RND.between(1, 100) <= 30) GameState.debuffs.atrophyTier++;
                }
            }
        } else { GameState.timers.proteinZeroDuration = 0; GameState.timers.atrophyEvolutionTick = 0; }

        // --- 🎯 KADEMELER DEĞİŞTİYSE SAYAÇLARI BAĞLAMA VE YENİLEME KANUNU ---
        if (GameState.debuffs.scurvyTier !== GameState.debuffs._lastScurvyTier) {
            const tier = GameState.debuffs.scurvyTier;
            GameState.debuffs._lastScurvyTier = tier;
            if (tier > 0) {
                const baseSeconds = tier === 1 ? 5 : (tier === 2 ? 10 : 15);
                GameState.timers.scurvyDuration = baseSeconds * (GameState.timeMode === 'Normal' ? 1 : 60);
            }
        }

        if (GameState.debuffs.atrophyTier !== GameState.debuffs._lastAtrophyTier) {
            const tier = GameState.debuffs.atrophyTier;
            GameState.debuffs._lastAtrophyTier = tier;
            if (tier > 0) {
                const baseSeconds = tier === 1 ? 5 : (tier === 2 ? 10 : 15);
                GameState.timers.atrophyDuration = baseSeconds * (GameState.timeMode === 'Normal' ? 1 : 60);
            }
        }

        this.calculateVitalsAndDebuffs();
    }

    calculateVitalsAndDebuffs() {
        let apEfficiency = 1.0;
        let targetMaxHp = 100;
        GameState.activeDebuffsList = [];

        if (GameState.survival.hunger === 0) apEfficiency *= 0.80;
        else if (GameState.survival.hunger === -1) { apEfficiency *= 0.45; targetMaxHp = 50; }
        else if (GameState.survival.hunger === -2) { apEfficiency *= 0.15; targetMaxHp = 20; }

        if (GameState.survival.thirst === 0) apEfficiency *= 0.75;
        else if (GameState.survival.thirst === -1) { apEfficiency *= 0.35; targetMaxHp = Math.min(targetMaxHp, 50); }
        else if (GameState.survival.thirst === -2) { apEfficiency *= 0.10; targetMaxHp = Math.min(targetMaxHp, 20); }

        // Geri sayım sürelerini de arayüze ekliyoruz
        const formatTime = (sec) => `${Math.ceil(sec)}sn`;

        if (GameState.debuffs.scurvyTier === 1) { apEfficiency *= 0.85; GameState.activeDebuffsList.push(`İskorbüt K-1 [⏳ ${formatTime(GameState.timers.scurvyDuration)}] (Hız -%15)`); }
        else if (GameState.debuffs.scurvyTier === 2) { apEfficiency *= 0.50; GameState.activeDebuffsList.push(`İskorbüt K-2 [⏳ ${formatTime(GameState.timers.scurvyDuration)}] (Hız -%50 / Vit -1)`); }
        else if (GameState.debuffs.scurvyTier === 3) { apEfficiency *= 0.15; GameState.activeDebuffsList.push(`İskorbüt K-3 [⏳ ${formatTime(GameState.timers.scurvyDuration)}] (Hız -%85 / Vit -1)`); }

        if (GameState.debuffs.atrophyTier === 1) GameState.activeDebuffsList.push(`Kas Erimesi K-1 [⏳ ${formatTime(GameState.timers.atrophyDuration)}] (Kan Kaybı)`);
        else if (GameState.debuffs.atrophyTier === 2) GameState.activeDebuffsList.push(`Kas Erimesi K-2 [⏳ ${formatTime(GameState.timers.atrophyDuration)}] (Kan Kaybı / Şok)`);
        else if (GameState.debuffs.atrophyTier === 3) GameState.activeDebuffsList.push(`Kas Erimesi K-3 [⏳ ${formatTime(GameState.timers.atrophyDuration)}] (Kan Kaybı / Şok / Prot -1)`);

        if (GameState.isStunned) GameState.activeDebuffsList.push("⚡ KİLİTLENDİ (KAS ŞOKU)");

        GameState.survival.actionPoints = Math.max(0.08, apEfficiency);
        GameState.survival.maxHealth = targetMaxHp;
        if (GameState.survival.health > GameState.survival.maxHealth) GameState.survival.health = GameState.survival.maxHealth;
    }

    eatOrDrink(itemKey) {
        const item = ItemDatabase[itemKey];
        if (!item) return;

        if (item.hunger > 0 && GameState.survival.hunger === 3) { alert("Mideniz dolu!"); return; }
        if (item.thirst > 0 && GameState.survival.thirst === 3) { alert("Suya doymuşsunuz!"); return; }

        const index = GameState.inventory.indexOf(itemKey);
        if (index > -1) GameState.inventory.splice(index, 1);

        const startHunger = GameState.survival.hunger < 0 ? 0 : GameState.survival.hunger;
        const startThirst = GameState.survival.thirst < 0 ? 0 : GameState.survival.thirst;

        let finalVitaminGain = item.vitamin;
        let finalProteinGain = item.protein;

        if (GameState.debuffs.scurvyTier >= 2 && finalVitaminGain > 0) finalVitaminGain = Math.max(0, finalVitaminGain - 1);
        if (GameState.debuffs.atrophyTier === 3 && finalProteinGain > 0) finalProteinGain = Math.max(0, finalProteinGain - 1);

        GameState.survival.hunger = Math.min(3, startHunger + item.hunger);
        GameState.survival.thirst = Math.min(3, startThirst + item.thirst);
        GameState.survival.protein = Math.min(4, GameState.survival.protein + finalProteinGain);
        GameState.survival.vitamin = Math.min(4, GameState.survival.vitamin + finalVitaminGain);

        // NOT: İyileşme durumlarında debuff'lar artık ANINDA sıfırlanmıyor, sürelerini tamamlıyorlar! 🎯

        this.calculateVitalsAndDebuffs();
        if (GameState.survival.hunger > 0 && GameState.survival.thirst > 0) GameState.survival.health = GameState.survival.maxHealth;
        this.renderInventoryButtons();
    }

    // --- 🛠️ DİNAMİK TEST VE DEĞİŞİM MODÜLLERİ (+/- SİSTEMİ) ---
    adjustStatValue(stat, amount) {
        if (stat === 'hunger' || stat === 'thirst') {
            GameState.survival[stat] = Phaser.Math.Clamp(GameState.survival[stat] + amount, -2, 3);
        } else {
            GameState.survival[stat] = Phaser.Math.Clamp(GameState.survival[stat] + amount, 0, 4);
        }
        this.calculateVitalsAndDebuffs();
        this.updateDynamicHUD();
    }

    clearAllStatusAndDebuffs() {
        // Tüm hastalıkları, süreleri ve kilitleri tek tıkla arındır 🧼
        GameState.debuffs.scurvyTier = 0;
        GameState.debuffs.atrophyTier = 0;
        GameState.debuffs._lastScurvyTier = 0;
        GameState.debuffs._lastAtrophyTier = 0;
        GameState.timers.scurvyDuration = 0;
        GameState.timers.atrophyDuration = 0;
        GameState.timers.vitaminZeroDuration = 0;
        GameState.timers.proteinZeroDuration = 0;
        GameState.isStunned = false;
        GameState.survival.health = GameState.survival.maxHealth;
        this.calculateVitalsAndDebuffs();
        this.updateDynamicHUD();
        console.log("🧼 Tüm metabolizma ve debuff'lar temizlendi!");
    }

    testSetTimeMode(mode) {
        GameState.timeMode = mode;
        GameState.isPaused = false; // Pause'u kaldır
        if (mode === 'Normal') {
            GameState.intervals.thirst = 25; GameState.intervals.hunger = 40;
        } else {
            GameState.intervals.thirst = 600; GameState.intervals.hunger = 900; 
        }
        GameState.timers.thirstTick = 0; GameState.timers.hungerTick = 0;
        this.refreshTimeButtonsColor();
    }

    toggleTimePause() {
        GameState.isPaused = !GameState.isPaused;
        this.refreshTimeButtonsColor();
        console.log(`⏸️ Zaman Durumu: ${GameState.isPaused ? 'DURDURULDU' : 'DEVAM EDİYOR'}`);
    }

    refreshTimeButtonsColor() {
        document.getElementById('btn-time-normal').style.background = (!GameState.isPaused && GameState.timeMode === 'Normal') ? '#22c55e' : '#475569';
        document.getElementById('btn-time-uzun').style.background = (!GameState.isPaused && GameState.timeMode === 'Uzun') ? '#22c55e' : '#475569';
        document.getElementById('btn-time-pause').style.background = GameState.isPaused ? '#ef4444' : '#475569';
    }

    // --- 🏗️ STATIC STRUCTURE INITIALIZATION ---
    initStaticUIStructure() {
        const uiContainer = document.getElementById('ui-container');
        if (!uiContainer) return;
        uiContainer.style.pointerEvents = 'auto';

        uiContainer.innerHTML = `
            <div style="position: absolute; top: 20px; left: 20px; background: rgba(15,23,42,0.95); color: #f8fafc; padding: 14px; border-radius: 8px; width: 290px; border: 1px solid #334155; z-index:9999;">
                <div style="font-size: 13px; font-weight: bold; border-bottom: 1px solid #334155; padding-bottom: 5px; margin-bottom: 8px; color:#38bdf8; display:flex; justify-content:space-between;">
                    <span id="ui-title-mode">🧑‍ Biyolojik Panel [Mod: Normal]</span>
                    <span id="ui-ap-text">⚡ AP: %100</span>
                </div>
                
                <div style="margin-bottom:6px;"><div style="font-size:11px; color:#94a3b8;"><b>🍖 Açlık (Hunger):</b></div><div id="slot-hunger"></div></div>
                <div style="margin-bottom:6px;"><div style="font-size:11px; color:#94a3b8;"><b>💧 Susuzluk (Thirst):</b></div><div id="slot-thirst"></div></div>
                <div style="margin-bottom:6px; display:flex; justify-content:space-between;">
                    <div><div style="font-size:11px; color:#94a3b8;">🥩 Protein:</div><div id="slot-protein"></div></div>
                    <div><div style="font-size:11px; color:#94a3b8;">🍊 Vitamin:</div><div id="slot-vitamin"></div></div>
                </div>

                <div style="margin-top:10px; border-top:1px solid #334155; padding-top:6px;">
                    <div style="font-size:11px; color:#94a3b8; margin-bottom:3px;" id="ui-hp-text">Health: 100 / 100</div>
                    <div style="width:100%; background:#334155; height:5px; border-radius:3px; overflow:hidden;">
                        <div id="ui-hp-bar-fill" style="width:100%; background:#f43f5e; height:100%;"></div>
                    </div>
                </div>

                <div style="margin-top:8px;">
                    <div style="font-size:11px; color:#94a3b8; margin-bottom:3px;">Kronik Tehditler:</div>
                    <div id="ui-debuffs-zone"></div>
                </div>
            </div>

            <div style="position: absolute; top: 20px; right: 20px; background: rgba(15,23,42,0.95); color: #f8fafc; padding: 12px; border-radius: 8px; width: 240px; border: 1px solid #334155; z-index:9999;">
                <h4 style="margin-top:0; border-bottom: 1px solid #334155; padding-bottom:4px; color: #fbbf24; font-size:13px; margin-bottom:8px;">🛠️ Test Paneli / Ambar</h4>
                
                <div style="margin-bottom:10px; border-bottom:1px dashed #334155; padding-bottom:6px;">
                    <span style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">Erzaklar:</span>
                    <div id="ui-inventory-zone"></div>
                </div>

                <div style="margin-bottom:10px; border-bottom:1px dashed #334155; padding-bottom:8px; font-size:12px;">
                    <span style="font-size:11px; color:#38bdf8; display:block; margin-bottom:6px;">🎛️ İnce Ayar Butonları (+/- 1):</span>
                    
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span>🍖 Açlık (Hunger):</span>
                        <div>
                            <button data-action="adjust" data-stat="hunger" data-val="-1" style="width:22px; font-weight:bold; cursor:pointer;">-</button>
                            <button data-action="adjust" data-stat="hunger" data-val="1" style="width:22px; font-weight:bold; cursor:pointer;">+</button>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span>💧 Susuzluk (Thirst):</span>
                        <div>
                            <button data-action="adjust" data-stat="thirst" data-val="-1" style="width:22px; font-weight:bold; cursor:pointer;">-</button>
                            <button data-action="adjust" data-stat="thirst" data-val="1" style="width:22px; font-weight:bold; cursor:pointer;">+</button>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span>🥩 Protein Slot:</span>
                        <div>
                            <button data-action="adjust" data-stat="protein" data-val="-1" style="width:22px; font-weight:bold; cursor:pointer;">-</button>
                            <button data-action="adjust" data-stat="protein" data-val="1" style="width:22px; font-weight:bold; cursor:pointer;">+</button>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span>🍊 Vitamin Slot:</span>
                        <div>
                            <button data-action="adjust" data-stat="vitamin" data-val="-1" style="width:22px; font-weight:bold; cursor:pointer;">-</button>
                            <button data-action="adjust" data-stat="vitamin" data-val="1" style="width:22px; font-weight:bold; cursor:pointer;">+</button>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom:10px; border-bottom:1px dashed #334155; padding-bottom:8px;">
                    <span style="font-size:11px; color:#a78bfa; display:block; margin-bottom:4px;">⏱️ Zaman Kontrol Sürücüleri:</span>
                    <button id="btn-time-normal" data-action="time" data-mode="Normal" style="width:100%; padding:5px; font-size:11px; margin-bottom:4px; border:none; border-radius:4px; cursor:pointer; font-weight:bold; background:#22c55e; color:white;">⏱️ Normal Zaman (Hızlı)</button>
                    <button id="btn-time-uzun" data-action="time" data-mode="Uzun" style="width:100%; padding:5px; font-size:11px; margin-bottom:4px; border:none; border-radius:4px; cursor:pointer; font-weight:bold; background:#475569; color:white;">⏳ Uzun Zaman (10-15dk)</button>
                    <button id="btn-time-pause" data-action="pause" style="width:100%; padding:5px; font-size:11px; border:none; border-radius:4px; cursor:pointer; font-weight:bold; background:#475569; color:white;">⏸️ Zamanı Durdur (Pause)</button>
                </div>

                <button data-action="clear-all" style="width:100%; padding:6px; background:#9333ea; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:11px;">🧼 Tüm Durumları Arındır / Sil</button>
            </div>
        `;
        this.renderInventoryButtons();
    }

    setupUIEventListeners() {
        const uiContainer = document.getElementById('ui-container');
        if (!uiContainer) return;

        uiContainer.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            const action = button.getAttribute('data-action');
            if (action === 'consume') {
                this.eatOrDrink(button.getAttribute('data-item'));
            } 
            else if (action === 'adjust') {
                const stat = button.getAttribute('data-stat');
                const val = parseInt(button.getAttribute('data-val'));
                this.adjustStatValue(stat, val);
            } 
            else if (action === 'time') {
                this.testSetTimeMode(button.getAttribute('data-mode'));
            } 
            else if (action === 'pause') {
                this.toggleTimePause();
            }
            else if (action === 'clear-all') {
                this.clearAllStatusAndDebuffs();
            }
        });
    }

    renderInventoryButtons() {
        const zone = document.getElementById('ui-inventory-zone');
        if (!zone) return;
        let html = '';
        GameState.inventory.forEach(key => {
            const itm = ItemDatabase[key];
            if(itm) html += `<button data-action="consume" data-item="${key}" style="display:block; width:100%; margin-bottom:4px; padding:5px; text-align:left; background:#1e293b; color:white; border:1px solid #475569; border-radius:4px; font-size:11px; cursor:pointer;">🍽️ ${itm.name}</button>`;
        });
        zone.innerHTML = html.length > 0 ? html : '<small style="color:#64748b;">Çanta Boş</small>';
    }

    updateDynamicHUD() {
        const getSlotsHTML = (current, max, filledColor, emptyColor, isNegative = false) => {
            let html = '<span style="font-family:monospace; font-size:15px; letter-spacing:2px;">';
            if (isNegative && current < 0) {
                for (let i = 0; i < max; i++) html += `<span style="color:#e74c3c;">[💀]</span>`;
                return html + ` <b style="color:#e74c3c;">(${current})</b></span>`;
            }
            for (let i = 1; i <= max; i++) {
                html += i <= current ? `<span style="color:${filledColor}; font-weight:bold;">[■]</span>` : `<span style="color:${emptyColor}; opacity:0.3;">[ ]</span>`;
            }
            return html + '</span>';
        };

        const elHunger = document.getElementById('slot-hunger');
        const elThirst = document.getElementById('slot-thirst');
        const elProtein = document.getElementById('slot-protein');
        const elVitamin = document.getElementById('slot-vitamin');
        const elAp = document.getElementById('ui-ap-text');
        const elHpText = document.getElementById('ui-hp-text');
        const elHpBar = document.getElementById('ui-hp-bar-fill');
        const elDebuffs = document.getElementById('ui-debuffs-zone');
        const elTitle = document.getElementById('ui-title-mode');

        if(elHunger) elHunger.innerHTML = getSlotsHTML(GameState.survival.hunger, 3, '#fbbf24', '#475569', true);
        if(elThirst) elThirst.innerHTML = getSlotsHTML(GameState.survival.thirst, 3, '#38bdf8', '#475569', true);
        if(elProtein) elProtein.innerHTML = getSlotsHTML(GameState.survival.protein, 4, '#f43f5e', '#475569');
        if(elVitamin) elVitamin.innerHTML = getSlotsHTML(GameState.survival.vitamin, 4, '#4ade80', '#475569');
        
        if(elAp) elAp.innerText = `⚡ AP: %${Math.round(GameState.survival.actionPoints * 100)}`;
        if(elTitle) elTitle.innerText = `🧑‍ Biyolojik Panel [Mod: ${GameState.timeMode}${GameState.isPaused ? ' - PAUSED' : ''}]`;
        if(elHpText) elHpText.innerText = `Health: ${Math.round(GameState.survival.health)} / ${GameState.survival.maxHealth}`;
        if(elHpBar) elHpBar.style.width = `${(GameState.survival.health / GameState.survival.maxHealth) * 100}%`;

        if (elDebuffs) {
            let debuffLines = '';
            if (GameState.activeDebuffsList.length > 0) {
                GameState.activeDebuffsList.forEach(d => {
                    debuffLines += `<div style="background:rgba(231,76,60,0.15); color:#f87171; padding:4px 6px; border-left:3px solid #ef4444; margin-bottom:3px; font-size:11px; font-weight:bold;">${d}</div>`;
                });
            } else {
                debuffLines = '<div style="color:#4ade80; font-size:11px;">🟢 Metabolizma Stabil / Hastalık Yok</div>';
            }
            elDebuffs.innerHTML = debuffLines;
        }
    }
}

const config = { type: Phaser.AUTO, width: 1024, height: 768, parent: 'game-container', physics: { default: 'arcade' }, scene: [MainOceanScene] };
const game = new Phaser.Game(config);
export default game;