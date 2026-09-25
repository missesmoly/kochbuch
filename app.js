let config = {};
let recipes = [];

let selectedTags = new Set();
let weeklyPlan = [];

let currentRecipe = null;
let currentRecipeServings = 1;

const WEEKLY_STORAGE_KEY = "kochbuch-weekly-plan";


/* =========================================
   START
========================================= */

document.addEventListener("DOMContentLoaded", init);


async function init() {

    try {

        await loadConfig();
        await loadRecipes();

        loadWeeklyPlan();

        setupNavigation();
        setupSearch();
        setupFilters();
        setupModal();
        setupActions();

        renderTagButtons();
        renderRecipes();
        renderWeeklyPlan();
        renderShoppingList();
        updateWeeklyCount();

    } catch (error) {

        console.error(error);

        document.getElementById("recipeGrid").innerHTML = `
            <div class="empty-state visible">
                <h2>Rezepte konnten nicht geladen werden</h2>
                <p>
                    Bitte überprüfe die JSON-Dateien und die Ordnerstruktur.
                </p>
            </div>
        `;
    }
}


/* =========================================
   DATEN LADEN
========================================= */

async function loadConfig() {

    const response = await fetch("app.json");

    if (!response.ok) {
        throw new Error("app.json konnte nicht geladen werden.");
    }

    config = await response.json();
}


async function loadRecipes() {

    const response = await fetch(config.recipePath);

    if (!response.ok) {
        throw new Error("rezepte/index.json konnte nicht geladen werden.");
    }

    const catalog = await response.json();

    recipes = await Promise.all(
        catalog.recipes.map(async recipe => {

            const recipeResponse = await fetch(
                `rezepte/${recipe.path.replace(/^rezepte\//, "")}`
            );

            if (!recipeResponse.ok) {
                throw new Error(
                    `Rezept konnte nicht geladen werden: ${recipe.id}`
                );
            }

            const fullRecipe = await recipeResponse.json();

            return {
                ...recipe,
                ...fullRecipe
            };
        })
    );
}


/* =========================================
   LOCAL STORAGE
========================================= */

function loadWeeklyPlan() {

    try {

        const stored = localStorage.getItem(WEEKLY_STORAGE_KEY);

        weeklyPlan = stored
            ? JSON.parse(stored)
            : [];

    } catch (error) {

        console.error(error);

        weeklyPlan = [];
    }
}


function saveWeeklyPlan() {

    localStorage.setItem(
        WEEKLY_STORAGE_KEY,
        JSON.stringify(weeklyPlan)
    );

}


/* =========================================
   NAVIGATION
========================================= */

function setupNavigation() {

    document
        .getElementById("navRecipes")
        .addEventListener("click", () => showView("recipes"));

    document
        .getElementById("navRecipesButton")
        .addEventListener("click", () => showView("recipes"));

    document
        .getElementById("navWeekly")
        .addEventListener("click", () => showView("weekly"));

    document
        .getElementById("navShopping")
        .addEventListener("click", () => showView("shopping"));
}


