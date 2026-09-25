alert("app.js wird ausgeführt);

let config = {};
let recipes = [];
let selectedTags = new Set();
let weeklyPlan = [];
let currentRecipe = null;
let currentRecipeServings = 1;

const WEEKLY_STORAGE_KEY = "kochbuch-weekly-plan";

document.addEventListener("DOMContentLoaded", init);

async function init() {
    try {
        showStatus("Kochbuch wird geladen …", "loading");

        await loadConfig();
        await loadRecipes();
        loadWeeklyPlan();

        setupNavigation();
        setupSearch();
        setupFilters();
        setupModal();
        setupActions();

        renderTags();
        renderRecipes();
        renderWeeklyPlan();
        renderShoppingList();

        hideStatus();
    } catch (error) {
        console.error(error);

        showStatus(
            `
            <strong>Die Rezepte konnten nicht geladen werden.</strong>
            <br><br>
            ${escapeHtml(error.message)}
            <br><br>
            Bitte prüfe, ob die genannten JSON-Dateien in GitHub vorhanden
            und direkt erreichbar sind.
            `,
            "error"
        );
    }
}


/* =========================================================
   LADEN DER DATEN
   ========================================================= */

async function loadConfig() {
    const response = await fetch("app.json", {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `app.json konnte nicht geladen werden (HTTP ${response.status}).`
        );
    }

    try {
        config = await response.json();
    } catch (error) {
        throw new Error("app.json enthält kein gültiges JSON.");
    }
}


async function loadRecipes() {
    if (!config.recipePath) {
        throw new Error(
            "In app.json fehlt der Eintrag „recipePath“."
        );
    }

    const catalogUrl = config.recipePath;

    const response = await fetch(catalogUrl, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `Die Rezeptübersicht konnte nicht geladen werden: ${catalogUrl} (HTTP ${response.status}).`
        );
    }

    let catalog;

    try {
        catalog = await response.json();
    } catch (error) {
        throw new Error(
            `Die Datei ${catalogUrl} enthält kein gültiges JSON.`
        );
    }

    if (!catalog.recipes || !Array.isArray(catalog.recipes)) {
        throw new Error(
            `In ${catalogUrl} wurde kein gültiges „recipes“-Array gefunden.`
        );
    }

    const loadedRecipes = [];

    for (const recipeEntry of catalog.recipes) {
        if (!recipeEntry.path) {
            throw new Error(
                `Beim Rezept „${recipeEntry.title || recipeEntry.id || "unbekannt"}“ fehlt der Pfad zur index.json.`
            );
        }

        /*
         * Die Pfade in rezepte/index.json werden relativ zum
         * Ordner "rezepte" angegeben:
         *
         * "path": "pasta-pesto/index.json"
         *
         * Daraus wird:
         *
         * rezepte/pasta-pesto/index.json
         */
        const recipeUrl = `rezepte/${recipeEntry.path}`;

        const recipeResponse = await fetch(recipeUrl, {
            cache: "no-store"
        });

        if (!recipeResponse.ok) {
            throw new Error(
                `Das Rezept „${recipeEntry.title || recipeEntry.id || "unbekannt"}“ konnte nicht geladen werden: ${recipeUrl} (HTTP ${recipeResponse.status}).`
            );
        }

        let fullRecipe;

        try {
            fullRecipe = await recipeResponse.json();
        } catch (error) {
            throw new Error(
                `Die Rezeptdatei ${recipeUrl} enthält kein gültiges JSON.`
            );
        }

        loadedRecipes.push({
            ...recipeEntry,
            ...fullRecipe
        });
    }

    recipes = loadedRecipes;

    if (recipes.length === 0) {
        throw new Error(
            "Die Rezeptübersicht wurde geladen, enthält aber keine Rezepte."
        );
    }
}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function loadWeeklyPlan() {
    try {
        const saved = localStorage.getItem(WEEKLY_STORAGE_KEY);

        if (!saved) {
            weeklyPlan = [];
            return;
        }

        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
            weeklyPlan = parsed;
        } else {
            weeklyPlan = [];
        }
    } catch (error) {
        console.warn("Wochenplan konnte nicht geladen werden.", error);
        weeklyPlan = [];
    }
}


