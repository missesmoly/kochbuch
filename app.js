let config = {};
let recipes = [];
let selectedTags = new Set();
let weeklyPlan = [];
let currentRecipe = null;
let currentRecipeServings = 1;
let completedShoppingItems = new Set();
let manualShoppingItems = [];


const MANUAL_SHOPPING_KEY = "kochbuch-manual-shopping-list";

const WEEKLY_STORAGE_KEY = "kochbuch-weekly-plan";

function getRecipeImage(recipe) {
  return `rezepte/${recipe.id}/${recipe.image || "bild.jpg"}`;
}

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    await loadConfig();
    await loadRecipes();
    loadWeeklyPlan();
    
try {
  manualShoppingItems = JSON.parse(
    localStorage.getItem(MANUAL_SHOPPING_KEY)
  ) || [];
} catch {
  manualShoppingItems = [];
}
    
    setupNavigation();
    setupSearchAndFilters();
    setupModal();
    setupActions();
    renderAll();
  } catch (error) {
    console.error(error);
    showError("Die Rezepte konnten nicht geladen werden. Bitte prüfe die Dateien im Repository.");
  }
}

async function loadConfig() {
  const response = await fetch("app.json", { cache: "no-store" });
  if (!response.ok) throw new Error("app.json konnte nicht geladen werden.");
  config = await response.json();
}

async function loadRecipes() {
  const response = await fetch("rezepte/index.json", { cache: "no-store" });
  if (!response.ok) throw new Error("rezepte/index.json konnte nicht geladen werden.");

  const catalog = await response.json();
  const entries = Array.isArray(catalog) ? catalog : (catalog.recipes || []);

  recipes = await Promise.all(entries.map(async entry => {
    const path = String(entry.path || "");
    const recipeResponse = await fetch(`rezepte/${path.replace(/^rezepte\//, "")}`, { cache: "no-store" });
    if (!recipeResponse.ok) throw new Error(`Rezept konnte nicht geladen werden: ${path}`);
    return await recipeResponse.json();
  }));

  document.getElementById("loading").hidden = true;
}

function loadWeeklyPlan() {
  try {
    weeklyPlan = JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY)) || [];
  } catch {
    weeklyPlan = [];
  }
}

function saveWeeklyPlan() {
  localStorage.setItem(WEEKLY_STORAGE_KEY, JSON.stringify(weeklyPlan));
}

function setupNavigation() {
  document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", () => showSection(button.dataset.section));
  });

  document.getElementById("logo").addEventListener("click", event => {
    event.preventDefault();
    showSection("recipes");
  });
}

function showSection(sectionName) {
  document.querySelectorAll(".view").forEach(section => {
    section.classList.toggle("active", section.id === sectionName);
  });

  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.section === sectionName);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupSearchAndFilters() {
  document.getElementById("search-input").addEventListener("input", renderRecipes);
  document.getElementById("reset-filters").addEventListener("click", () => {
    selectedTags.clear();
    document.getElementById("search-input").value = "";
    renderTagFilters();
    renderRecipes();
  });
}

function renderTagFilters() {
  const container = document.getElementById("tag-filters");
  const tags = config.tags || [];

  container.innerHTML = tags.map(tag => `
    <button class="tag-button ${selectedTags.has(tag) ? "active" : ""}" data-tag="${escapeHtml(tag)}">
      ${escapeHtml(tag)}
    </button>
  `).join("");

  container.querySelectorAll(".tag-button").forEach(button => {
    button.addEventListener("click", () => {
      const tag = button.dataset.tag;
      if (selectedTags.has(tag)) selectedTags.delete(tag);
      else selectedTags.add(tag);
      renderTagFilters();
      renderRecipes();
    });
  });
}

