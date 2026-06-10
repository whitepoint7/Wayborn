export function createEmptyRow(text) {
  const row = document.createElement("div");
  row.className = "inventory-row empty";
  row.textContent = text;
  return row;
}

export function createSmallAction(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "inventory-action";
  button.textContent = label;
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}
