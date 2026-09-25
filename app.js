let recipes = [];

let activeTag = "Alle";

let weeklyPlan = [];


/* =========================================
   INITIALISIERUNG
   ========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadRecipes();

        loadWeeklyPlan();

        setupNavigation();

        setupSearch();

        setupTagFilter();

        setupModal();

        setupClearButtons();

        setupRecipeNavigation();

        renderRecipes();

        renderWeeklyPlan();

        renderShoppingList();

    }
);


/* =========================================
   REZEPTE LADEN
   ========================================= */

async function loadRecipes() {

    try {

        const response =
            await fetch("rezepte/index.json");


        if (!response.ok) {

            throw new Error(
                "Rezeptindex konnte nicht geladen werden."
            );

        }


        const data =
            await response.json();


        recipes =
            data.recipes || [];


    } catch (error) {

        console.error(error);

        document
            .getElementById("recipe-grid")
            .innerHTML = `
                <p>
                    Die Rezepte konnten nicht
                    geladen werden.
                </p>
            `;

    }

}


/* =========================================
   NAVIGATION
   ========================================= */

function setupNavigation() {

    const buttons =
        document.querySelectorAll(
            ".nav-button"
        );


    const views = {

        recipes:
            document.getElementById(
                "recipe-view"
            ),

        "weekly-plan":
            document.getElementById(
                "weekly-plan-view"
            ),

        "shopping-list":
            document.getElementById(
                "shopping-list-view"
            )

    };


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const target =
                    button.dataset.view;


                Object.values(views)
                    .forEach(view => {
                        view.hidden = true;
                    });


                views[target].hidden =
                    false;


                buttons.forEach(btn => {

                    btn.classList.remove(
                        "active"
                    );

                });


                button.classList.add(
                    "active"
                );


                if (
                    target === "weekly-plan"
                ) {

                    renderWeeklyPlan();

                }


                if (
                    target === "shopping-list"
                ) {

                    renderShoppingList();

                }

            }
        );

    });

}


/* =========================================
   ZURÜCK ZU REZEPTEN
   ========================================= */

function setupRecipeNavigation() {

    document
        .querySelectorAll(
            "[data-go-to-recipes]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelector(
                            '[data-view="recipes"]'
                        )
                        .click();

                }
            );

        });

}


/* =========================================
   SUCHE
   ========================================= */

function setupSearch() {

    const search =
        document.getElementById(
            "search"
        );


    search.addEventListener(
        "input",
        renderRecipes
    );

}


/* =========================================
   TAG FILTER
   ========================================= */

function setupTagFilter() {

    document
        .querySelectorAll(
            ".tag-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    activeTag =
                        button.dataset.tag;


                    document
                        .querySelectorAll(
                            ".tag-button"
                        )
                        .forEach(btn => {

                            btn.classList.remove(
                                "active"
                            );

                        });


                    button.classList.add(
                        "active"
                    );


                    renderRecipes();

                }
            );

        });

}


/* =========================================
   REZEPTE FILTERN
   ========================================= */

function getFilteredRecipes() {

    const search =
        document
            .getElementById("search")
            .value
            .trim()
            .toLowerCase();


    return recipes.filter(recipe => {

        const matchesTag =
            activeTag === "Alle" ||
            recipe.tags.includes(
                activeTag
            );


        if (!search) {

            return matchesTag;

        }


        const title =
            recipe.title
                .toLowerCase();


        const description =
            (
                recipe.description || ""
            ).toLowerCase();


        const tags =
            recipe.tags
                .join(" ")
                .toLowerCase();


        const ingredients =
            recipe.ingredients
                .map(
                    ingredient =>
                        ingredient.name
                )
                .join(" ")
                .toLowerCase();


        const matchesSearch =

            title.includes(search) ||

            description.includes(search) ||

            tags.includes(search) ||

            ingredients.includes(search);


        return (
            matchesTag &&
            matchesSearch
        );

    });

}


/* =========================================
   REZEPTE DARSTELLEN
   ========================================= */

