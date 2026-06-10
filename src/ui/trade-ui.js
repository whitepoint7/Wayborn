import { createEmptyRow, createSmallAction } from "./dom-helpers.js";

export class TradeUI {
  constructor(scene, { baitPrice, tradeGoods, itemLabels }) {
    this.scene = scene;
    this.baitPrice = baitPrice;
    this.tradeGoods = tradeGoods;
    this.itemLabels = itemLabels;
    this.modal = null;
  }

  create() {
    this.modal = document.createElement("div");
    this.modal.className = "craft-modal immersive-modal";
    this.modal.innerHTML = `
      <div class="craft-panel inventory-panel">
        <div class="craft-head">
          <strong>Kucuk Liman</strong>
          <button class="craft-close trade-close" type="button">X</button>
        </div>
        <div class="inventory-summary trade-summary"></div>
        <div class="inventory-columns trade-market-section">
          <div><div class="recipe-name">Sat</div><div class="inventory-list trade-sell-list"></div></div>
          <div><div class="recipe-name">Al</div><div class="inventory-list trade-buy-list"></div></div>
        </div>
        <div class="trade-services trade-market-section"><div class="recipe-name">Servisler</div><div class="inventory-list trade-service-list"></div></div>
        <div class="trade-services trade-contract-section"><div class="recipe-name">Kontratlar</div><div class="inventory-list trade-contract-list"></div></div>
      </div>
    `;
    this.modal.querySelector(".trade-close").addEventListener("click", () => this.scene.closeTradeModal({ depart: true }));
    return this.modal;
  }

  render() {
    if (!this.modal) return;
    const scene = this.scene;
    const market = scene.tradeSystem.getMarketProfile();
    const portName = scene.currentPort?.meta?.name ?? "Kucuk Liman";
    const mode = scene.tradeViewMode ?? "all";
    this.modal.classList.toggle("contracts-only", mode === "contracts");
    this.modal.classList.toggle("market-only", mode === "market");
    this.modal.querySelector(".craft-head strong").textContent =
      mode === "contracts" ? `${portName} Belediyesi` : mode === "market" ? `${portName} Carsisi` : portName;
    this.modal.querySelector(".trade-summary").textContent =
      `${scene.tradeSystem.getMarketLabel()}   Altin ${scene.gold}   Yuk ${scene.getInventoryLoad()}/${scene.getCarryCapacity()}`;
    const sellList = this.modal.querySelector(".trade-sell-list");
    const buyList = this.modal.querySelector(".trade-buy-list");
    const serviceList = this.modal.querySelector(".trade-service-list");
    const contractList = this.modal.querySelector(".trade-contract-list");
    [sellList, buyList, serviceList, contractList].forEach((list) => { list.innerHTML = ""; });

    Object.keys(this.tradeGoods.sell).forEach((key) => {
      const amount = scene.inventory[key] ?? 0;
      const price = scene.tradeSystem.getSellPrice(key);
      if (amount > 0) sellList.append(this.createTradeRow(key, amount, `${price} altin`, "Sat", () => scene.sellTradeItem(key)));
    });
    if (!sellList.children.length) sellList.append(createEmptyRow("Satilacak esya yok"));

    scene.tradeSystem.getBuyGoods().forEach(({ key, price }) => {
      const row = this.createTradeRow(key, null, `${price} altin`, "Al", () => scene.buyTradeItem(key));
      row.querySelector("button").disabled = scene.gold < price || !scene.canStore(1);
      buyList.append(row);
    });
    const baitRow = this.createTradeRow("bait", scene.fishingBait, `${this.baitPrice} altin`, "Al", () => scene.buyBait());
    baitRow.querySelector("button").disabled = scene.gold < this.baitPrice;
    buyList.append(baitRow);

    scene.tradeSystem.getServices().forEach((service) => {
      const row = this.createServiceRow(service);
      row.querySelector("button").disabled = service.disabled || scene.gold < service.price;
      serviceList.append(row);
    });

    scene.ensurePortContracts();
    scene.portContracts.forEach((contract, index) => {
      const row = this.createContractRow(contract, index);
      row.querySelector("button").disabled = contract.accepted ? !scene.canCompleteContract(contract) : !scene.currentPort;
      contractList.append(row);
    });
    if (!contractList.children.length) contractList.append(createEmptyRow("Aktif kontrat yok"));
  }

  createContractRow(contract, index) {
    const scene = this.scene;
    const row = document.createElement("div");
    row.className = "inventory-row contract-row";
    const label = document.createElement("span");
    const missing = scene.getMissingCostText(contract.need);
    const atOrigin = scene.isAtContractOrigin(contract);
    const stateText = !contract.accepted ? "Henuz alinmadi" : !atOrigin ? "Teslim icin kontrat limanina don" : missing ? `Eksik: ${missing}` : "Teslime hazir";
    const originText = contract.origin ? `${contract.origin.name} kontrati` : "Liman kontrati";
    label.innerHTML = `<strong>${contract.title}</strong><small>${contract.detail}</small><small>${originText}</small><small>Gerekli: ${scene.getItemBundleText(contract.need)} / Odul: ${scene.getRewardText(contract.reward)}</small><small>${stateText}</small>`;
    const actions = document.createElement("div");
    actions.className = "inventory-actions";
    actions.append(createSmallAction(contract.accepted ? "Teslim" : "Gorevi Al", () => contract.accepted ? scene.completeContract(index) : scene.acceptContract(index)));
    row.append(label, actions);
    return row;
  }

  createServiceRow(service) {
    const row = document.createElement("div");
    row.className = "inventory-row";
    const label = document.createElement("span");
    label.innerHTML = `<strong>${service.name}</strong><small>${service.detail} / ${service.price} altin</small>`;
    const actions = document.createElement("div");
    actions.className = "inventory-actions";
    actions.append(createSmallAction("Kullan", () => service.action()));
    row.append(label, actions);
    return row;
  }

  createTradeRow(key, amount, detail, action, onClick) {
    const row = document.createElement("div");
    row.className = "inventory-row";
    const label = document.createElement("span");
    const name = key === "bait" ? "Balik Yemi" : this.itemLabels[key];
    label.innerHTML = `<strong>${name}</strong><small>${amount === null ? detail : `${amount} adet / ${detail}`}</small>`;
    const actions = document.createElement("div");
    actions.className = "inventory-actions";
    actions.append(createSmallAction(action, onClick));
    row.append(label, actions);
    return row;
  }
}