function showView(viewName) {

    document.querySelectorAll(".view").forEach(view => {
        view.classList.remove("active");
    });

    document
        .getElementById(`${viewName}View`)
        .classList.add("active");


    document.querySelectorAll(".nav-button").forEach(button => {
        button.classList.remove("active");
    });


    if (viewName === "recipes") {
        document
            .getElementById("navRecipesButton")
            .classList.add("active");
    }

    if (viewName === "weekly") {
        document
            .getElementById("navWeekly")
            .classList.add("active");
    }

    if (viewName === "shopping") {
        document
            .getElementById("navShopping")
            .classList.add("active");

        renderShoppingList();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================
   SUCHE
========================================= */

function setupSearch() {

    document
        .getElementById("searchInput")
        .addEventListener("input", renderRecipes);
}


function recipeMatchesSearch(recipe, searchTerm) {

    if (!searchTerm) {
        return true;
    }

    const searchableText = [

        recipe.title,
        recipe.description,
        ...(recipe.tags || []),

        ...(recipe.ingredients || []).map(
            ingredient => ingredient.name
        )

    ]
        .join(" ")
        .toLowerCase();


    return searchableText.includes(searchTerm);
}


/* =========================================
   MEHRFACH-TAG-FILTER
========================================= */

function renderTagButtons() {

    const container = document.getElementById("tagList");

    container.innerHTML = "";

    const tags = config.tags || [];

    tags.forEach(tag => {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "tag-button";

        button.textContent = tag;

        button.addEventListener("click", () => {

            if (selectedTags.has(tag)) {
                selectedTags.delete(tag);
            } else {
                selectedTags.add(tag);
            }

            button.classList.toggle(
                "active",
                selectedTags.has(tag)
            );

            renderRecipes();
        });

        container.appendChild(button);
    });
}


function setupFilters() {

    document
        .getElementById("clearFilters")
        .addEventListener("click", () => {

            selectedTags.clear();

            document
                .querySelectorAll(".tag-button")
                .forEach(button => {
                    button.classList.remove("active");
                });

            renderRecipes();
        });
}


function recipeMatchesTags(recipe) {

    if (selectedTags.size === 0) {
        return true;
    }

    const recipeTags = recipe.tags || [];

    /*
       WICHTIG:

       Alle ausgewählten Tags müssen vorhanden sein.

       Beispiel:
       Vegan + MealPrep

       zeigt nur Rezepte,
       die BEIDE Tags besitzen.
    */

    return [...selectedTags].every(tag =>
        recipeTags.includes(tag)
    );
}


/* =========================================
   REZEPTE RENDERN
========================================= */

function renderRecipes() {

    const grid = document.getElementById("recipeGrid");

    const searchTerm = document
        .getElementById("searchInput")
        .value
        .trim()
        .toLowerCase();


    const filteredRecipes = recipes.filter(recipe => {

        return (
            recipeMatchesSearch(recipe, searchTerm) &&
            recipeMatchesTags(recipe)
        );

    });


    document.getElementById("resultCount").textContent =
        `${filteredRecipes.length} ${
            filteredRecipes.length === 1
                ? "Rezept"
                : "Rezepte"
        }`;


    grid.innerHTML = "";


    if (filteredRecipes.length === 0) {

        grid.innerHTML = `
            <div class="empty-state visible">
                <span class="empty-symbol">⌕</span>
                <h2>Keine Rezepte gefunden</h2>
                <p>
                    Versuche einen anderen Suchbegriff
                    oder ändere deine Filter.
                </p>
            </div>
        `;

        return;
    }


    filteredRecipes.forEach(recipe => {

        const card = document.createElement("article");

        card.className = "recipe-card";


        const isInPlan = weeklyPlan.some(
            item => item.recipeId === recipe.id
        );


        card.innerHTML = `

            <button
                class="add-recipe-button ${
                    isInPlan ? "added" : ""
                }"
                data-add="${escapeHtml(recipe.id)}"
                aria-label="${
                    isInPlan
                        ? "Bereits im Wochenplan"
                        : "Zum Wochenplan hinzufügen"
                }"
                title="${
                    isInPlan
                        ? "Bereits im Wochenplan"
                        : "Zum Wochenplan hinzufügen"
                }"
            >
                ${isInPlan ? "✓" : "+"}
            </button>


            <button
                class="recipe-image-button"
                data-open="${escapeHtml(recipe.id)}"
            >
                <img
                    class="recipe-image"
                    src="${escapeHtml(recipe.image)}"
                    alt="${escapeHtml(recipe.title)}"
                    loading="lazy"
                    onerror="this.style.display='none'"
                >
            </button>


            <div class="recipe-card-content">

                <h2>
                    ${escapeHtml(recipe.title)}
                </h2>

                <p class="recipe-card-description">
                    ${escapeHtml(recipe.description || "")}
                </p>

                <div class="recipe-tags">

                    ${(recipe.tags || [])
                        .map(tag => `
                            <span class="recipe-tag">
                                ${escapeHtml(tag)}
                            </span>
                        `)
                        .join("")
                    }

                </div>

            </div>
        `;


        grid.appendChild(card);
    });


    /*
       Öffnen des Rezepts
    */

    grid.querySelectorAll("[data-open]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const recipe = getRecipe(
                    button.dataset.open
                );

                if (recipe) {
                    openRecipe(recipe);
                }

            });

        });


    /*
       + Button
    */

    grid.querySelectorAll("[data-add]")
        .forEach(button => {

            button.addEventListener("click", event => {

                event.stopPropagation();

                addToWeeklyPlan(
                    button.dataset.add
                );

            });

        });
}


