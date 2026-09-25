let recipes = [];

let activeTag = "Alle";

let weeklyPlan = {
    Montag: null,
    Dienstag: null,
    Mittwoch: null,
    Donnerstag: null,
    Freitag: null,
    Samstag: null,
    Sonntag: null
};


/*
|--------------------------------------------------------------------------
| INITIALISIERUNG
|--------------------------------------------------------------------------
*/

document.addEventListener("DOMContentLoaded", async () => {

    await loadRecipes();

    loadWeeklyPlan();

    setupSearch();

    setupTagFilter();

    setupWeekPlan();

    setupClearButtons();

    renderRecipes();

    renderWeeklyPlan();

    renderShoppingList();

});


/*
|--------------------------------------------------------------------------
| REZEPTE LADEN
|--------------------------------------------------------------------------
*/

async function loadRecipes() {

    try {

        const response = await fetch("rezepte/index.json");

        if (!response.ok) {
            throw new Error("Rezeptindex konnte nicht geladen werden.");
        }

        const data = await response.json();

        recipes = data.recipes || [];

    } catch (error) {

        console.error(error);

        const grid =
            document.getElementById("recipe-grid");

        grid.innerHTML = `
            <p>
                Die Rezepte konnten nicht geladen werden.
            </p>
        `;
    }
}


/*
|--------------------------------------------------------------------------
| SUCHE
|--------------------------------------------------------------------------
*/

function setupSearch() {

    const searchInput =
        document.getElementById("search");

    searchInput.addEventListener(
        "input",
        () => {

            renderRecipes();

        }
    );
}


/*
|--------------------------------------------------------------------------
| TAG FILTER
|--------------------------------------------------------------------------
*/

function setupTagFilter() {

    const buttons =
        document.querySelectorAll(".tag-button");

    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                activeTag =
                    button.dataset.tag;

                buttons.forEach(btn => {
                    btn.classList.remove("active");
                });

                button.classList.add("active");

                renderRecipes();

            }
        );

    });
}


/*
|--------------------------------------------------------------------------
| REZEPTE FILTERN
|--------------------------------------------------------------------------
*/

function getFilteredRecipes() {

    const search =
        document
            .getElementById("search")
            .value
            .trim()
            .toLowerCase();


    return recipes.filter(recipe => {

        /*
         * Tag prüfen
         */

        const matchesTag =
            activeTag === "Alle" ||
            recipe.tags.includes(activeTag);


        /*
         * Suchbegriff prüfen
         */

        if (!search) {
            return matchesTag;
        }


        const title =
            recipe.title.toLowerCase();

        const description =
            (recipe.description || "")
                .toLowerCase();

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


        return matchesTag && matchesSearch;

    });

}


/*
|--------------------------------------------------------------------------
| REZEPTE DARSTELLEN
|--------------------------------------------------------------------------
*/

function renderRecipes() {

    const grid =
        document.getElementById("recipe-grid");

    const noResults =
        document.getElementById("no-results");

    const count =
        document.getElementById("recipe-count");


    const filtered =
        getFilteredRecipes();


    grid.innerHTML = "";


    count.textContent =
        `${filtered.length} Rezept${
            filtered.length === 1 ? "" : "e"
        }`;


    noResults.hidden =
        filtered.length !== 0;


    filtered.forEach(recipe => {

        const card =
            document.createElement("article");

        card.className =
            "recipe-card";


        card.innerHTML = `

            <a href="rezepte/${recipe.path}">

                <img
                    src="rezepte/${recipe.image}"
                    alt="${escapeHtml(recipe.title)}"
                    class="recipe-image"
                >

                <div class="recipe-content">

                    <h3 class="recipe-title">
                        ${escapeHtml(recipe.title)}
                    </h3>

                    <p class="recipe-description">
                        ${escapeHtml(recipe.description || "")}
                    </p>

                    <div class="recipe-tags">

                        ${recipe.tags.map(tag => `
                            <span class="recipe-tag">
                                ${escapeHtml(tag)}
                            </span>
                        `).join("")}

                    </div>

                </div>

            </a>

        `;


        /*
         * Rezept per Klick in Wochenplan aufnehmen
         */

        const addButton =
            document.createElement("button");

        addButton.textContent =
            "Zum Wochenplan";


        addButton.className =
            "button";


        addButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                openWeekPlanSelector(recipe);

            }
        );


        card
            .querySelector(".recipe-content")
            .appendChild(addButton);


        grid.appendChild(card);

    });

}


