const recipeList = document.getElementById("recipe-list");
const searchInput = document.getElementById("search");
const tagsContainer = document.getElementById("tags");

const modal = document.getElementById("recipe-modal");
const modalContent = document.getElementById("recipe-detail");
const closeModal = document.getElementById("close-modal");


let recipes = [];
let activeTag = null;


/* =========================
   REZEPTE LADEN
========================= */

async function loadRecipes() {

    try {

        const response = await fetch("./rezepte/index.json");

        if (!response.ok) {
            throw new Error(
                `Rezeptindex konnte nicht geladen werden: ${response.status}`
            );
        }

        const recipeIndex = await response.json();


        /*
         * Jedes Rezept aus dem Index laden
         */

        const loadedRecipes = await Promise.all(

            recipeIndex.map(async entry => {

                const folder = entry.folder;

                const response = await fetch(
                    `./rezepte/${folder}/rezept.json`
                );

                if (!response.ok) {

                    console.error(
                        `Rezept konnte nicht geladen werden: ${folder}`
                    );

                    return null;
                }

                const recipe = await response.json();


                return {

                    ...recipe,

                    folder: folder,

                    image:
                        recipe.image
                            ? `./rezepte/${folder}/${recipe.image}`
                            : null

                };

            })

        );


        recipes = loadedRecipes.filter(Boolean);


        renderTags();

        renderRecipes(recipes);


    } catch (error) {

        console.error(error);

        recipeList.innerHTML = `
            <div class="empty">

                <h3>Rezepte konnten nicht geladen werden.</h3>

                <p>
                    Prüfe die Datei
                    <strong>rezepte/index.json</strong>
                    und die Ordnerstruktur.
                </p>

            </div>
        `;
    }
}


/* =========================
   REZEPTE ANZEIGEN
========================= */

function renderRecipes(recipeData) {

    if (recipeData.length === 0) {

        recipeList.innerHTML = `
            <p class="empty">
                Keine Rezepte gefunden.
            </p>
        `;

        return;
    }


    recipeList.innerHTML = recipeData
        .map(recipe => {

            const tags = recipe.tags || [];


            const tagHTML = tags
                .map(tag => `
                    <span class="recipe-card-tag">
                        ${escapeHtml(tag)}
                    </span>
                `)
                .join("");


            return `

                <article
                    class="recipe-card"
                    data-folder="${escapeHtml(recipe.folder)}"
                >

                    ${
                        recipe.image
                            ? `
                                <img
                                    class="recipe-image"
                                    src="${escapeHtml(recipe.image)}"
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
                            ${escapeHtml(recipe.description || "")}
                        </p>


                        <div class="recipe-card-tags">
                            ${tagHTML}
                        </div>

                    </div>

                </article>

            `;

        })
        .join("");


    document
        .querySelectorAll(".recipe-card")
        .forEach(card => {

            card.addEventListener("click", () => {

                openRecipe(card.dataset.folder);

            });

        });
}


/* =========================
   TAGS
========================= */

function renderTags() {

    const allTags = recipes.flatMap(
        recipe => recipe.tags || []
    );


    const uniqueTags = [
        ...new Set(allTags)
    ].sort();


    tagsContainer.innerHTML = "";


    if (uniqueTags.length === 0) {
        return;
    }


    const allButton = document.createElement("button");

    allButton.className = "tag-button active";

    allButton.textContent = "Alle";

    allButton.addEventListener("click", () => {

        activeTag = null;

        updateTagButtons();

        filterRecipes();

    });

    tagsContainer.appendChild(allButton);


    uniqueTags.forEach(tag => {

        const button = document.createElement("button");

        button.className = "tag-button";

        button.textContent = tag;

        button.dataset.tag = tag;


        button.addEventListener("click", () => {

            activeTag = tag;

            updateTagButtons();

            filterRecipes();

        });


        tagsContainer.appendChild(button);

    });
}


function updateTagButtons() {

    document
        .querySelectorAll(".tag-button")
        .forEach(button => {

            if (
                activeTag === null &&
                button.textContent === "Alle"
            ) {

                button.classList.add("active");

            } else if (
                button.dataset.tag === activeTag
            ) {

                button.classList.add("active");

            } else {

                button.classList.remove("active");

            }

        });
}


/* =========================
   SUCHE + FILTER
========================= */

function filterRecipes() {

    const searchTerm =
        searchInput.value
            .toLowerCase()
            .trim();


    const filtered = recipes.filter(recipe => {

        const searchableText = `

            ${recipe.name || ""}

            ${recipe.description || ""}

            ${(recipe.tags || []).join(" ")}

        `.toLowerCase();


        const matchesSearch =
            searchableText.includes(searchTerm);


        const matchesTag =
            activeTag === null ||
            (recipe.tags || []).includes(activeTag);


        return matchesSearch && matchesTag;

    });


    renderRecipes(filtered);
}


searchInput.addEventListener(
    "input",
    filterRecipes
);


/* =========================
   EINZELNES REZEPT
========================= */

async function openRecipe(folder) {

    try {

        const response = await fetch(
            `./rezepte/${folder}/rezept.json`
        );


        if (!response.ok) {
            throw new Error("Rezept konnte nicht geladen werden.");
        }


        const recipe = await response.json();


        const image =
            recipe.image
                ? `
                    <img
                        class="recipe-detail-image"
                        src="./rezepte/${folder}/${recipe.image}"
                        alt="${escapeHtml(recipe.name)}"
                    >
                  `
                : "";


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
                .map(ingredient => `
                    <li>
                        ${escapeHtml(ingredient)}
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

            ${image}


            <div class="recipe-detail-content">

                <div class="recipe-detail">

                    <h2>
                        ${escapeHtml(recipe.name)}
                    </h2>


                    <p class="recipe-description">
                        ${escapeHtml(recipe.description || "")}
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


        modal.classList.remove("hidden");

        document.body.style.overflow = "hidden";


    } catch (error) {

        console.error(error);

        modalContent.innerHTML = `

            <div class="recipe-detail-content">

                <h2>
                    Rezept konnte nicht geladen werden
                </h2>

                <p>
                    Der Ordner
                    <strong>${escapeHtml(folder)}</strong>
                    konnte nicht geladen werden.
                </p>

            </div>

        `;

        modal.classList.remove("hidden");
    }
}


/* =========================
   MODAL SCHLIESSEN
========================= */

function closeRecipeModal() {

    modal.classList.add("hidden");

    document.body.style.overflow = "";
}


closeModal.addEventListener(
    "click",
    closeRecipeModal
);


modal.addEventListener("click", event => {

    if (event.target === modal) {
        closeRecipeModal();
    }

});


document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
        closeRecipeModal();
    }

});


/* =========================
   HTML SICHER DARSTELLEN
========================= */

function escapeHtml(value) {

    const div = document.createElement("div");

    div.textContent = String(value ?? "");

    return div.innerHTML;
}


/* =========================
   START
========================= */

loadRecipes();