/* =========================================
   REZEPT ÖFFNEN
========================================= */

function openRecipe(recipe) {

    currentRecipe = recipe;

    currentRecipeServings =
        recipe.servings || 1;


    renderRecipeModal();


    document
        .getElementById("recipeModal")
        .classList.add("open");

    document.body.style.overflow = "hidden";
}


function renderRecipeModal() {

    if (!currentRecipe) {
        return;
    }


    const recipe = currentRecipe;

    const scale =
        currentRecipeServings /
        (recipe.servings || 1);


    const ingredientsHtml =
        (recipe.ingredients || [])
            .map(ingredient => {

                const amount =
                    ingredient.amount * scale;


                return `
                    <li>

                        <span class="ingredient-name">
                            ${escapeHtml(ingredient.name)}
                        </span>

                        <span class="ingredient-value">
                            ${formatAmount(amount)}
                            ${escapeHtml(ingredient.unit || "")}
                        </span>

                    </li>
                `;

            })
            .join("");


    const stepsHtml =
        (recipe.steps || [])
            .map(step => `
                <li>
                    ${escapeHtml(step)}
                </li>
            `)
            .join("");


    document.getElementById("modalContent").innerHTML = `

        <img
            src="${escapeHtml(recipe.image)}"
            alt="${escapeHtml(recipe.title)}"
            class="modal-recipe-image"
            onerror="this.style.display='none'"
        >


        <div class="modal-recipe-content">

            <div class="recipe-tags">

                ${(recipe.tags || [])
                    .map(tag => `
                        <span class="recipe-tag">
                            ${escapeHtml(tag)}
                        </span>
                    `)
                    .join("")
                }

            </div>


            <h1>
                ${escapeHtml(recipe.title)}
            </h1>


            <p class="modal-description">
                ${escapeHtml(recipe.description || "")}
            </p>


            <div class="recipe-serving-box">

                <span class="recipe-serving-label">
                    Portionen
                </span>


                <div class="recipe-serving-control">

                    <button
                        type="button"
                        id="recipeServingMinus"
                        aria-label="Portionen verringern"
                    >
                        −
                    </button>


                    <span
                        class="recipe-serving-number"
                        id="recipeServingNumber"
                    >
                        ${currentRecipeServings}
                    </span>


                    <button
                        type="button"
                        id="recipeServingPlus"
                        aria-label="Portionen erhöhen"
                    >
                        +
                    </button>

                </div>

            </div>


            <div class="recipe-section">

                <h2>Zutaten</h2>

                <ul class="ingredient-list">
                    ${ingredientsHtml}
                </ul>

            </div>


            <div class="recipe-section">

                <h2>Zubereitung</h2>

                <ol class="recipe-steps">
                    ${stepsHtml}
                </ol>

            </div>


            <button
                type="button"
                class="modal-plan-button"
                id="modalAddToPlan"
            >
                Zum Wochenplan hinzufügen
            </button>

        </div>
    `;


    document
        .getElementById("recipeServingMinus")
        .addEventListener("click", () => {

            if (currentRecipeServings > 1) {

                currentRecipeServings--;

                renderRecipeModal();
            }

        });


    document
        .getElementById("recipeServingPlus")
        .addEventListener("click", () => {

            currentRecipeServings++;

            renderRecipeModal();
        });


    document
        .getElementById("modalAddToPlan")
        .addEventListener("click", () => {

            addToWeeklyPlan(
                recipe.id,
                currentRecipeServings
            );

        });
}


/* =========================================
   MODAL
========================================= */

function setupModal() {

    document
        .getElementById("modalClose")
        .addEventListener("click", closeRecipe);


    document
        .getElementById("recipeModal")
        .addEventListener("click", event => {

            if (
                event.target.id === "recipeModal"
            ) {
                closeRecipe();
            }

        });


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                document
                    .getElementById("recipeModal")
                    .classList.contains("open")
            ) {
                closeRecipe();
            }

        }
    );
}


function closeRecipe() {

    document
        .getElementById("recipeModal")
        .classList.remove("open");

    document.body.style.overflow = "";

    currentRecipe = null;
}