/*
|--------------------------------------------------------------------------
| WOCHENPLAN
|--------------------------------------------------------------------------
*/

function setupWeekPlan() {

    document
        .querySelectorAll(".meal-slot")
        .forEach(slot => {

            slot.addEventListener(
                "click",
                () => {

                    /*
                     * Später kann hier ein Rezeptauswahldialog
                     * geöffnet werden.
                     */

                }
            );

        });

}


function openWeekPlanSelector(recipe) {

    const day =
        prompt(
            `Für welchen Tag möchtest du "${recipe.title}" einplanen?\n\n` +
            `Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag oder Sonntag`
        );


    if (!day) {
        return;
    }


    const normalized =
        normalizeDay(day);


    if (!normalized) {

        alert(
            "Bitte einen gültigen Wochentag eingeben."
        );

        return;

    }


    weeklyPlan[normalized] =
        recipe.id;


    saveWeeklyPlan();

    renderWeeklyPlan();

    renderShoppingList();

}


/*
|--------------------------------------------------------------------------
| WOCHENPLAN DARSTELLEN
|--------------------------------------------------------------------------
*/

function renderWeeklyPlan() {

    document
        .querySelectorAll(".meal-slot")
        .forEach(slot => {

            const day =
                slot.dataset.slot;

            const recipeId =
                weeklyPlan[day];


            if (!recipeId) {

                slot.innerHTML = `
                    <span class="empty-slot">
                        Noch kein Gericht
                    </span>
                `;

                return;

            }


            const recipe =
                recipes.find(
                    item => item.id === recipeId
                );


            if (!recipe) {
                return;
            }


            slot.innerHTML = `

                <div class="planned-meal">

                    <a
                        href="rezepte/${recipe.path}"
                    >
                        ${escapeHtml(recipe.title)}
                    </a>

                    <br>

                    <button
                        class="remove-meal"
                        data-day="${day}"
                    >
                        Entfernen
                    </button>

                </div>

            `;


            slot
                .querySelector(".remove-meal")
                .addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        weeklyPlan[day] =
                            null;

                        saveWeeklyPlan();

                        renderWeeklyPlan();

                        renderShoppingList();

                    }
                );

        });

}


/*
|--------------------------------------------------------------------------
| WOCHENPLAN SPEICHERN
|--------------------------------------------------------------------------
*/

function saveWeeklyPlan() {

    localStorage.setItem(
        "kochbuch-weekly-plan",
        JSON.stringify(weeklyPlan)
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

        const parsed =
            JSON.parse(saved);

        weeklyPlan = {
            ...weeklyPlan,
            ...parsed
        };

    } catch (error) {

        console.error(
            "Wochenplan konnte nicht geladen werden.",
            error
        );

    }

}


/*
|--------------------------------------------------------------------------
| EINKAUFSLISTE
|--------------------------------------------------------------------------
*/

