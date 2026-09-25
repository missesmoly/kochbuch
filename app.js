let config = {};
let recipes = [];
let selectedTags = new Set();
let weeklyPlan = [];
let currentRecipe = null;
let currentRecipeServings = 1;

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
      <button class="add-recipe-button" data-add="${escapeHtml(recipe.id)}" aria-label="Zum Wochenplan hinzufügen">+</button>
      <div class="recipe-card-image" data-open="${escapeHtml(recipe.id)}">
        <img src="${escapeHtml(recipe.image || "")}" alt="${escapeHtml(recipe.title || "")}">
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
      addToWeeklyPlan(button.dataset.add);
    });
  });
}

function openRecipeModal(recipeId) {
  const recipe = recipes.find(item => item.id === recipeId);
  if (!recipe) return;

  currentRecipe = recipe;
  currentRecipeServings = recipe.servings || 1;
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
    <img class="modal-image" src="${escapeHtml(recipe.image || "")}" alt="${escapeHtml(recipe.title || "")}">
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

      <button id="modal-add-plan" class="primary-button" type="button">Zum Wochenplan hinzufügen</button>
    </div>
  `;

  document.getElementById("portion-minus").addEventListener("click", () => {
    if (currentRecipeServings > 1) {
      currentRecipeServings--;
      renderRecipeModal();
    }
  });

  document.getElementById("portion-plus").addEventListener("click", () => {
    currentRecipeServings++;
    renderRecipeModal();
  });

  document.getElementById("modal-add-plan").addEventListener("click", () => {
    addToWeeklyPlan(recipe.id, currentRecipeServings);
  });
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
    container.innerHTML = `<p class="empty-message">Dein Wochenplan ist noch leer.</p>`;
    return;
  }

  container.innerHTML = weeklyPlan.map(item => {
    const recipe = recipes.find(r => r.id === item.recipeId);
    if (!recipe) return "";

    return `
      <div class="weekly-plan-item">
        <div>
          <h3>${escapeHtml(recipe.title)}</h3>
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
}

function removeFromPlan(recipeId) {
  weeklyPlan = weeklyPlan.filter(item => item.recipeId !== recipeId);
  saveWeeklyPlan();
  renderWeeklyPlan();
  renderShoppingList();
  updatePlanCount();
}

function renderShoppingList() {
  const container = document.getElementById("shopping-list");

  if (!weeklyPlan.length) {
    container.innerHTML = `<p class="empty-message">Füge zuerst Gerichte zum Wochenplan hinzu.</p>`;
    return;
  }

  const summableUnits = config.summableUnits || [];
  const grouped = {};
  const individual = [];

  weeklyPlan.forEach(item => {
    const recipe = recipes.find(r => r.id === item.recipeId);
    if (!recipe) return;

    const baseServings = recipe.servings || 1;
    const scale = item.servings / baseServings;

    (recipe.ingredients || []).forEach(ingredient => {
      const amount = (ingredient.amount || 0) * scale;
      const unit = ingredient.unit || "";
      const key = `${ingredient.category || "Sonstiges"}|${ingredient.name}|${unit}`;

      if (summableUnits.includes(unit)) {
        if (!grouped[key]) {
          grouped[key] = {
            category: ingredient.category || "Sonstiges",
            name: ingredient.name,
            unit,
            amount: 0
          };
        }
        grouped[key].amount += amount;
      } else {
        individual.push({
          category: ingredient.category || "Sonstiges",
          name: ingredient.name,
          unit,
          amount
        });
      }
    });
  });

  const entries = [
    ...Object.values(grouped),
    ...individual
  ];

  const categories = {};
  entries.forEach(entry => {
    if (!categories[entry.category]) categories[entry.category] = [];
    categories[entry.category].push(entry);
  });

  container.innerHTML = Object.keys(categories).sort().map(category => `
    <div class="shopping-category">
      <h3>${escapeHtml(category)}</h3>
      <ul>
        ${categories[category].map((entry, index) => {
          const id = `shopping-${slugify(category)}-${index}`;
          return `
            <li>
              <label>
                <input type="checkbox" data-shopping-id="${id}">
                <span>${formatAmount(entry.amount)} ${escapeHtml(entry.unit)} ${escapeHtml(entry.name)}</span>
              </label>
            </li>
          `;
        }).join("")}
      </ul>
    </div>
  `).join("");
}

function setupActions() {
  document.getElementById("clear-plan").addEventListener("click", () => {
    weeklyPlan = [];
    saveWeeklyPlan();
    renderWeeklyPlan();
    renderShoppingList();
    updatePlanCount();
  });

  document.getElementById("reset-shopping").addEventListener("click", () => {
    document.querySelectorAll("#shopping-list input[type='checkbox']").forEach(box => {
      box.checked = false;
    });
  });
}

function updatePlanCount() {
  const count = weeklyPlan.reduce((sum, item) => sum + item.servings, 0);
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