function renderRecipes() {

    const grid =
        document.getElementById(
            "recipe-grid"
        );


    const noResults =
        document.getElementById(
            "no-results"
        );


    const count =
        document.getElementById(
            "recipe-count"
        );


    const filtered =
        getFilteredRecipes();


    grid.innerHTML = "";


    count.textContent =
        `${filtered.length} ${
            filtered.length === 1
                ? "Rezept"
                : "Rezepte"
        }`;


    noResults.hidden =
        filtered.length !== 0;


    filtered.forEach(recipe => {

        const card =
            document.createElement(
                "article"
            );


        card.className =
            "recipe-card";


        card.innerHTML = `

            <button
                type="button"
                class="recipe-card-button"
            >

                <img
                    src="rezepte/${recipe.image}"
                    alt="${escapeHtml(
                        recipe.title
                    )}"
                    class="recipe-image"
                >

                <div class="recipe-content">

                    <h3 class="recipe-title">
                        ${escapeHtml(
                            recipe.title
                        )}
                    </h3>

                    <p class="recipe-description">
                        ${escapeHtml(
                            recipe.description || ""
                        )}
                    </p>

                    <div class="recipe-tags">

                        ${recipe.tags
                            .map(tag => `
                                <span
                                    class="recipe-tag"
                                >
                                    ${escapeHtml(tag)}
                                </span>
                            `)
                            .join("")}

                    </div>

                </div>

            </button>

        `;


        card
            .querySelector(
                ".recipe-card-button"
            )
            .addEventListener(
                "click",
                () => openRecipe(recipe)
            );


        grid.appendChild(card);

    });

}


/* =========================================
   REZEPT-MODAL
   ========================================= */

function setupModal() {

    document
        .getElementById(
            "close-recipe-modal"
        )
        .addEventListener(
            "click",
            closeRecipe
        );


    document
        .querySelector(
            "[data-close-modal]"
        )
        .addEventListener(
            "click",
            closeRecipe
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeRecipe();

            }

        }
    );

}


function openRecipe(recipe) {

    const modal =
        document.getElementById(
            "recipe-modal"
        );


    const body =
        document.getElementById(
            "recipe-modal-body"
        );


    const alreadyPlanned =
        weeklyPlan.some(
            item =>
                item.recipeId === recipe.id
        );


    body.innerHTML = `

        <p class="eyebrow">

            ${recipe.tags
                .map(tag =>
                    escapeHtml(tag)
                )
                .join(" · ")}

        </p>


        <h1 id="modal-recipe-title">

            ${escapeHtml(
                recipe.title
            )}

        </h1>


        <img
            src="rezepte/${recipe.image}"
            alt="${escapeHtml(
                recipe.title
            )}"
            class="recipe-modal-image"
        >


        <p class="recipe-intro">

            ${escapeHtml(
                recipe.description || ""
            )}

        </p>


        <div class="recipe-modal-grid">


            <section>

                <h2>
                    Zutaten
                </h2>


                <ul class="ingredient-list">

                    ${recipe.ingredients
                        .map(
                            ingredient => `

                                <li>

                                    <span>
                                        ${escapeHtml(
                                            ingredient.name
                                        )}
                                    </span>

                                    <strong>

                                        ${
                                            ingredient.amount
                                        }

                                        ${
                                            ingredient.unit
                                        }

                                    </strong>

                                </li>

                            `
                        )
                        .join("")}

                </ul>

            </section>


            <section>

                <h2>
                    Zubereitung
                </h2>


                <ol class="steps">

                    ${(recipe.steps || [])
                        .map(
                            step => `

                                <li>
                                    ${escapeHtml(
                                        step
                                    )}
                                </li>

                            `
                        )
                        .join("")}

                </ol>

            </section>

        </div>


        <button
            id="add-recipe-to-plan"
            class="button button-primary"
            ${
                alreadyPlanned
                    ? "disabled"
                    : ""
            }
        >

            ${
                alreadyPlanned
                    ? "✓ Bereits im Wochenplan"
                    : "Zum Wochenplan hinzufügen"
            }

        </button>

    `;


    const addButton =
        document.getElementById(
            "add-recipe-to-plan"
        );


    if (!alreadyPlanned) {

        addButton.addEventListener(
            "click",
            () => {

                addRecipeToPlan(recipe);

                addButton.textContent =
                    "✓ Zum Wochenplan hinzugefügt";

                addButton.disabled =
                    true;

            }
        );

    }


    modal.hidden = false;

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "modal-open"
    );

}


function closeRecipe() {

    const modal =
        document.getElementById(
            "recipe-modal"
        );


    modal.hidden = true;

    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "modal-open"
    );

}


/* =========================================
   WOCHENPLAN
   ========================================= */

