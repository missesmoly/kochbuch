"use strict";


/* =========================================================
   GLOBALE VARIABLEN
========================================================= */

let config = {};
let recipes = [];

let selectedTags = new Set();

let weeklyPlan = [];

let currentRecipe = null;
let currentRecipeServings = 1;

const WEEKLY_STORAGE_KEY = "kochbuch-weekly-plan";


/* =========================================================
   START
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    init();
});


async function init() {

    try {

        showStatus(
            "Kochbuch wird geladen …",
            "loading"
        );


        /*
         * Erst Konfiguration laden
         */
        await loadConfig();


        /*
         * Danach Rezeptkatalog und einzelne Rezepte laden
         */
        await loadRecipes();


        /*
         * Gespeicherten Wochenplan laden
         */
        loadWeeklyPlan();


        /*
         * Oberfläche einrichten
         */
        setupNavigation();
        setupSearch();
        setupFilters();
        setupModal();
        setupActions();


        /*
         * Oberfläche anzeigen
         */
        renderTags();
        renderRecipes();
        renderWeeklyPlan();
        renderShoppingList();


        hideStatus();


    } catch (error) {

        console.error(error);

        showStatus(
            `
            <strong>Das Kochbuch konnte nicht vollständig geladen werden.</strong>

            <br><br>

            ${escapeHtml(error.message)}

            <br><br>

            Bitte prüfe die genannte Datei in GitHub.
            `,
            "error"
        );
    }
}


/* =========================================================
   KONFIGURATION LADEN
========================================================= */

async function loadConfig() {

    const response = await fetch(
        "app.json?cache=" + Date.now()
    );


    if (!response.ok) {

        throw new Error(
            `app.json konnte nicht geladen werden. HTTP ${response.status}.`
        );
    }


    try {

        config = await response.json();

    } catch {

        throw new Error(
            "app.json enthält kein gültiges JSON."
        );
    }


    if (!config.recipePath) {

        throw new Error(
            "In app.json fehlt „recipePath“."
        );
    }
}


/* =========================================================
   REZEPTE LADEN
========================================================= */

async function loadRecipes() {

    const catalogUrl = config.recipePath;


    /*
     * Rezeptübersicht laden
     */

    const response = await fetch(
        catalogUrl + "?cache=" + Date.now()
    );


    if (!response.ok) {

        throw new Error(
            `Die Rezeptübersicht ${catalogUrl} konnte nicht geladen werden. HTTP ${response.status}.`
        );
    }


    let catalog;


    try {

        catalog = await response.json();

    } catch {

        throw new Error(
            `${catalogUrl} enthält kein gültiges JSON.`
        );
    }


    if (
        !catalog.recipes ||
        !Array.isArray(catalog.recipes)
    ) {

        throw new Error(
            `${catalogUrl} enthält kein gültiges „recipes“-Array.`
        );
    }


    recipes = [];


    /*
     * Jedes einzelne Rezept laden
     */

    for (const entry of catalog.recipes) {

        if (!entry.path) {

            throw new Error(
                `Beim Rezept „${entry.title || entry.id || "unbekannt"}“ fehlt „path“.`
            );
        }


        /*
         * WICHTIG:
         *
         * In rezepte/index.json steht z.B.:
         *
         * "path": "pasta-pesto/index.json"
         *
         * Daraus wird:
         *
         * rezepte/pasta-pesto/index.json
         */

        const recipeUrl =
            "rezepte/" + entry.path;


        const recipeResponse = await fetch(
            recipeUrl + "?cache=" + Date.now()
        );


        if (!recipeResponse.ok) {

            throw new Error(
                `Das Rezept „${entry.title || entry.id || "unbekannt"}“ konnte nicht geladen werden: ${recipeUrl} – HTTP ${recipeResponse.status}.`
            );
        }


        let recipe;


        try {

            recipe = await recipeResponse.json();

        } catch {

            throw new Error(
                `${recipeUrl} enthält kein gültiges JSON.`
            );
        }


        /*
         * Katalogdaten und Rezeptdaten zusammenführen
         */

        recipes.push({
            ...entry,
            ...recipe
        });
    }


    if (recipes.length === 0) {

        throw new Error(
            "Es wurden keine Rezepte gefunden."
        );
    }
}


