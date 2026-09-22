const recipeList = document.getElementById("recipe-list");
const searchInput = document.getElementById("search");
const tagsContainer = document.getElementById("tags");

const modal = document.getElementById("recipe-modal");
const modalContent = document.getElementById("recipe-detail");
const closeModal = document.getElementById("close-modal");

let recipes = [];
let activeTag = null;


/*
 * Ermittelt den Pfad relativ zur GitHub-Pages-Seite.
 */
function getBasePath() {
    return window.location.pathname
        .replace(/\/[^/]*$/, "/");
}


/*
 * URL für Dateien erzeugen.
 */
function fileUrl(path) {

    return new URL(
        path,
        window.location.origin + getBasePath()
    ).href;
}


/*
 * Alle Rezepte laden
 */
async function loadRecipes() {

    try {

        const indexUrl = fileUrl("rezepte/index.json");

        console.log("Lade Rezeptindex:", indexUrl);

        const response = await fetch(indexUrl);

        if (!response.ok) {
            throw new Error(
                `index.json konnte nicht geladen werden (${response.status})`
            );
        }

        const index = await response.json();


        const loadedRecipes = await Promise.all(

            index.map(async item => {

                try {

                    const recipeUrl = fileUrl(item.file);

                    console.log(
                        "Lade Rezept:",
                        recipeUrl
                    );


                    const response =
                        await fetch(recipeUrl);


                    if (!response.ok) {

                        console.error(
                            "Rezept nicht gefunden:",
                            recipeUrl
                        );

                        return null;
                    }


                    const recipe =
                        await response.json();


                    return recipe;

                } catch (error) {

                    console.error(
                        "Fehler beim Rezept:",
                        item.file,
                        error
                    );

                    return null;
                }

            })

        );


        recipes =
            loadedRecipes.filter(Boolean);


        if (recipes.length === 0) {

            throw new Error(
                "Keine Rezepte gefunden."
            );
        }


        renderTags();

        renderRecipes(recipes);

    }

    catch (error) {

        console.error(error);


        recipeList.innerHTML = `

            <div class="empty">

                <h3>
                    Rezepte konnten nicht geladen werden.
                </h3>

                <p>
                    Fehler:
                    ${escapeHtml(error.message)}
                </p>

                <p>
                    Öffne die Entwicklerkonsole des Browsers
                    für weitere Informationen.
                </p>

            </div>

        `;
    }
}


/*
 * Rezepte anzeigen
 */
function renderRecipes(recipeData) {

    if (!recipeData.length) {

        recipeList.innerHTML =
            `<p class="empty">
                Keine Rezepte gefunden.
            </p>`;

        return;
    }


    recipeList.innerHTML =
        recipeData.map(recipe => {

            const tags =
                (recipe.tags || [])
                    .map(tag => `
                        <span class="recipe-card-tag">
                            ${escapeHtml(tag)}
                        </span>
                    `)
                    .join("");


            return `

                <article
                    class="recipe-card"
                    data-recipe="${escapeHtml(
                        recipe.name
                    )}"
                >

                    ${
                        recipe.image
                            ? `
                                <img
                                    class="recipe-image"
                                    src="${fileUrl(recipe.image)}"
                                    alt="${escapeHtml(recipe.name)}"
                                    loading="lazy"
                                >
                              `
                            : ""
                    }


                    <div class="recipe-card-content">

                        <h2>
                            ${escapeHtml(recipe.name)}
                        </h2>

                        <p>
                            ${escapeHtml(
                                recipe.description || ""
                            )}
                        </p>

                        <div class="recipe-card-tags">
                            ${tags}
                        </div>

                    </div>

                </article>
            `;

        }).join("");


    document
        .querySelectorAll(".recipe-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const recipe =
                        recipes.find(
                            item =>
                                item.name ===
                                card.dataset.recipe
                        );

                    if (recipe) {
                        openRecipe(recipe);
                    }

                }
            );

        });
}


/*
 * Tags erzeugen
 */
