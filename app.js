let recipes = [];


document.addEventListener("DOMContentLoaded", async function () {
    await loadRecipes();
});


async function loadRecipes() {
    try {
        const indexResponse = await fetch("rezepte/index.json");

        if (!indexResponse.ok) {
            throw new Error("Die Rezeptliste konnte nicht geladen werden.");
        }

        const recipeFiles = await indexResponse.json();

        recipes = [];

        for (const file of recipeFiles) {
            const response = await fetch("rezepte/" + file);

            if (!response.ok) {
                console.error("Rezept konnte nicht geladen werden:", file);
                continue;
            }

            const recipe = await response.json();
            recipes.push(recipe);
        }

        renderRecipes();

    } catch (error) {
        console.error("Fehler beim Laden der Rezepte:", error);

        const recipeGrid = document.getElementById("recipeGrid");

        if (recipeGrid) {
            recipeGrid.innerHTML = `
                <p>Die Rezepte konnten leider nicht geladen werden.</p>
            `;
        }
    }
}


function renderRecipes() {
    const recipeGrid = document.getElementById("recipeGrid");

    if (!recipeGrid) {
        return;
    }

    if (recipes.length === 0) {
        recipeGrid.innerHTML = `
            <p>Noch keine Rezepte vorhanden.</p>
        `;
        return;
    }

    recipeGrid.innerHTML = recipes.map(function (recipe) {
        return `
            <div class="recipe-card" onclick="showRecipe('${recipe.id}')">
                <div class="recipe-card-content">
                    <h3>${escapeHTML(recipe.name)}</h3>
                    <p>${escapeHTML(recipe.category)}</p>
                    <small>von ${escapeHTML(recipe.author)}</small>
                </div>
            </div>
        `;
    }).join("");
}


function showRecipe(id) {
    const recipe = recipes.find(function (item) {
        return item.id === id;
    });

    if (!recipe) {
        return;
    }

    const homeView = document.getElementById("homeView");
    const addView = document.getElementById("addView");
    const detailView = document.getElementById("detailView");

    if (homeView) homeView.style.display = "none";
    if (addView) addView.style.display = "none";
    if (detailView) detailView.style.display = "block";

    const detailContent = document.getElementById("recipeDetail");

    if (!detailContent) {
        return;
    }

    detailContent.innerHTML = `
        <div class="detail-card">

            <button class="back-button" onclick="showHome()">
                ← Zurück
            </button>

            <h1>${escapeHTML(recipe.name)}</h1>

            <p class="recipe-category">
                ${escapeHTML(recipe.category)}
            </p>

            <p>
                <strong>Von:</strong> ${escapeHTML(recipe.author)}
            </p>

            <h2>Zutaten</h2>

            <ul>
                ${recipe.ingredients.map(function (ingredient) {
                    return `<li>${escapeHTML(ingredient)}</li>`;
                }).join("")}
            </ul>

            <h2>Zubereitung</h2>

            <ol>
                ${recipe.steps.map(function (step) {
                    return `<li>${escapeHTML(step)}</li>`;
                }).join("")}
            </ol>

        </div>
    `;
}


function showHome() {
    const homeView = document.getElementById("homeView");
    const addView = document.getElementById("addView");
    const detailView = document.getElementById("detailView");

    if (homeView) homeView.style.display = "block";
    if (addView) addView.style.display = "none";
    if (detailView) detailView.style.display = "none";

    renderRecipes();
}


function showAddRecipe() {
    const homeView = document.getElementById("homeView");
    const addView = document.getElementById("addView");
    const detailView = document.getElementById("detailView");

    if (homeView) homeView.style.display = "none";
    if (addView) addView.style.display = "block";
    if (detailView) detailView.style.display = "none";
}


function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