function getFilteredRecipes() {
  const query = document.getElementById("search-input").value.trim().toLowerCase();

  return recipes.filter(recipe => {
    const tags = recipe.tags || [];
    const ingredients = recipe.ingredients || [];

    const matchesTags = [...selectedTags].every(tag => tags.includes(tag));
    if (!matchesTags) return false;

    if (!query) return true;

    const haystack = [
      recipe.title,
      recipe.description,
      ...tags,
      ...ingredients.map(ingredient => ingredient.name)
    ].filter(Boolean).join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

function renderRecipes() {
  const grid = document.getElementById("recipe-grid");
  const filtered = getFilteredRecipes();

  if (!filtered.length) {
    grid.innerHTML = `<p class="empty-message">Keine passenden Rezepte gefunden.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(recipe => `
    <article class="recipe-card" data-id="${escapeHtml(recipe.id)}">

<button class="add-recipe-button"
  data-add="${escapeHtml(recipe.id)}"
  aria-label="${weeklyPlan.some(item => item.recipeId === recipe.id) ? "Bereits im Wochenplan" : "Zum Wochenplan hinzufügen"}"
  ${weeklyPlan.some(item => item.recipeId === recipe.id) ? "disabled" : ""}>
  ${weeklyPlan.some(item => item.recipeId === recipe.id) ? "✓" : "+"}
</button>
      
      <div class="recipe-card-image" data-open="${escapeHtml(recipe.id)}">
        <img src="${escapeHtml(getRecipeImage(recipe))}" alt="${escapeHtml(recipe.title || "")}">
      </div>
      <div class="recipe-card-content" data-open="${escapeHtml(recipe.id)}">
        <h2>${escapeHtml(recipe.title || "")}</h2>
        <p>${escapeHtml(recipe.description || "")}</p>
        <div class="recipe-tags">
          ${(recipe.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll("[data-open]").forEach(element => {
    element.addEventListener("click", () => openRecipeModal(element.dataset.open));
  });

  grid.querySelectorAll("[data-add]").forEach(button => {
  button.addEventListener("click", event => {
    event.stopPropagation();

    if (button.disabled) return;

    addToWeeklyPlan(button.dataset.add);
    renderRecipes();
    updatePlanCount();
  });
  });
}

function openRecipeModal(recipeId) {
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe) return;

  currentRecipe = recipe;

const plannedRecipe = weeklyPlan.find(item => item.recipeId === recipe.id);

currentRecipeServings = plannedRecipe
  ? plannedRecipe.servings
  : (recipe.servings || 1);
  
  renderRecipeModal();

  const modal = document.getElementById("recipe-modal");
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function renderRecipeModal() {
  if (!currentRecipe) return;

  const recipe = currentRecipe;
  const scale = currentRecipeServings / (recipe.servings || 1);

  document.getElementById("modal-content").innerHTML = `
    <img class="modal-image" src="${escapeHtml(getRecipeImage(recipe))}" alt="${escapeHtml(recipe.title || "")}">
    <div class="modal-body">
      <div class="recipe-tags">
        ${(recipe.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      <h2>${escapeHtml(recipe.title || "")}</h2>
      <p>${escapeHtml(recipe.description || "")}</p>

      <div class="portion-controls">
        <span>Portionen</span>
        <button id="portion-minus" type="button">−</button>
        <strong>${currentRecipeServings}</strong>
        <button id="portion-plus" type="button">+</button>
      </div>

      <h3>Zutaten</h3>
      <ul class="ingredients-list">
        ${(recipe.ingredients || []).map(ingredient => `
          <li>
            <span>${formatAmount((ingredient.amount || 0) * scale)} ${escapeHtml(ingredient.unit || "")}</span>
            <span>${escapeHtml(ingredient.name || "")}</span>
          </li>
        `).join("")}
      </ul>

      <h3>Zubereitung</h3>
      <ol class="steps-list">
        ${(recipe.steps || []).map(step => `<li>${escapeHtml(step)}</li>`).join("")}
      </ol>

      <button id="modal-add-plan" class="primary-button" type="button"
  ${weeklyPlan.some(item => item.recipeId === recipe.id) ? "disabled" : ""}>
  ${weeklyPlan.some(item => item.recipeId === recipe.id)
    ? "✓ Bereits im Wochenplan"
    : "Zum Wochenplan hinzufügen"}
</button>

    </div>
  `;

  document.getElementById("portion-minus").addEventListener("click", () => {
  if (currentRecipeServings > 1) {
    currentRecipeServings--;
    syncRecipeWithPlan();
    renderRecipeModal();
  }
});

  document.getElementById("portion-plus").addEventListener("click", () => {
  currentRecipeServings++;
  syncRecipeWithPlan();
  renderRecipeModal();
});

  document.getElementById("modal-add-plan").addEventListener("click", () => {
  if (weeklyPlan.some(item => item.recipeId === recipe.id)) return;

  addToWeeklyPlan(recipe.id, currentRecipeServings);
    renderRecipes();
  renderRecipeModal();
});  
}

function syncRecipeWithPlan() {
  if (!currentRecipe) return;

  const plannedRecipe = weeklyPlan.find(
    item => item.recipeId === currentRecipe.id
  );

  if (!plannedRecipe) return;

  plannedRecipe.servings = currentRecipeServings;

  saveWeeklyPlan();
  renderWeeklyPlan();
  renderShoppingList();
}

function setupModal() {
  document.getElementById("modal-close").addEventListener("click", closeRecipeModal);
  document.querySelector("[data-close-modal]").addEventListener("click", closeRecipeModal);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeRecipeModal();
  });
}

function closeRecipeModal() {
  const modal = document.getElementById("recipe-modal");
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function addToWeeklyPlan(recipeId, servings) {
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe) return;

  const amount = servings || recipe.servings || 1;
  const existing = weeklyPlan.find(item => item.recipeId === recipeId);

  if (existing) existing.servings += amount;
  else weeklyPlan.push({ recipeId, servings: amount });

  saveWeeklyPlan();
  renderWeeklyPlan();
  renderShoppingList();
  updatePlanCount();
}

function renderWeeklyPlan() {
  const container = document.getElementById("weekly-plan-list");

  if (!weeklyPlan.length) {
    container.innerHTML = `<p class="empty-message">Der Wochenplan ist noch leer.</p>`;
    return;
  }

  container.innerHTML = weeklyPlan.map(item => {
    const recipe = recipes.find(r => r.id === item.recipeId);
    if (!recipe) return "";

    return `
      <div class="weekly-plan-item">
        <div>
          <h3 class="weekly-plan-recipe-title"
    data-open="${escapeHtml(recipe.id)}">
  ${escapeHtml(recipe.title)}
</h3>
          <span>${item.servings} Portion${item.servings === 1 ? "" : "en"}</span>
        </div>
        <div class="plan-controls">
          <button data-plan-minus="${escapeHtml(item.recipeId)}">−</button>
          <button data-plan-plus="${escapeHtml(item.recipeId)}">+</button>
          <button data-plan-remove="${escapeHtml(item.recipeId)}">×</button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-plan-minus]").forEach(button => {
    button.addEventListener("click", () => changePlanAmount(button.dataset.planMinus, -1));
  });
  container.querySelectorAll("[data-plan-plus]").forEach(button => {
    button.addEventListener("click", () => changePlanAmount(button.dataset.planPlus, 1));
  });
  container.querySelectorAll("[data-plan-remove]").forEach(button => {
    button.addEventListener("click", () => removeFromPlan(button.dataset.planRemove));
  });

container.querySelectorAll("[data-open]").forEach(element => {
  element.addEventListener("click", () => {
    openRecipeModal(element.dataset.open);
  });
});
  
}

function changePlanAmount(recipeId, delta) {
  const item = weeklyPlan.find(entry => entry.recipeId === recipeId);
  if (!item) return;

  item.servings += delta;
  if (item.servings <= 0) {
    weeklyPlan = weeklyPlan.filter(entry => entry.recipeId !== recipeId);
  }

  saveWeeklyPlan();
  renderWeeklyPlan();
  renderShoppingList();
  updatePlanCount();
  renderRecipes();
}

function removeFromPlan(recipeId) {
  weeklyPlan = weeklyPlan.filter(item => item.recipeId !== recipeId);
  saveWeeklyPlan();
  renderWeeklyPlan();
  renderShoppingList();
  updatePlanCount();
  renderRecipes();
}


function renderShoppingList() {
  const container = document.getElementById("shopping-list");

  const summableUnits = config.summableUnits || [];
  const grouped = {};
  const individual = [];

  weeklyPlan.forEach(item => {
    const recipe = recipes.find(r => r.id === item.recipeId);
    if (!recipe) return;

    const baseServings = recipe.servings || 1;
    const scale = item.servings / baseServings;

    (recipe.ingredients || []).forEach((ingredient, index) => {
      const amount = (ingredient.amount || 0) * scale;
      const unit = ingredient.unit || "";
      const category = ingredient.category || "Sonstiges";
      const key = `${category}|${ingredient.name}|${unit}`;

      if (summableUnits.includes(unit)) {
        if (!grouped[key]) {
          grouped[key] = {
            id: `grouped:${key}`,
            category,
            name: ingredient.name,
            unit,
            amount: 0
          };
        }
        grouped[key].amount += amount;
      } else {
        individual.push({
          id: `single:${recipe.id}:${index}`,
          category,
          name: ingredient.name,
          unit,
          amount
        });
      }
    });
  });

  
const entries = [
  ...Object.values(grouped),
  ...individual,
  ...manualShoppingItems
];
  

  const openEntries = entries.filter(
    entry => !completedShoppingItems.has(entry.id)
  );

  const doneEntries = entries.filter(
    entry => completedShoppingItems.has(entry.id)
  );

  const categories = {};
  openEntries.forEach(entry => {
    if (!categories[entry.category]) {
      categories[entry.category] = [];
    }
    categories[entry.category].push(entry);
  });

  function renderEntry(entry) {
    const checked = completedShoppingItems.has(entry.id);

    return `
      <li>
        <label>
          <input
            type="checkbox"
            data-shopping-id="${escapeHtml(entry.id)}"
            ${checked ? "checked" : ""}
          >
          <span>${formatAmount(entry.amount)} ${escapeHtml(entry.unit)} ${escapeHtml(entry.name)}</span>
        </label>
      </li>
    `;
  }

  const openHtml = Object.keys(categories).sort().map(category => `
    <div class="shopping-category">
      <h3>${escapeHtml(category)}</h3>
      <ul>
        ${categories[category].map(renderEntry).join("")}
      </ul>
    </div>
  `).join("");

  const doneHtml = doneEntries.length ? `
    <div class="shopping-category shopping-completed">
      <h3>Erledigt (${doneEntries.length})</h3>
      <ul>
        ${doneEntries.map(renderEntry).join("")}
      </ul>
    </div>
  ` : "";

  
container.innerHTML = `
  <form id="manual-shopping-form" class="manual-shopping-form">
    <h3>Zutat hinzufügen</h3>
    <input
      id="manual-shopping-name"
      type="text"
      placeholder="Sonstiges ..."
      required
    >
    <button type="submit" class="primary-button">
      Hinzufügen
    </button>
  </form>

  ${openHtml || '<p class="empty-message">Keine offenen Zutaten.</p>'}
  ${doneHtml}
`;

document.getElementById("manual-shopping-form")
  .addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("manual-shopping-name").value.trim();
    const amountInput = document.getElementById("manual-shopping-amount").value;
    const unit = document.getElementById("manual-shopping-unit").value.trim();

    if (!name) return;

    manualShoppingItems.push({
      id: `manual:${Date.now()}`,
      category: "Manuell",
      name,
      amount: null,
      unit: ""
    });

    localStorage.setItem(
      MANUAL_SHOPPING_KEY,
      JSON.stringify(manualShoppingItems)
    );

    renderShoppingList()
      ;
  });

  container.querySelectorAll("[data-shopping-id]").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.dataset.shoppingId;

      if (checkbox.checked) {
        completedShoppingItems.add(id);
      } else {
        completedShoppingItems.delete(id);
      }

      renderShoppingList();
    });
  });
}



function setupActions() {
  document.getElementById("clear-plan").addEventListener("click", () => {
    weeklyPlan = [];
    saveWeeklyPlan();
    renderWeeklyPlan();
    renderShoppingList();
    updatePlanCount();
    renderRecipes();
  });

  document.getElementById("reset-shopping").addEventListener("click", () => {
    document.querySelectorAll("#shopping-list input[type='checkbox']").forEach(box => {
      box.checked = false;
    });
  });
}

function updatePlanCount() {
  const count = weeklyPlan.length;
  document.getElementById("plan-count").textContent = count;
}

function renderAll() {
  renderTagFilters();
  renderRecipes();
  renderWeeklyPlan();
  renderShoppingList();
  updatePlanCount();
}

function formatAmount(value) {
  if (value == null || Number.isNaN(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  return String(rounded).replace(".", ",");
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9äöüß]+/gi, "-");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showError(message) {
  const loading = document.getElementById("loading");
  if (loading) loading.hidden = true;
  const error = document.getElementById("error-message");
  if (error) {
    error.hidden = false;
    error.textContent = message;
  }
}