/* =========================================================
   WOCHENPLAN AUS LOCAL STORAGE
========================================================= */

function loadWeeklyPlan() {

    try {

        const saved =
            localStorage.getItem(
                WEEKLY_STORAGE_KEY
            );


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

        console.warn(
            "Wochenplan konnte nicht geladen werden.",
            error
        );

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

    const logo =
        document.getElementById("logo-button");

    const recipesButton =
        document.getElementById("nav-recipes");

    const planButton =
        document.getElementById("nav-plan");

    const shoppingButton =
        document.getElementById("nav-shopping");


    logo?.addEventListener(
        "click",
        () => showSection("recipes")
    );


    recipesButton?.addEventListener(
        "click",
        () => showSection("recipes")
    );


    planButton?.addEventListener(
        "click",
        () => showSection("plan")
    );


    shoppingButton?.addEventListener(
        "click",
        () => showSection("shopping")
    );
}


function showSection(section) {

    const sections = {
        recipes:
            document.getElementById(
                "section-recipes"
            ),

        plan:
            document.getElementById(
                "section-plan"
            ),

        shopping:
            document.getElementById(
                "section-shopping"
            )
    };


    Object.values(sections).forEach(
        element => {

            if (element) {

                element.classList.remove(
                    "active-section"
                );
            }
        }
    );


    if (sections[section]) {

        sections[section].classList.add(
            "active-section"
        );
    }


    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.classList.remove("active");
        });


    const activeButton = {

        recipes:
            document.getElementById(
                "nav-recipes"
            ),

        plan:
            document.getElementById(
                "nav-plan"
            ),

        shopping:
            document.getElementById(
                "nav-shopping"
            )

    }[section];


    activeButton?.classList.add("active");


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   SUCHE
========================================================= */

function setupSearch() {

    const input =
        document.getElementById(
            "search-input"
        );


    input?.addEventListener(
        "input",
        () => renderRecipes()
    );
}


/* =========================================================
   FILTER
========================================================= */

function setupFilters() {

    const resetButton =
        document.getElementById(
            "reset-filters"
        );


    resetButton?.addEventListener(
        "click",
        () => {

            selectedTags.clear();


            const search =
                document.getElementById(
                    "search-input"
                );


            if (search) {

                search.value = "";
            }


            renderTags();
            renderRecipes();
        }
    );
}


