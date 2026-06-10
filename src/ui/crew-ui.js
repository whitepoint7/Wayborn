import { createSmallAction } from "./dom-helpers.js";

export class CrewUI {
  constructor(scene) {
    this.scene = scene;
    this.modal = null;
  }

  create() {
    const scene = this.scene;
    this.modal = document.createElement("div");
    this.modal.className = "craft-modal immersive-modal";
    this.modal.innerHTML = `
      <div class="craft-panel inventory-panel">
        <div class="craft-head">
          <strong>Tayfa</strong>
          <button class="craft-close crew-close" type="button">X</button>
        </div>
        <div class="inventory-summary crew-summary"></div>
        <div class="inventory-list crew-list"></div>
      </div>
    `;
    this.modal.querySelector(".crew-close").addEventListener("click", () => scene.closeCrewModal());
    return this.modal;
  }

  render() {
    if (!this.modal) return;
    const scene = this.scene;
    const supply = scene.getCrewCount() > 0 ? Math.max(1, Math.ceil(scene.getCrewCount() / 2)) : 0;
    const fishers = scene.crewSystem?.countRole("fisher") ?? 0;
    const support = scene.crewSystem?.countRole("survivor") ?? 0;
    this.modal.querySelector(".crew-summary").textContent =
      `Tayfa ${scene.getCrewCount()}/${scene.getCrewCapacity()}   Erzak dongusu: ${supply} yiyecek + su   Balikci ${fishers} / Destek ${support}`;
    const list = this.modal.querySelector(".crew-list");
    list.innerHTML = "";
    if (!scene.crew.length) {
      const empty = document.createElement("div");
      empty.className = "inventory-row empty";
      empty.textContent = "Tayfa yok. Denizdeki kazazedeleri bul ve once yatak kur.";
      list.append(empty);
      return;
    }
    scene.crew.forEach((member) => {
      const row = document.createElement("div");
      row.className = "inventory-row";
      const roleLabel = member.roleLabel ?? this.getRoleLabel(member.role);
      const label = document.createElement("span");
      label.innerHTML = `<strong>${member.name}</strong><small>${roleLabel} / ${this.getRoleBenefit(member.role)}</small>`;
      const actions = document.createElement("div");
      actions.className = "inventory-actions crew-role-actions";
      [
        ["fisher", "Balikci"],
        ["lookout", "Gozcu"],
        ["handyman", "Tamirci"],
        ["survivor", "Destek"]
      ].forEach(([role, text]) => {
        const button = createSmallAction(text, () => scene.assignCrewRole(member.id, role));
        button.disabled = member.role === role;
        actions.append(button);
      });
      row.append(label, actions);
      list.append(row);
    });
  }

  getRoleLabel(role) {
    return { lookout: "Gozcu", fisher: "Balikci", handyman: "Tamirci", survivor: "Kazazede" }[role] ?? "Kazazede";
  }

  getRoleBenefit(role) {
    return {
      lookout: "Kesif menzili",
      fisher: "Erzak dongusunden once balik",
      handyman: "Sal tamiri",
      survivor: "Erzak krizinde moral destegi"
    }[role] ?? "Moral destegi";
  }
}
