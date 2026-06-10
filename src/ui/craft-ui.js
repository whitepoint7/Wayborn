export class CraftUI {
  constructor(scene) {
    this.scene = scene;
    this.modal = null;
    this.list = null;
  }

  create() {
    const scene = this.scene;
    this.modal = document.createElement("div");
    this.modal.className = "craft-modal immersive-modal";
    const panel = document.createElement("div");
    panel.className = "craft-panel";
    const head = document.createElement("div");
    head.className = "craft-head";
    const title = document.createElement("strong");
    title.textContent = "Uretim";
    const close = scene.createDomButton("craft-close", "X", () => scene.closeCraftModal());
    this.list = document.createElement("div");
    this.list.className = "craft-list";
    head.append(title, close);
    panel.append(head, this.list);
    this.modal.append(panel);
    scene.craftList = this.list;
    return this.modal;
  }

  render() {
    const scene = this.scene;
    if (!this.list) return;
    this.list.innerHTML = "";
    const crafts = scene.craftSystem.getVisibleCrafts(scene.craftFilter)
      .map((craft) => ({
        craft,
        affordable: scene.canAfford(craft.cost),
        blocked: Boolean(scene.getCraftBlockReason(craft) || (craft.requires && !craft.requires(scene)))
      }))
      .sort((a, b) => {
        if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;
        if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
        return a.craft.name.localeCompare(b.craft.name, "tr");
      });
    crafts.forEach(({ craft }) => {
      const recipe = document.createElement("button");
      recipe.type = "button";
      recipe.className = "craft-recipe";
      const requirementMissing = craft.requires && !craft.requires(scene);
      const blockReason = scene.getCraftBlockReason(craft);
      const missingCost = scene.getMissingCostText(craft.cost);
      recipe.disabled = scene.isGameOver || Boolean(blockReason) || requirementMissing || missingCost.length > 0;
      const state = blockReason || (requirementMissing ? "Kosul eksik" : missingCost ? `Eksik: ${missingCost}` : "Uret");
      recipe.innerHTML = `
        <span>
          <span class="recipe-name">${craft.name}</span>
          <span class="recipe-cost">${craft.hint}</span>
        </span>
        <span class="recipe-state">${state}</span>
      `;
      recipe.addEventListener("click", (event) => {
        event.stopPropagation();
        if (recipe.disabled) return;
        scene.tryCraft(craft);
        this.render();
      });
      this.list.append(recipe);
    });
  }
}