/* =========================================
   WOCHENPLAN
========================================= */

function addToWeeklyPlan(recipeId, servings = null) {

    const recipe = getRecipe(recipeId);

    if (!recipe) {
        return;
    }


    const existing = weeklyPlan.find(
        item => item.recipeId === recipeId
    );


    if (existing) {

        /*
           Ist das Rezept schon im Plan,
           erhöhen wir die Portionen um die
           Grund-Portionszahl.

           Beispiel:
           Rezept = 2 Portionen
           bereits 2 im Plan
           + klicken
           => 4 Portionen
        */

        existing.servings +=
            servings || recipe.servings || 1;

    } else {

        weeklyPlan.push({

            recipeId: recipe.id,

            servings:
                servings ||
                recipe.servings ||
                1

        });

    }


    saveWeeklyPlan();

    renderWeeklyPlan();
    renderShoppingList();

    updateWeeklyCount();
    renderRecipes();
}


function removeFromWeeklyPlan(recipeId) {

    weeklyPlan = weeklyPlan.filter(
        item => item.recipeId !== recipeId
    );


    saveWeeklyPlan();

    renderWeeklyPlan();
    renderShoppingList();

    updateWeeklyCount();
    renderRecipes();
}


function changeWeeklyServings(recipeId, change) {

    const item = weeklyPlan.find(
        item => item.recipeId === recipeId
    );

    if (!item) {
        return;
    }


    item.servings += change;


    if (item.servings < 1) {
        item.servings = 1;
    }


    saveWeeklyPlan();

    renderWeeklyPlan();
    renderShoppingList();
}


function renderWeeklyPlan() {

    const container =
        document.getElementById("weeklyPlanList");

    const empty =
        document.getElementById("weeklyEmpty");


    container.innerHTML = "";


    if (weeklyPlan.length === 0) {

        empty.classList.add("visible");

        return;
    }


    empty.classList.remove("visible");


    weeklyPlan.forEach(item => {

        const recipe =
            getRecipe(item.recipeId);


        if (!recipe) {
            return;
        }


        const element =
            document.createElement("article");

        element.className = "weekly-item";


        element.innerHTML = `

            <div class="weekly-item-main">

                <img
                    src="${escapeHtml(recipe.image)}"
                    alt=""
                    class="weekly-item-image"
                    onerror="this.style.display='none'"
                >

                <div>

                    <h2 class="weekly-item-title">
                        ${escapeHtml(recipe.title)}
                    </h2>

                    <div class="weekly-item-meta">
                        Portionen
                    </div>

                </div>

            </div>


            <div class="serving-control">

                <button
                    class="serving-button"
                    data-minus="${escapeHtml(recipe.id)}"
                >
                    −
                </button>

                <span class="serving-number">
                    ${item.servings}
                </span>

                <button
                    class="serving-button"
                    data-plus="${escapeHtml(recipe.id)}"
                >
                    +
                </button>

                <button
                    class="remove-button"
                    data-remove="${escapeHtml(recipe.id)}"
                    aria-label="Rezept entfernen"
                    title="Aus Wochenplan entfernen"
                >
                    ×
                </button>

            </div>
        `;


        container.appendChild(element);
    });


    container
        .querySelectorAll("[data-minus]")
        .forEach(button => {

            button.addEventListener("click", () => {

                changeWeeklyServings(
                    button.dataset.minus,
                    -1
                );

            });

        });


    container
        .querySelectorAll("[data-plus]")
        .forEach(button => {

            button.addEventListener("click", () => {

                changeWeeklyServings(
                    button.dataset.plus,
                    1
                );

            });

        });


    container
        .querySelectorAll("[data-remove]")
        .forEach(button => {

            button.addEventListener("click", () => {

                removeFromWeeklyPlan(
                    button.dataset.remove
                );

            });

        });
}


/* =========================================
   EINKAUFSLISTE
========================================= */