function renderTags() {

    const allTags =
        recipes.flatMap(
            recipe => recipe.tags || []
        );


    const uniqueTags =
        [...new Set(allTags)].sort();


    tagsContainer.innerHTML = "";


    const allButton =
        document.createElement("button");


    allButton.className =
        "tag-button active";


    allButton.textContent = "Alle";


    allButton.onclick = () => {

        activeTag = null;

        updateTagButtons();

        filterRecipes();
    };


    tagsContainer.appendChild(
        allButton
    );


    uniqueTags.forEach(tag => {

        const button =
            document.createElement("button");


        button.className =
            "tag-button";


        button.textContent =
            tag;


        button.dataset.tag =
            tag;


        button.onclick = () => {

            activeTag = tag;

            updateTagButtons();

            filterRecipes();
        };


        tagsContainer.appendChild(
            button
        );

    });
}


/*
 * Aktiven Tag markieren
 */
function updateTagButtons() {

    document
        .querySelectorAll(".tag-button")
        .forEach(button => {

            button.classList.remove(
                "active"
            );


            if (
                activeTag === null &&
                button.textContent === "Alle"
            ) {

                button.classList.add(
                    "active"
                );

            }


            if (
                button.dataset.tag ===
                activeTag
            ) {

                button.classList.add(
                    "active"
                );
            }

        });
}


/*
 * Suche
 */
searchInput.addEventListener(
    "input",
    filterRecipes
);


function filterRecipes() {

    const search =
        searchInput.value
            .toLowerCase()
            .trim();


    const filtered =
        recipes.filter(recipe => {

            const text = `

                ${recipe.name}

                ${recipe.description || ""}

                ${(recipe.tags || []).join(" ")}

            `.toLowerCase();


            const matchesSearch =
                text.includes(search);


            const matchesTag =
                activeTag === null ||
                (recipe.tags || [])
                    .includes(activeTag);


            return (
                matchesSearch &&
                matchesTag
            );

        });


    renderRecipes(filtered);
}


/*
 * Rezept öffnen
 */
function openRecipe(recipe) {

    const tags =
        (recipe.tags || [])
            .map(tag => `
                <span class="detail-tag">
                    ${escapeHtml(tag)}
                </span>
            `)
            .join("");


    const ingredients =
        (recipe.ingredients || [])
            .map(item => `
                <li>
                    ${escapeHtml(item)}
                </li>
            `)
            .join("");


    const steps =
        (recipe.steps || [])
            .map(step => `
                <li>
                    ${escapeHtml(step)}
                </li>
            `)
            .join("");


    modalContent.innerHTML = `

        ${
            recipe.image
                ? `
                    <img
                        class="recipe-detail-image"
                        src="${fileUrl(recipe.image)}"
                        alt="${escapeHtml(recipe.name)}"
                    >
                  `
                : ""
        }


        <div class="recipe-detail-content">

            <div class="recipe-detail">

                <h2>
                    ${escapeHtml(recipe.name)}
                </h2>


                <p class="recipe-description">
                    ${escapeHtml(
                        recipe.description || ""
                    )}
                </p>


                <div class="detail-tags">
                    ${tags}
                </div>


                <h3>
                    Zutaten
                </h3>

                <ul>
                    ${ingredients}
                </ul>


                <h3>
                    Zubereitung
                </h3>

                <ol>
                    ${steps}
                </ol>

            </div>

        </div>

    `;


    modal.classList.remove(
        "hidden"
    );

    document.body.style.overflow =
        "hidden";
}


/*
 * Modal schließen
 */
function closeRecipe() {

    modal.classList.add(
        "hidden"
    );

    document.body.style.overflow =
        "";
}


closeModal.onclick =
    closeRecipe;


modal.onclick = event => {

    if (event.target === modal) {
        closeRecipe();
    }

};


document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {
            closeRecipe();
        }

    }
);


/*
 * HTML sicher ausgeben
 */
function escapeHtml(value) {

    const element =
        document.createElement("div");

    element.textContent =
        String(value ?? "");

    return element.innerHTML;
}


/*
 * START
 */
loadRecipes();