function saveWeeklyPlan() {
    localStorage.setItem(
        WEEKLY_STORAGE_KEY,
        JSON.stringify(weeklyPlan)
    );
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
    const recipeButton = document.querySelector(
        '[data-target="rezepte"]'
    );

    const planButton = document.querySelector(
        '[data-target="wochenplan"]'
    );

    const shoppingButton = document.querySelector(
        '[data-target="einkaufsliste"]'
    );

    if (recipeButton) {
        recipeButton.addEventListener("click", () => {
            scrollToSection("rezepte");
        });
    }

    if (planButton) {
        planButton.addEventListener("click", () => {
            scrollToSection("wochenplan");
        });
    }

    if (shoppingButton) {
        shoppingButton.addEventListener("click", () => {
            scrollToSection("einkaufsliste");
        });
    }
}


function scrollToSection(id) {
    const section = document.getElementById(id);

    if (section) {
        section.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


/* =========================================================
   SUCHE
   ========================================================= */

function setupSearch() {
    const searchInput = document.getElementById("search");

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener("input", () => {
        renderRecipes();
    });
}


/* =========================================================
   FILTER
   ========================================================= */

function setupFilters() {
    const resetButton = document.getElementById("reset-filters");

    if (!resetButton) {
        return;
    }

    resetButton.addEventListener("click", () => {
        selectedTags.clear();

        const searchInput = document.getElementById("search");

        if (searchInput) {
            searchInput.value = "";
        }

        renderTags();
        renderRecipes();
    });
}


function renderTags() {
    const container = document.getElementById("tag-filters");

    if (!container) {
        return;
    }

    const tags = config.tags || [];

    container.innerHTML = "";

    tags.forEach(tag => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "tag-button";

        if (selectedTags.has(tag)) {
            button.classList.add("active");
        }

        button.textContent = tag;

        button.addEventListener("click", () => {
            if (selectedTags.has(tag)) {
                selectedTags.delete(tag);
            } else {
                selectedTags.add(tag);
            }

            renderTags();
            renderRecipes();
        });

        container.appendChild(button);
    });
}


/* =========================================================
   REZEPTE RENDERN
   ========================================================= */

function renderRecipes() {
    const container = document.getElementById("recipe-grid");

    if (!container) {
        return;
    }

    const searchInput = document.getElementById("search");

    const searchTerm = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const filteredRecipes = recipes.filter(recipe => {
        const recipeTags = Array.isArray(recipe.tags)
            ? recipe.tags
            : [];

        /*
         * Alle ausgewählten Tags müssen vorhanden sein.
         */
        const matchesTags = [...selectedTags].every(tag =>
            recipeTags.includes(tag)
        );

        if (!matchesTags) {
            return false;
        }

        if (!searchTerm) {
            return true;
        }

        const ingredientNames = Array.isArray(recipe.ingredients)
            ? recipe.ingredients.map(ingredient => ingredient.name || "")
            : [];

        const searchableText = [
            recipe.title || "",
            recipe.description || "",
            ...recipeTags,
            ...ingredientNames
        ]
            .join(" ")
            .toLowerCase();

        return searchableText.includes(searchTerm);
    });

    container.innerHTML = "";

    if (filteredRecipes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                Keine passenden Rezepte gefunden.
            </div>
        `;

        return;
    }

    filteredRecipes.forEach(recipe => {
        container.appendChild(createRecipeCard(recipe));
    });
}


function createRecipeCard(recipe) {
    const card = document.createElement("article");

    card.className = "recipe-card";

    const inPlan = weeklyPlan.some(
        item => item.recipeId === recipe.id
    );

    const imagePath = getRecipeImagePath(recipe);

    card.innerHTML = `
        <div class="recipe-image-wrapper">
            <img
                class="recipe-image"
                src="${escapeHtml(imagePath)}"
                alt="${escapeHtml(recipe.title || "Rezept")}"
                loading="lazy"
            >

            <button
                class="add-recipe-button ${inPlan ? "added" : ""}"
                type="button"
                aria-label="${inPlan ? "Bereits im Wochenplan" : "Zum Wochenplan hinzufügen"}"
                title="${inPlan ? "Bereits im Wochenplan" : "Zum Wochenplan hinzufügen"}"
            >
                ${inPlan ? "✓" : "+"}
            </button>
        </div>

        <div class="recipe-card-content">
            <h3>${escapeHtml(recipe.title || "")}</h3>

            ${
                recipe.description
                    ? `<p>${escapeHtml(recipe.description)}</p>`
                    : ""
            }

            ${
                Array.isArray(recipe.tags)
                    ? `
                        <div class="recipe-tags">
                            ${recipe.tags
                                .map(
                                    tag =>
                                        `<span class="recipe-tag">${escapeHtml(tag)}</span>`
                                )
                                .join("")}
                        </div>
                    `
                    : ""
            }
        </div>
    `;

    const image = card.querySelector(".recipe-image");
    const addButton = card.querySelector(".add-recipe-button");

    if (image) {
        image.addEventListener("click", () => {
            openRecipe(recipe.id);
        });
    }

    const title = card.querySelector("h3");

    if (title) {
        title.addEventListener("click", () => {
            openRecipe(recipe.id);
        });
    }

    if (addButton) {
        addButton.addEventListener("click", event => {
            event.stopPropagation();

            addToWeeklyPlan(recipe.id);
        });
    }

    return card;
}


function getRecipeImagePath(recipe) {
    if (!recipe.image) {
        return "";
    }

    /*
     * Wenn im Rezept "bild.jpg" steht, liegt das Bild
     * im jeweiligen Rezeptordner.
     *
     * Der Ordner wird aus recipe.path ermittelt.
     */
    if (recipe.path) {
        const normalizedPath = recipe.path.replace(/\\/g, "/");
        const folder = normalizedPath.substring(
            0,
            normalizedPath.lastIndexOf("/")
        );

        if (folder) {
            return `rezepte/${folder}/${recipe.image}`;
        }
    }

    /*
     * Fallback für Katalogeinträge wie:
     * "image": "pasta-pesto/bild.jpg"
     */
    return `rezepte/${recipe.image}`;
}


/* =========================================================
   REZEPT-MODAL
   ========================================================= */

function setupModal() {
    const modal = document.getElementById("recipe-modal");
    const closeButton = document.getElementById("modal-close");

    if (closeButton) {
        closeButton.addEventListener("click", closeRecipeModal);
    }

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeRecipeModal();
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeRecipeModal();
        }
    });
}


function openRecipe(recipeId) {
    const recipe = recipes.find(
        item => item.id === recipeId
    );

    if (!recipe) {
        return;
    }

    currentRecipe = recipe;
    currentRecipeServings = recipe.servings || 1;

    renderRecipeModal();
}


function renderRecipeModal() {
    const modal = document.getElementById("recipe-modal");

    if (!modal || !currentRecipe) {
        return;
    }

    const recipe = currentRecipe;

    const imagePath = getRecipeImagePath(recipe);

    const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];

    const steps = Array.isArray(recipe.steps)
        ? recipe.steps
        : [];

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");

    const titleElement = modal.querySelector("#modal-title");
    const imageElement = modal.querySelector("#modal-image");
    const descriptionElement = modal.querySelector("#modal-description");
    const servingsElement = modal.querySelector("#modal-servings");
    const ingredientsElement = modal.querySelector("#modal-ingredients");
    const stepsElement = modal.querySelector("#modal-steps");
    const addButton = modal.querySelector("#modal-add-plan");

    if (titleElement) {
        titleElement.textContent = recipe.title || "";
    }

    if (imageElement) {
        imageElement.src = imagePath;
        imageElement.alt = recipe.title || "";
    }

    if (descriptionElement) {
        descriptionElement.textContent =
            recipe.description || "";
    }

    if (servingsElement) {
        servingsElement.textContent = currentRecipeServings;
    }

    if (ingredientsElement) {
        ingredientsElement.innerHTML = ingredients
            .map(ingredient => {
                const amount = calculateIngredientAmount(
                    ingredient
                );

                return `
                    <li>
                        <span>
                            ${escapeHtml(ingredient.name || "")}
                        </span>
                        <strong>
                            ${escapeHtml(formatAmount(amount))}
                            ${escapeHtml(ingredient.unit || "")}
                        </strong>
                    </li>
                `;
            })
            .join("");
    }

    if (stepsElement) {
        stepsElement.innerHTML = steps
            .map(
                (step, index) => `
                    <li>
                        <span class="step-number">${index + 1}</span>
                        <span>${escapeHtml(step)}</span>
                    </li>
                `
            )
            .join("");
    }

    if (addButton) {
        addButton.onclick = () => {
            addToWeeklyPlan(
                recipe.id,
                currentRecipeServings
            );
        };
    }

    setupModalServingControls();
}


function setupModalServingControls() {
    const decreaseButton = document.getElementById(
        "modal-servings-minus"
    );

    const increaseButton = document.getElementById(
        "modal-servings-plus"
    );

    if (decreaseButton) {
        decreaseButton.onclick = () => {
            if (currentRecipeServings > 1) {
                currentRecipeServings--;
                renderRecipeModal();
            }
        };
    }

    if (increaseButton) {
        increaseButton.onclick = () => {
            currentRecipeServings++;
            renderRecipeModal();
        };
    }
}


function closeRecipeModal() {
    const modal = document.getElementById("recipe-modal");

    if (!modal) {
        return;
    }

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");

    currentRecipe = null;
}


function calculateIngredientAmount(ingredient) {
    if (
        !currentRecipe ||
        typeof ingredient.amount !== "number"
    ) {
        return ingredient.amount ?? "";
    }

    const baseServings = currentRecipe.servings || 1;

    return (
        ingredient.amount *
        (currentRecipeServings / baseServings)
    );
}


/* =========================================================
   WOCHENPLAN
   ========================================================= */

function addToWeeklyPlan(recipeId, servings = null) {
    const recipe = recipes.find(
        item => item.id === recipeId
    );

    if (!recipe) {
        return;
    }

    const amountToAdd =
        servings || recipe.servings || 1;

    const existing = weeklyPlan.find(
        item => item.recipeId === recipeId
    );

    if (existing) {
        existing.servings += amountToAdd;
    } else {
        weeklyPlan.push({
            recipeId: recipeId,
            servings: amountToAdd
        });
    }

    saveWeeklyPlan();
    renderRecipes();
    renderWeeklyPlan();
    renderShoppingList();
}


function removeFromWeeklyPlan(recipeId) {
    weeklyPlan = weeklyPlan.filter(
        item => item.recipeId !== recipeId
    );

    saveWeeklyPlan();

    renderRecipes();
    renderWeeklyPlan();
    renderShoppingList();
}


function changePlanServings(recipeId, amount) {
    const item = weeklyPlan.find(
        planItem => planItem.recipeId === recipeId
    );

    if (!item) {
        return;
    }

    item.servings += amount;

    if (item.servings < 1) {
        item.servings = 1;
    }

    saveWeeklyPlan();

    renderWeeklyPlan();
    renderShoppingList();
}


function renderWeeklyPlan() {
    const container = document.getElementById(
        "weekly-plan-list"
    );

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (weeklyPlan.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                Noch keine Gerichte im Wochenplan.
            </div>
        `;

        updatePlanCount();
        return;
    }

    weeklyPlan.forEach(item => {
        const recipe = recipes.find(
            recipeItem => recipeItem.id === item.recipeId
        );

        if (!recipe) {
            return;
        }

        const element = document.createElement("div");

        element.className = "plan-item";

        element.innerHTML = `
            <div class="plan-item-info">
                <strong>${escapeHtml(recipe.title || "")}</strong>
            </div>

            <div class="plan-item-controls">
                <button
                    type="button"
                    class="plan-minus"
                    aria-label="Portionen verringern"
                >
                    −
                </button>

                <span>${item.servings}</span>

                <button
                    type="button"
                    class="plan-plus"
                    aria-label="Portionen erhöhen"
                >
                    +
                </button>

                <button
                    type="button"
                    class="plan-remove"
                    aria-label="Gericht entfernen"
                >
                    ×
                </button>
            </div>
        `;

        element
            .querySelector(".plan-minus")
            .addEventListener("click", () => {
                changePlanServings(recipe.id, -1);
            });

        element
            .querySelector(".plan-plus")
            .addEventListener("click", () => {
                changePlanServings(recipe.id, 1);
            });

        element
            .querySelector(".plan-remove")
            .addEventListener("click", () => {
                removeFromWeeklyPlan(recipe.id);
            });

        container.appendChild(element);
    });

    updatePlanCount();
}


function updatePlanCount() {
    const badge = document.getElementById(
        "weekly-plan-count"
    );

    if (!badge) {
        return;
    }

    badge.textContent = weeklyPlan.length;
}


/* =========================================================
   EINKAUFSLISTE
   ========================================================= */

function renderShoppingList() {
    const container = document.getElementById(
        "shopping-list"
    );

    if (!container) {
        return;
    }

    const grouped = {};

    weeklyPlan.forEach(planItem => {
        const recipe = recipes.find(
            item => item.id === planItem.recipeId
        );

        if (!recipe || !Array.isArray(recipe.ingredients)) {
            return;
        }

        const baseServings = recipe.servings || 1;
        const scale = planItem.servings / baseServings;

        recipe.ingredients.forEach(ingredient => {
            const category =
                ingredient.category || "Sonstiges";

            if (!grouped[category]) {
                grouped[category] = [];
            }

            const amount =
                typeof ingredient.amount === "number"
                    ? ingredient.amount * scale
                    : ingredient.amount;

            const unit = ingredient.unit || "";

            const isSummable =
                Array.isArray(config.summableUnits) &&
                config.summableUnits.includes(unit);

            if (isSummable) {
                const existing = grouped[category].find(
                    item =>
                        item.name.toLowerCase() ===
                            String(ingredient.name || "")
                                .toLowerCase() &&
                        item.unit === unit
                );

                if (existing) {
                    existing.amount += Number(amount) || 0;
                } else {
                    grouped[category].push({
                        name: ingredient.name || "",
                        amount: Number(amount) || 0,
                        unit: unit,
                        summable: true
                    });
                }
            } else {
                grouped[category].push({
                    name: ingredient.name || "",
                    amount: amount,
                    unit: unit,
                    summable: false
                });
            }
        });
    });

    const categories = Object.keys(grouped).sort();

    if (categories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                Die Einkaufsliste ist noch leer.
            </div>
        `;

        return;
    }

    container.innerHTML = categories
        .map(category => {
            const items = grouped[category];

            return `
                <div class="shopping-category">
                    <h3>${escapeHtml(category)}</h3>

                    <ul>
                        ${items
                            .map(
                                (item, index) => `
                                    <li>
                                        <label>
                                            <input
                                                type="checkbox"
                                                data-shopping-item="${escapeHtml(
                                                    category
                                                )}-${index}"
                                            >

                                            <span>
                                                ${
                                                    item.summable
                                                        ? `${escapeHtml(
                                                              formatAmount(
                                                                  item.amount
                                                              )
                                                          )} ${escapeHtml(
                                                              item.unit
                                                          )} `
                                                        : ""
                                                }

                                                ${escapeHtml(
                                                    item.name
                                                )}

                                                ${
                                                    !item.summable &&
                                                    item.amount !==
                                                        "" &&
                                                    item.amount !==
                                                        null &&
                                                    item.amount !==
                                                        undefined
                                                        ? ` (${escapeHtml(
                                                              formatAmount(
                                                                  item.amount
                                                              )
                                                          )} ${escapeHtml(
                                                              item.unit
                                                          )})`
                                                        : ""
                                                }
                                            </span>
                                        </label>
                                    </li>
                                `
                            )
                            .join("")}
                    </ul>
                </div>
            `;
        })
        .join("");
}


/* =========================================================
   AKTIONEN
   ========================================================= */

function setupActions() {
    const clearPlanButton = document.getElementById(
        "clear-plan"
    );

    if (clearPlanButton) {
        clearPlanButton.addEventListener("click", () => {
            weeklyPlan = [];

            saveWeeklyPlan();

            renderRecipes();
            renderWeeklyPlan();
            renderShoppingList();
        });
    }

    const resetShoppingButton = document.getElementById(
        "reset-shopping"
    );

    if (resetShoppingButton) {
        resetShoppingButton.addEventListener("click", () => {
            const checkboxes = document.querySelectorAll(
                '#shopping-list input[type="checkbox"]'
            );

            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        });
    }
}


/* =========================================================
   SICHTBARE FEHLERMELDUNGEN
   ========================================================= */

function showStatus(message, type = "loading") {
    let status = document.getElementById(
        "app-status-message"
    );

    if (!status) {
        status = document.createElement("div");

        status.id = "app-status-message";

        document.body.prepend(status);
    }

    status.className = `app-status ${type}`;
    status.innerHTML = message;
    status.style.display = "block";
}


function hideStatus() {
    const status = document.getElementById(
        "app-status-message"
    );

    if (status) {
        status.style.display = "none";
    }
}


/* =========================================================
   HILFSFUNKTIONEN
   ========================================================= */

function formatAmount(amount) {
    if (
        amount === null ||
        amount === undefined ||
        amount === ""
    ) {
        return "";
    }

    const number = Number(amount);

    if (Number.isNaN(number)) {
        return String(amount);
    }

    return number
        .toFixed(2)
        .replace(/\.00$/, "")
        .replace(/(\.\d)0$/, "$1")
        .replace(".", ",");
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