function generateShoppingList() {

    const ingredients = {};


    Object.values(weeklyPlan)
        .forEach(recipeId => {

            if (!recipeId) {
                return;
            }


            const recipe =
                recipes.find(
                    item => item.id === recipeId
                );


            if (!recipe) {
                return;
            }


            recipe.ingredients.forEach(
                ingredient => {

                    const key =
                        `${ingredient.name}|${ingredient.unit}`;


                    if (!ingredients[key]) {

                        ingredients[key] = {
                            name: ingredient.name,
                            amount: 0,
                            unit: ingredient.unit
                        };

                    }


                    /*
                     * Summierbare Mengen
                     */

                    if (
                        isSummableUnit(
                            ingredient.unit
                        )
                    ) {

                        ingredients[key].amount +=
                            Number(
                                ingredient.amount
                            );

                    } else {

                        /*
                         * Nicht summierbare Einheiten
                         * werden separat behandelt.
                         */

                        ingredients[key].amount = null;

                    }

                }
            );

        });


    return Object.values(ingredients);

}


/*
|--------------------------------------------------------------------------
| SUMMIERBARE EINHEITEN
|--------------------------------------------------------------------------
*/

function isSummableUnit(unit) {

    const summableUnits = [

        "g",
        "kg",

        "ml",
        "l",

        "TL",
        "EL",

        "Stück"

    ];


    return summableUnits.includes(unit);

}


/*
|--------------------------------------------------------------------------
| EINKAUFSLISTE DARSTELLEN
|--------------------------------------------------------------------------
*/

function renderShoppingList() {

    const container =
        document.getElementById(
            "shopping-list"
        );


    const ingredients =
        generateShoppingList();


    if (ingredients.length === 0) {

        container.innerHTML = `
            <p>
                Plane Gerichte für deine Woche,
                um eine Einkaufsliste zu erstellen.
            </p>
        `;

        return;

    }


    container.innerHTML = "";


    ingredients.forEach(
        (ingredient, index) => {

            const item =
                document.createElement("label");


            item.className =
                "shopping-item";


            const amount =
                ingredient.amount === null
                    ? ""
                    : `${formatAmount(ingredient.amount)} ${ingredient.unit}`;


            item.innerHTML = `

                <input
                    type="checkbox"
                    id="shopping-${index}"
                >

                <span>
                    ${escapeHtml(ingredient.name)}
                </span>

                <span class="shopping-amount">
                    ${amount}
                </span>

            `;


            const checkbox =
                item.querySelector("input");


            checkbox.addEventListener(
                "change",
                () => {

                    item.classList.toggle(
                        "checked",
                        checkbox.checked
                    );

                }
            );


            container.appendChild(item);

        }
    );

}


/*
|--------------------------------------------------------------------------
| CLEAR BUTTONS
|--------------------------------------------------------------------------
*/

function setupClearButtons() {

    const clearPlan =
        document.getElementById(
            "clear-plan"
        );


    clearPlan.addEventListener(
        "click",
        () => {

            weeklyPlan = {
                Montag: null,
                Dienstag: null,
                Mittwoch: null,
                Donnerstag: null,
                Freitag: null,
                Samstag: null,
                Sonntag: null
            };


            saveWeeklyPlan();

            renderWeeklyPlan();

            renderShoppingList();

        }
    );


    const clearShoppingList =
        document.getElementById(
            "clear-shopping-list"
        );


    clearShoppingList.addEventListener(
        "click",
        () => {

            document
                .querySelectorAll(
                    ".shopping-item input"
                )
                .forEach(input => {

                    input.checked = false;

                    input
                        .closest(".shopping-item")
                        .classList
                        .remove("checked");

                });

        }
    );

}


/*
|--------------------------------------------------------------------------
| HILFSFUNKTIONEN
|--------------------------------------------------------------------------
*/

function normalizeDay(day) {

    const days = {
        "montag": "Montag",
        "dienstag": "Dienstag",
        "mittwoch": "Mittwoch",
        "donnerstag": "Donnerstag",
        "freitag": "Freitag",
        "samstag": "Samstag",
        "sonntag": "Sonntag"
    };


    return days[
        day.trim().toLowerCase()
    ] || null;

}


function formatAmount(amount) {

    if (Number.isInteger(amount)) {
        return amount;
    }

    return Number(
        amount.toFixed(2)
    );

}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}