function renderShoppingList() {

    const container =
        document.getElementById("shoppingList");

    const empty =
        document.getElementById("shoppingEmpty");


    container.innerHTML = "";


    if (weeklyPlan.length === 0) {

        empty.classList.add("visible");

        return;
    }


    empty.classList.remove("visible");


    const summableUnits =
        config.summableUnits || [];


    const grouped = {};
    const unsummable = [];


    weeklyPlan.forEach(planItem => {

        const recipe =
            getRecipe(planItem.recipeId);


        if (!recipe) {
            return;
        }


        const recipeBaseServings =
            recipe.servings || 1;


        const scale =
            planItem.servings /
            recipeBaseServings;


        (recipe.ingredients || [])
            .forEach(ingredient => {

                const amount =
                    ingredient.amount * scale;


                const unit =
                    ingredient.unit || "";


                /*
                   Nur Einheiten aus app.json
                   werden zusammengezählt.
                */

                if (summableUnits.includes(unit)) {

                    const key =
                        `${ingredient.name}|||${unit}`;


                    if (!grouped[key]) {

                        grouped[key] = {

                            name: ingredient.name,

                            amount: 0,

                            unit: unit,

                            category:
                                ingredient.category ||
                                "Sonstiges"

                        };

                    }


                    grouped[key].amount += amount;

                } else {

                    /*
                       Nicht summierbare Mengen
                       bleiben einzeln.
                    */

                    unsummable.push({

                        name: ingredient.name,

                        amount: amount,

                        unit: unit,

                        category:
                            ingredient.category ||
                            "Sonstiges",

                        recipe:
                            recipe.title

                    });

                }

            });

    });


    const categories = {};


    Object.values(grouped).forEach(item => {

        if (!categories[item.category]) {
            categories[item.category] = [];
        }

        categories[item.category].push(item);
    });


    unsummable.forEach(item => {

        if (!categories[item.category]) {
            categories[item.category] = [];
        }

        categories[item.category].push(item);
    });


    Object.keys(categories)
        .sort()
        .forEach(category => {

            const section =
                document.createElement("section");

            section.className =
                "shopping-category";


            const items =
                categories[category];


            section.innerHTML = `

                <h2 class="shopping-category-title">
                    ${escapeHtml(category)}
                </h2>

                <ul class="shopping-items">

                    ${items.map(item => `

                        <li class="shopping-item">

                            <label>

                                <input
                                    type="checkbox"
                                    class="shopping-checkbox"
                                >

                                <span class="ingredient-name">
                                    ${escapeHtml(item.name)}
                                </span>

                            </label>

                            <span class="ingredient-amount">
                                ${formatAmount(item.amount)}
                                ${escapeHtml(item.unit)}
                                ${
                                    item.recipe
                                        ? ` · ${escapeHtml(item.recipe)}`
                                        : ""
                                }
                            </span>

                        </li>

                    `).join("")}

                </ul>
            `;


            container.appendChild(section);
        });


    setupShoppingCheckboxes();
}


function setupShoppingCheckboxes() {

    document
        .querySelectorAll(".shopping-checkbox")
        .forEach(checkbox => {

            checkbox.addEventListener(
                "change",
                () => {

                    checkbox
                        .closest(".shopping-item")
                        .classList.toggle(
                            "checked",
                            checkbox.checked
                        );

                }
            );

        });
}


/* =========================================
   AKTIONEN
========================================= */

function setupActions() {

    document
        .getElementById("clearWeeklyPlan")
        .addEventListener("click", () => {

            if (weeklyPlan.length === 0) {
                return;
            }


            weeklyPlan = [];

            saveWeeklyPlan();

            renderWeeklyPlan();
            renderShoppingList();

            updateWeeklyCount();
            renderRecipes();

        });


    document
        .getElementById("resetShopping")
        .addEventListener("click", () => {

            document
                .querySelectorAll(".shopping-checkbox")
                .forEach(checkbox => {

                    checkbox.checked = false;

                    checkbox
                        .closest(".shopping-item")
                        .classList.remove("checked");

                });

        });
}


/* =========================================
   HILFSFUNKTIONEN
========================================= */

function getRecipe(recipeId) {

    return recipes.find(
        recipe => recipe.id === recipeId
    );
}


function updateWeeklyCount() {

    document
        .getElementById("weeklyCount")
        .textContent = weeklyPlan.length;
}


function formatAmount(amount) {

    if (Number.isInteger(amount)) {
        return amount;
    }


    return Number(amount.toFixed(2))
        .toString()
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