function addRecipeToPlan(recipe) {

    const exists =
        weeklyPlan.some(
            item =>
                item.recipeId === recipe.id
        );


    if (exists) {
        return;
    }


    weeklyPlan.push({

        recipeId:
            recipe.id,

        servings:
            recipe.servings || 1

    });


    saveWeeklyPlan();

    updatePlanCount();

    renderWeeklyPlan();

}


function removeRecipeFromPlan(
    recipeId
) {

    weeklyPlan =
        weeklyPlan.filter(
            item =>
                item.recipeId !== recipeId
        );


    saveWeeklyPlan();

    updatePlanCount();

    renderWeeklyPlan();

    renderShoppingList();

}


function changeServings(
    recipeId,
    amount
) {

    const item =
        weeklyPlan.find(
            planItem =>
                planItem.recipeId === recipeId
        );


    if (!item) {
        return;
    }


    item.servings =
        Math.max(
            1,
            item.servings + amount
        );


    saveWeeklyPlan();

    renderWeeklyPlan();

    renderShoppingList();

}


/* =========================================
   WOCHENPLAN DARSTELLEN
   ========================================= */

function renderWeeklyPlan() {

    const container =
        document.getElementById(
            "weekly-plan"
        );


    const empty =
        document.getElementById(
            "empty-plan"
        );


    container.innerHTML = "";


    empty.hidden =
        weeklyPlan.length !== 0;


    weeklyPlan.forEach(item => {

        const recipe =
            recipes.find(
                recipe =>
                    recipe.id ===
                    item.recipeId
            );


        if (!recipe) {
            return;
        }


        const element =
            document.createElement(
                "article"
            );


        element.className =
            "plan-item";


        element.innerHTML = `

            <img
                src="rezepte/${recipe.image}"
                alt="${escapeHtml(
                    recipe.title
                )}"
                class="plan-image"
            >


            <div>

                <h3 class="plan-title">

                    ${escapeHtml(
                        recipe.title
                    )}

                </h3>


                <div class="portion-control">

                    <button
                        class="portion-button"
                        data-action="minus"
                    >
                        −
                    </button>


                    <span
                        class="portion-value"
                    >
                        ${item.servings}
                        ${
                            item.servings === 1
                                ? "Portion"
                                : "Portionen"
                        }
                    </span>


                    <button
                        class="portion-button"
                        data-action="plus"
                    >
                        +
                    </button>

                </div>

            </div>


            <button
                class="remove-plan-item"
                aria-label="Gericht entfernen"
            >
                ×
            </button>

        `;


        element
            .querySelector(
                '[data-action="minus"]'
            )
            .addEventListener(
                "click",
                () => changeServings(
                    recipe.id,
                    -1
                )
            );


        element
            .querySelector(
                '[data-action="plus"]'
            )
            .addEventListener(
                "click",
                () => changeServings(
                    recipe.id,
                    1
                )
            );


        element
            .querySelector(
                ".remove-plan-item"
            )
            .addEventListener(
                "click",
                () => removeRecipeFromPlan(
                    recipe.id
                )
            );


        container.appendChild(element);

    });


    updatePlanCount();

}


/* =========================================
   WOCHENPLAN SPEICHERN
   ========================================= */

function saveWeeklyPlan() {

    localStorage.setItem(
        "kochbuch-weekly-plan",
        JSON.stringify(
            weeklyPlan
        )
    );

}


function loadWeeklyPlan() {

    const saved =
        localStorage.getItem(
            "kochbuch-weekly-plan"
        );


    if (!saved) {
        return;
    }


    try {

        weeklyPlan =
            JSON.parse(saved);


    } catch (error) {

        console.error(
            "Wochenplan konnte nicht geladen werden.",
            error
        );

        weeklyPlan = [];

    }

}


function updatePlanCount() {

    document
        .getElementById("plan-count")
        .textContent =
            weeklyPlan.length;

}


/* =========================================
   EINKAUFSLISTE
   ========================================= */

