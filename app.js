const recipeList = document.getElementById("recipe-list");
const searchInput = document.getElementById("search");

const modal = document.getElementById("recipe-modal");
const modalContent = document.getElementById("recipe-detail");
const closeModal = document.getElementById("close-modal");

let recipes = [];

async function loadRecipes() {
    try {
        const response = await fetch("rezepte/index.json");

        if (!response.ok) {
            throw new Error("Rezeptliste konnte nicht geladen werden.");
        }

        const recipeIndex = await response.json();

        recipes = recipeIndex;
        renderRecipes(recipes);
    } catch (error) {
        console.error(error);

        recipeList.innerHTML = `
            <p class="empty">
                Die Rezepte konnten nicht geladen werden.
            </p>
        `;
    }
}

function renderRecipes(recipeData) {
    if (recipeData.length === 0) {
        recipeList.innerHTML = `
            <p class="empty">Keine Rezepte gefunden.</p>
        `;
        return;
    }

    recipeList.innerHTML = recipeData
        .map(recipe => `
            <article
                class="recipe-card"
                data-file="${recipe.file}"
            >
                <h3>${escapeHtml(recipe.name)}</h3>
                <p>${escapeHtml(recipe.description || "")}</p>

                <div class="recipe-meta">
                    <span>${escapeHtml(recipe.category || "")}</span>
                    <span>${escapeHtml(recipe.duration || "")}</span>
                </div>
            </article>
        `)
        .join("");

    document.querySelectorAll(".recipe-card").forEach(card => {
        card.addEventListener("click", () => {
            openRecipe(card.dataset.file);
        });
    });
}

async function openRecipe(file) {
    try {
        const response = await fetch(`rezepte/${file}`);

        if (!response.ok) {
            throw new Error("Rezept konnte nicht geladen werden.");
        }

        const recipe = await response.json();

        modalContent.innerHTML = `
            <div class="recipe-detail">
                <h2>${escapeHtml(recipe.name)}</h2>

                <p class="recipe-description">
                    ${escapeHtml(recipe.description || "")}
                </p>

                <div class="recipe-meta">
                    <span>${escapeHtml(recipe.portions || "")}</span>
                    <span>${escapeHtml(recipe.duration || "")}</span>
                </div>

                <h3>Zutaten</h3>

                <ul>
                    ${recipe.ingredients
                        .map(ingredient => `
                            <li>
                                ${escapeHtml(ingredient)}
                            </li>
                        `)
                        .join("")}
                </ul>

                <h3>Zubereitung</h3>

                <ol>
                    ${recipe.steps
                        .map(step => `
                            <li>
                                ${escapeHtml(step)}
                            </li>
                        `)
                        .join("")}
                </ol>
            </div>
        `;

        modal.classList.remove("hidden");
    } catch (error) {
        console.error(error);
        alert("Das Rezept konnte nicht geladen werden.");
    }
}

searchInput.addEventListener("input", event => {
    const searchTerm = event.target.value.toLowerCase().trim();

    const filteredRecipes = recipes.filter(recipe => {
        return (
            recipe.name.toLowerCase().includes(searchTerm) ||
            (recipe.description || "").toLowerCase().includes(searchTerm) ||
            (recipe.category || "").toLowerCase().includes(searchTerm)
        );
    });

    renderRecipes(filteredRecipes);
});

closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
});

modal.addEventListener("click", event => {
    if (event.target === modal) {
        modal.classList.add("hidden");
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        modal.classList.add("hidden");
    }
});

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

loadRecipes();