function renderTags() {

    const container =
        document.getElementById(
            "tag-filters"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";


    const tags =
        Array.isArray(config.tags)
            ? config.tags
            : [];


    tags.forEach(tag => {

        const button =
            document.createElement(
                "button"
            );


        button.type = "button";

        button.className =
            "tag-button";


        if (
            selectedTags.has(tag)
        ) {

            button.classList.add(
                "active"
            );
        }


        button.textContent = tag;


        button.addEventListener(
            "click",
            () => {

                if (
                    selectedTags.has(tag)
                ) {

                    selectedTags.delete(tag);

                } else {

                    selectedTags.add(tag);
                }


                renderTags();
                renderRecipes();
            }
        );


        container.appendChild(button);
    });
}


/* =========================================================
   REZEPTE ANZEIGEN
========================================================= */

function renderRecipes() {

    const container =
        document.getElementById(
            "recipe-grid"
        );


    if (!container) {
        return;
    }


    const searchInput =
        document.getElementById(
            "search-input"
        );


    const searchTerm =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const filtered =
        recipes.filter(recipe => {

            const tags =
                Array.isArray(recipe.tags)
                    ? recipe.tags
                    : [];


            /*
             * Alle ausgewählten Tags
             * müssen vorhanden sein.
             */

            const matchesTags =
                [...selectedTags].every(
                    tag => tags.includes(tag)
                );


            if (!matchesTags) {
                return false;
            }


            /*
             * Keine Suche
             */

            if (!searchTerm) {
                return true;
            }


            /*
             * Suche auch in Zutaten
             */

            const ingredients =
                Array.isArray(
                    recipe.ingredients
                )
                    ? recipe.ingredients
                        .map(
                            ingredient =>
                                ingredient.name || ""
                        )
                    : [];


            const searchable =
                [
                    recipe.title || "",
                    recipe.description || "",
                    ...tags,
                    ...ingredients
                ]
                    .join(" ")
                    .toLowerCase();


            return searchable.includes(
                searchTerm
            );
        });


    container.innerHTML = "";


    if (filtered.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                Keine passenden Rezepte gefunden.
            </div>
        `;

        return;
    }


    filtered.forEach(recipe => {

        container.appendChild(
            createRecipeCard(recipe)
        );
    });
}


/* =========================================================
   REZEPTKARTE
========================================================= */

function createRecipeCard(recipe) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "recipe-card";


    const imagePath =
        getRecipeImagePath(recipe);


    const inPlan =
        weeklyPlan.some(
            item =>
                item.recipeId === recipe.id
        );


    card.innerHTML = `

        <div class="recipe-image-wrapper">

            <img
                class="recipe-image"
                src="${escapeHtml(imagePath)}"
                alt="${escapeHtml(recipe.title || "")}"
                loading="lazy"
            >

            <button
                class="add-recipe-button ${
                    inPlan ? "added" : ""
                }"
                type="button"
            >
                ${inPlan ? "✓" : "+"}
            </button>

        </div>


        <div class="recipe-card-content">

            <h3>
                ${escapeHtml(
                    recipe.title || ""
                )}
            </h3>

            ${
                recipe.description
                    ? `
                        <p>
                            ${escapeHtml(
                                recipe.description
                            )}
                        </p>
                    `
                    : ""
            }


            ${
                Array.isArray(recipe.tags)
                    ? `
                        <div class="recipe-tags">

                            ${recipe.tags
                                .map(
                                    tag => `
                                        <span class="recipe-tag">
                                            ${escapeHtml(tag)}
                                        </span>
                                    `
                                )
                                .join("")}

                        </div>
                    `
                    : ""
            }

        </div>
    `;


    const image =
        card.querySelector(
            ".recipe-image"
        );


    const title =
        card.querySelector("h3");


    const addButton =
        card.querySelector(
            ".add-recipe-button"
        );


    image?.addEventListener(
        "click",
        () => openRecipe(recipe.id)
    );


    title?.addEventListener(
        "click",
        () => openRecipe(recipe.id)
    );


    addButton?.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            addToWeeklyPlan(
                recipe.id
            );
        }
    );


    return card;
}


/* =========================================================
   BILDPFAD
========================================================= */

function getRecipeImagePath(recipe) {

    if (!recipe.image) {

        return "";
    }


    if (recipe.path) {

        const path =
            recipe.path.replace(
                /\\/g,
                "/"
            );


        const slash =
            path.lastIndexOf("/");


        if (slash !== -1) {

            const folder =
                path.substring(
                    0,
                    slash
                );


            return (
                "rezepte/" +
                folder +
                "/" +
                recipe.image
            );
        }
    }


    return (
        "rezepte/" +
        recipe.image
    );
}


/* =========================================================
   REZEPT-MODAL
========================================================= */

function setupModal() {

    const modal =
        document.getElementById(
            "recipe-modal"
        );


    const closeButton =
        document.getElementById(
            "modal-close"
        );


    closeButton?.addEventListener(
        "click",
        closeRecipeModal
    );


    modal?.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeRecipeModal();
            }
        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeRecipeModal();
            }
        }
    );
}


function openRecipe(recipeId) {

    const recipe =
        recipes.find(
            item =>
                item.id === recipeId
        );


    if (!recipe) {
        return;
    }


    currentRecipe = recipe;


    currentRecipeServings =
        recipe.servings || 1;


    renderRecipeModal();
}


function renderRecipeModal() {

    if (!currentRecipe) {
        return;
    }


    const modal =
        document.getElementById(
            "recipe-modal"
        );


    if (!modal) {
        return;
    }


    const recipe =
        currentRecipe;


    const imagePath =
        getRecipeImagePath(recipe);


    const ingredients =
        Array.isArray(
            recipe.ingredients
        )
            ? recipe.ingredients
            : [];


    const steps =
        Array.isArray(recipe.steps)
            ? recipe.steps
            : [];


    modal.classList.add("open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    const title =
        document.getElementById(
            "modal-title"
        );


    const image =
        document.getElementById(
            "modal-image"
        );


    const description =
        document.getElementById(
            "modal-description"
        );


    const servings =
        document.getElementById(
            "modal-servings"
        );


    const ingredientList =
        document.getElementById(
            "modal-ingredients"
        );


    const stepsList =
        document.getElementById(
            "modal-steps"
        );


    const addButton =
        document.getElementById(
            "modal-add-plan"
        );


    if (title) {

        title.textContent =
            recipe.title || "";
    }


    if (image) {

        image.src =
            imagePath;

        image.alt =
            recipe.title || "";
    }


    if (description) {

        description.textContent =
            recipe.description || "";
    }


    if (servings) {

        servings.textContent =
            currentRecipeServings;
    }


    if (ingredientList) {

        ingredientList.innerHTML =
            ingredients
                .map(
                    ingredient => {

                        const amount =
                            calculateIngredientAmount(
                                ingredient
                            );


                        return `
                            <li>

                                <span>
                                    ${escapeHtml(
                                        ingredient.name ||
                                        ""
                                    )}
                                </span>

                                <strong>
                                    ${escapeHtml(
                                        formatAmount(
                                            amount
                                        )
                                    )}
                                    ${escapeHtml(
                                        ingredient.unit ||
                                        ""
                                    )}
                                </strong>

                            </li>
                        `;
                    }
                )
                .join("");
    }


    if (stepsList) {

        stepsList.innerHTML =
            steps
                .map(
                    (step, index) => `
                        <li>

                            <span class="step-number">
                                ${index + 1}
                            </span>

                            <span>
                                ${escapeHtml(step)}
                            </span>

                        </li>
                    `
                )
                .join("");
    }


    setupModalServingControls();


    if (addButton) {

        addButton.onclick = () => {

            addToWeeklyPlan(
                recipe.id,
                currentRecipeServings
            );
        };
    }
}


function setupModalServingControls() {

    const minus =
        document.getElementById(
            "modal-servings-minus"
        );


    const plus =
        document.getElementById(
            "modal-servings-plus"
        );


    minus?.addEventListener(
        "click",
        decreaseModalServings
    );


    plus?.addEventListener(
        "click",
        increaseModalServings
    );
}


function decreaseModalServings() {

    if (
        currentRecipeServings <= 1
    ) {

        return;
    }


    currentRecipeServings--;

    renderRecipeModal();
}


function increaseModalServings() {

    currentRecipeServings++;

    renderRecipeModal();
}


function closeRecipeModal() {

    const modal =
        document.getElementById(
            "recipe-modal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    currentRecipe = null;
}


function calculateIngredientAmount(
    ingredient
) {

    if (
        !currentRecipe ||
        typeof ingredient.amount !==
            "number"
    ) {

        return ingredient.amount ?? "";
    }


    const baseServings =
        currentRecipe.servings || 1;


    return (
        ingredient.amount *
        (
            currentRecipeServings /
            baseServings
        )
    );
}


/* =========================================================
   WOCHENPLAN
========================================================= */

function addToWeeklyPlan(
    recipeId,
    servings = null
) {

    const recipe =
        recipes.find(
            item =>
                item.id === recipeId
        );


    if (!recipe) {
        return;
    }


    const amount =
        servings ||
        recipe.servings ||
        1;


    const existing =
        weeklyPlan.find(
            item =>
                item.recipeId ===
                recipeId
        );


    if (existing) {

        existing.servings +=
            amount;

    } else {

        weeklyPlan.push({
            recipeId:
                recipeId,

            servings:
                amount
        });
    }


    saveWeeklyPlan();


    renderRecipes();
    renderWeeklyPlan();
    renderShoppingList();
}


function changePlanServings(
    recipeId,
    change
) {

    const item =
        weeklyPlan.find(
            entry =>
                entry.recipeId ===
                recipeId
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


function removeFromWeeklyPlan(
    recipeId
) {

    weeklyPlan =
        weeklyPlan.filter(
            item =>
                item.recipeId !==
                recipeId
        );


    saveWeeklyPlan();


    renderRecipes();
    renderWeeklyPlan();
    renderShoppingList();
}


function renderWeeklyPlan() {

    const container =
        document.getElementById(
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


    weeklyPlan.forEach(
        item => {

            const recipe =
                recipes.find(
                    entry =>
                        entry.id ===
                        item.recipeId
                );


            if (!recipe) {
                return;
            }


            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "plan-item";


            element.innerHTML = `

                <div class="plan-item-info">

                    <strong>
                        ${escapeHtml(
                            recipe.title || ""
                        )}
                    </strong>

                </div>


                <div class="plan-item-controls">

                    <button
                        type="button"
                        class="plan-minus"
                    >
                        −
                    </button>

                    <span>
                        ${item.servings}
                    </span>

                    <button
                        type="button"
                        class="plan-plus"
                    >
                        +
                    </button>

                    <button
                        type="button"
                        class="plan-remove"
                    >
                        ×
                    </button>

                </div>
            `;


            element
                .querySelector(
                    ".plan-minus"
                )
                ?.addEventListener(
                    "click",
                    () =>
                        changePlanServings(
                            recipe.id,
                            -1
                        )
                );


            element
                .querySelector(
                    ".plan-plus"
                )
                ?.addEventListener(
                    "click",
                    () =>
                        changePlanServings(
                            recipe.id,
                            1
                        )
                );


            element
                .querySelector(
                    ".plan-remove"
                )
                ?.addEventListener(
                    "click",
                    () =>
                        removeFromWeeklyPlan(
                            recipe.id
                        )
                );


            container.appendChild(
                element
            );
        }
    );


    updatePlanCount();
}


function updatePlanCount() {

    const badge =
        document.getElementById(
            "weekly-plan-count"
        );


    if (!badge) {
        return;
    }


    badge.textContent =
        weeklyPlan.length;
}


/* =========================================================
   EINKAUFSLISTE
========================================================= */

function renderShoppingList() {

    const container =
        document.getElementById(
            "shopping-list"
        );


    if (!container) {
        return;
    }


    const grouped = {};


    weeklyPlan.forEach(
        planItem => {

            const recipe =
                recipes.find(
                    entry =>
                        entry.id ===
                        planItem.recipeId
                );


            if (
                !recipe ||
                !Array.isArray(
                    recipe.ingredients
                )
            ) {

                return;
            }


            const baseServings =
                recipe.servings || 1;


            const scale =
                planItem.servings /
                baseServings;


            recipe.ingredients.forEach(
                ingredient => {

                    const category =
                        ingredient.category ||
                        "Sonstiges";


                    if (
                        !grouped[category]
                    ) {

                        grouped[category] = [];
                    }


                    const amount =
                        typeof ingredient.amount ===
                        "number"

                            ? ingredient.amount *
                              scale

                            : ingredient.amount;


                    const unit =
                        ingredient.unit || "";


                    const summable =
                        Array.isArray(
                            config.summableUnits
                        ) &&
                        config.summableUnits.includes(
                            unit
                        );


                    if (summable) {

                        const existing =
                            grouped[category].find(
                                item =>
                                    item.name
                                        .toLowerCase() ===
                                        String(
                                            ingredient.name ||
                                            ""
                                        ).toLowerCase() &&
                                    item.unit ===
                                        unit
                            );


                        if (existing) {

                            existing.amount +=
                                Number(amount) || 0;

                        } else {

                            grouped[
                                category
                            ].push({

                                name:
                                    ingredient.name ||
                                    "",

                                amount:
                                    Number(amount) ||
                                    0,

                                unit:
                                    unit,

                                summable:
                                    true
                            });
                        }

                    } else {

                        grouped[
                            category
                        ].push({

                            name:
                                ingredient.name ||
                                "",

                            amount:
                                amount,

                            unit:
                                unit,

                            summable:
                                false
                        });
                    }
                }
            );
        }
    );


    const categories =
        Object.keys(grouped).sort();


    if (
        categories.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                Die Einkaufsliste ist noch leer.
            </div>
        `;

        return;
    }


    container.innerHTML =
        categories
            .map(
                category => `

                    <div class="shopping-category">

                        <h3>
                            ${escapeHtml(
                                category
                            )}
                        </h3>


                        <ul>

                            ${grouped[category]
                                .map(
                                    (
                                        item,
                                        index
                                    ) => `

                                        <li>

                                            <label>

                                                <input
                                                    type="checkbox"
                                                    data-shopping-item="${index}"
                                                >

                                                <span>

                                                    ${
                                                        item.summable
                                                            ? `
                                                                ${escapeHtml(
                                                                    formatAmount(
                                                                        item.amount
                                                                    )
                                                                )}
                                                                ${escapeHtml(
                                                                    item.unit
                                                                )}
                                                            `
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
                                                            ? `
                                                                (${escapeHtml(
                                                                    formatAmount(
                                                                        item.amount
                                                                    )
                                                                )}
                                                                ${escapeHtml(
                                                                    item.unit
                                                                )})
                                                            `
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
                `
            )
            .join("");
}


/* =========================================================
   BUTTONS
========================================================= */

function setupActions() {

    const clearPlan =
        document.getElementById(
            "clear-plan"
        );


    clearPlan?.addEventListener(
        "click",
        () => {

            weeklyPlan = [];


            saveWeeklyPlan();


            renderRecipes();
            renderWeeklyPlan();
            renderShoppingList();
        }
    );


    const resetShopping =
        document.getElementById(
            "reset-shopping"
        );


    resetShopping?.addEventListener(
        "click",
        () => {

            document
                .querySelectorAll(
                    '#shopping-list input[type="checkbox"]'
                )
                .forEach(
                    checkbox =>
                        checkbox.checked =
                            false
                );
        }
    );
}


/* =========================================================
   FEHLERMELDUNG
========================================================= */

function showStatus(
    message,
    type
) {

    const status =
        document.getElementById(
            "app-status-message"
        );


    if (!status) {

        /*
         * Falls selbst die Statusbox nicht
         * gefunden wird, zeigen wir wenigstens
         * einen Browser-Dialog.
         */

        alert(
            "Kochbuch-Fehler:\n\n" +
            message.replace(
                /<[^>]*>/g,
                ""
            )
        );

        return;
    }


    status.className =
        "app-status " + type;


    status.innerHTML =
        message;


    status.style.display =
        "block";
}


function hideStatus() {

    const status =
        document.getElementById(
            "app-status-message"
        );


    if (status) {

        status.style.display =
            "none";
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


    const number =
        Number(amount);


    if (
        Number.isNaN(number)
    ) {

        return String(amount);
    }


    return number
        .toFixed(2)
        .replace(
            /\.00$/,
            ""
        )
        .replace(
            /(\.\d)0$/,
            "$1"
        )
        .replace(
            ".",
            ","
        );
}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}