function generateShoppingList() {

    const summed = {};

    const unsummed = [];


    weeklyPlan.forEach(planItem => {

        const recipe =
            recipes.find(
                item =>
                    item.id ===
                    planItem.recipeId
            );


        if (!recipe) {
            return;
        }


        const originalServings =
            recipe.servings || 1;


        const multiplier =
            planItem.servings /
            originalServings;


        recipe.ingredients.forEach(
            ingredient => {

                const unit =
                    ingredient.unit;


                /*
                 * Summierbare Einheiten
                 */

                if (
                    isSummableUnit(unit)
                ) {

                    const key =
                        `${ingredient.name}|${unit}`;


                    if (!summed[key]) {

                        summed[key] = {

                            name:
                                ingredient.name,

                            amount: 0,

                            unit,

                            category:
                                ingredient.category ||
                                "Sonstiges"

                        };

                    }


                    summed[key].amount +=
                        ingredient.amount *
                        multiplier;

                }


                /*
                 * Nicht summierbare Einheiten
                 */

                else {

                    unsummed.push({

                        name:
                            ingredient.name,

                        amount:
                            ingredient.amount *
                            multiplier,

                        unit,

                        category:
                            ingredient.category ||
                            "Sonstiges"

                    });

                }

            }
        );

    });


    return [
        ...Object.values(summed),
        ...unsummed
    ];

}


/* =========================================
   SUMMIERBARE EINHEITEN
   ========================================= */

function isSummableUnit(unit) {

    const units = [

        "g",
        "kg",

        "ml",
        "l",

        "EL",
        "TL",

        "Stück"

    ];


    return units.includes(unit);

}


/* =========================================
   EINKAUFSLISTE RENDERN
   ========================================= */

function renderShoppingList() {

    const container =
        document.getElementById(
            "shopping-list"
        );


    const ingredients =
        generateShoppingList();


    container.innerHTML = "";


    if (
        ingredients.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-state">

                <p>
                    Dein Wochenplan ist noch leer.
                </p>

            </div>

        `;

        return;

    }


    /*
     * Nach Kategorie gruppieren
     */

    const categories = {};


    ingredients.forEach(
        ingredient => {

            const category =
                ingredient.category ||
                "Sonstiges";


            if (!categories[category]) {

                categories[category] = [];

            }


            categories[category]
                .push(ingredient);

        }
    );


    Object.entries(categories)
        .forEach(
            ([category, items]) => {

                const section =
                    document.createElement(
                        "section"
                    );


                section.className =
                    "shopping-category";


                section.innerHTML = `

                    <h2>
                        ${escapeHtml(
                            category
                        )}
                    </h2>

                `;


                items.forEach(
                    (ingredient, index) => {

                        const label =
                            document.createElement(
                                "label"
                            );


                        label.className =
                            "shopping-item";


                        const amount =
                            formatAmount(
                                ingredient.amount
                            );


                        label.innerHTML = `

                            <input
                                type="checkbox"
                                data-shopping-item
                            >


                            <span>

                                ${escapeHtml(
                                    ingredient.name
                                )}

                            </span>


                            <span
                                class="shopping-amount"
                            >

                                ${amount}
                                ${escapeHtml(
                                    ingredient.unit
                                )}

                            </span>

                        `;


                        const checkbox =
                            label.querySelector(
                                "input"
                            );


                        checkbox.addEventListener(
                            "change",
                            () => {

                                label.classList.toggle(
                                    "checked",
                                    checkbox.checked
                                );

                            }
                        );


                        section.appendChild(
                            label
                        );

                    }
                );


                container.appendChild(
                    section
                );

            }
        );

}


/* =========================================
   EINKAUFSLISTE ZURÜCKSETZEN
   ========================================= */

function setupClearButtons() {

    document
        .getElementById(
            "clear-plan"
        )
        .addEventListener(
            "click",
            () => {

                if (
                    weeklyPlan.length === 0
                ) {
                    return;
                }


                weeklyPlan = [];

                saveWeeklyPlan();

                renderWeeklyPlan();

                renderShoppingList();

            }
        );


    document
        .getElementById(
            "clear-shopping-list"
        )
        .addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        "[data-shopping-item]"
                    )
                    .forEach(
                        checkbox => {

                            checkbox.checked =
                                false;


                            checkbox
                                .closest(
                                    ".shopping-item"
                                )
                                .classList
                                .remove(
                                    "checked"
                                );

                        }
                    );

            }
        );

}


/* =========================================
   HILFSFUNKTIONEN
   ========================================= */

function formatAmount(amount) {

    if (
        Number.isInteger(amount)
    ) {

        return amount;

    }


    return Number(
        amount.toFixed(2)
    );

}


function escapeHtml(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}
