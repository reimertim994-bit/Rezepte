declare const supabase: {
  createClient: (url: string, key: string) => any;
};

const SUPABASE_URL = "https://nokeryzkvhswjhhhrnrd.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_ecrd_N_mFJZGanoHCiVo9Q_B4sO-_Ta";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

type IngredientUnit = "g" | "kg" | "ml" | "l" | "Stück" | "EL" | "TL" | "Prise";

interface IngredientTemplate {
  name: string;
  defaultUnit: IngredientUnit;
}

interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: IngredientUnit;
}

interface Recipe {
  id: string;
  name: string;
  instructions: string;
  ingredients: Ingredient[];
}

const ingredientTemplates: IngredientTemplate[] = [
  { name: "Nudeln", defaultUnit: "g" },
  { name: "Reis", defaultUnit: "g" },
  { name: "Kartoffeln", defaultUnit: "g" },
  { name: "Rindfleisch", defaultUnit: "g" },
  { name: "Hackfleisch", defaultUnit: "g" },
  { name: "Hähnchenbrust", defaultUnit: "g" },
  { name: "Tomaten", defaultUnit: "Stück" },
  { name: "Zwiebeln", defaultUnit: "Stück" },
  { name: "Knoblauch", defaultUnit: "Stück" },
  { name: "Paprika", defaultUnit: "Stück" },
  { name: "Karotten", defaultUnit: "Stück" },
  { name: "Eier", defaultUnit: "Stück" },
  { name: "Milch", defaultUnit: "ml" },
  { name: "Sahne", defaultUnit: "ml" },
  { name: "Tomatensoße", defaultUnit: "ml" },
  { name: "Brühe", defaultUnit: "ml" },
  { name: "Olivenöl", defaultUnit: "EL" },
  { name: "Butter", defaultUnit: "g" },
  { name: "Käse", defaultUnit: "g" },
  { name: "Mehl", defaultUnit: "g" },
  { name: "Zucker", defaultUnit: "g" },
  { name: "Salz", defaultUnit: "Prise" },
  { name: "Pfeffer", defaultUnit: "Prise" },
];

const recipeList = getElement<HTMLElement>("recipeList");
const emptyState = getElement<HTMLElement>("emptyState");
const recipeModal = getElement<HTMLElement>("recipeModal");
const recipeForm = getElement<HTMLFormElement>("recipeForm");

const recipeNameInput = getElement<HTMLInputElement>("recipeName");
const recipeInstructionsInput =
  getElement<HTMLTextAreaElement>("recipeInstructions");

const ingredientSearchInput = getElement<HTMLInputElement>("ingredientSearch");

const ingredientAmountInput = getElement<HTMLInputElement>("ingredientAmount");

const ingredientUnitSelect = getElement<HTMLSelectElement>("ingredientUnit");

const ingredientSuggestions = getElement<HTMLElement>("ingredientSuggestions");

const selectedIngredientsContainer = getElement<HTMLElement>(
  "selectedIngredients",
);

const ingredientError = getElement<HTMLElement>("ingredientError");

const openRecipeModalButton = getElement<HTMLButtonElement>(
  "openRecipeModalButton",
);

const addIngredientButton = getElement<HTMLButtonElement>(
  "addIngredientButton",
);

let recipes: Recipe[] = loadRecipes();
let currentIngredients: Ingredient[] = [];

renderRecipes();

openRecipeModalButton.addEventListener("click", openRecipeModal);

document
  .querySelectorAll<HTMLElement>("[data-close-modal]")
  .forEach((element) => {
    element.addEventListener("click", closeRecipeModal);
  });

ingredientSearchInput.addEventListener("input", () => {
  showIngredientSuggestions(ingredientSearchInput.value);
});

ingredientSearchInput.addEventListener("focus", () => {
  showIngredientSuggestions(ingredientSearchInput.value);
});

addIngredientButton.addEventListener("click", addIngredient);

recipeForm.addEventListener("submit", saveRecipe);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeRecipeModal();
  }
});

document.addEventListener("click", (event) => {
  const target = event.target as Node;

  if (
    !ingredientSuggestions.contains(target) &&
    target !== ingredientSearchInput
  ) {
    ingredientSuggestions.classList.add("hidden");
  }
});

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Element mit ID "${id}" wurde nicht gefunden.`);
  }

  return element as T;
}

function createId(): string {
  return crypto.randomUUID();
}

function openRecipeModal(): void {
  recipeModal.classList.remove("hidden");
  recipeNameInput.focus();
}

function closeRecipeModal(): void {
  recipeModal.classList.add("hidden");
  recipeForm.reset();

  currentIngredients = [];

  ingredientError.textContent = "";
  ingredientSuggestions.classList.add("hidden");

  renderSelectedIngredients();
}

function showIngredientSuggestions(searchValue: string): void {
  const normalizedSearch = searchValue.trim().toLowerCase();

  const matchingIngredients = ingredientTemplates.filter((ingredient) => {
    return ingredient.name.toLowerCase().includes(normalizedSearch);
  });

  ingredientSuggestions.innerHTML = "";

  matchingIngredients.forEach((ingredient) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "suggestion-button";

    button.innerHTML = `
            <span>${escapeHtml(ingredient.name)}</span>
            <small>${ingredient.defaultUnit}</small>
        `;

    button.addEventListener("click", () => {
      ingredientSearchInput.value = ingredient.name;
      ingredientUnitSelect.value = ingredient.defaultUnit;
      ingredientSuggestions.classList.add("hidden");
      ingredientAmountInput.focus();
    });

    ingredientSuggestions.appendChild(button);
  });

  if (
    normalizedSearch &&
    !ingredientTemplates.some(
      (ingredient) => ingredient.name.toLowerCase() === normalizedSearch,
    )
  ) {
    const customButton = document.createElement("button");

    customButton.type = "button";
    customButton.className = "suggestion-button";

    customButton.innerHTML = `
            <span>„${escapeHtml(searchValue.trim())}“ verwenden</span>
            <small>Eigene Zutat</small>
        `;

    customButton.addEventListener("click", () => {
      ingredientSearchInput.value = searchValue.trim();
      ingredientSuggestions.classList.add("hidden");
      ingredientAmountInput.focus();
    });

    ingredientSuggestions.appendChild(customButton);
  }

  ingredientSuggestions.classList.toggle(
    "hidden",
    ingredientSuggestions.children.length === 0,
  );
}

function addIngredient(): void {
  const name = ingredientSearchInput.value.trim();
  const amount = Number(ingredientAmountInput.value);
  const unit = ingredientUnitSelect.value as IngredientUnit;

  ingredientError.textContent = "";

  if (!name) {
    ingredientError.textContent = "Bitte gib eine Zutat ein.";
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    ingredientError.textContent = "Bitte gib eine gültige Menge ein.";
    return;
  }

  currentIngredients.push({
    id: createId(),
    name,
    amount,
    unit,
  });

  ingredientSearchInput.value = "";
  ingredientAmountInput.value = "";
  ingredientUnitSelect.value = "g";

  renderSelectedIngredients();
  ingredientSearchInput.focus();
}

function renderSelectedIngredients(): void {
  selectedIngredientsContainer.innerHTML = "";

  currentIngredients.forEach((ingredient) => {
    const ingredientElement = document.createElement("div");

    ingredientElement.className = "selected-ingredient";

    ingredientElement.innerHTML = `
            <span>
                <strong>${escapeHtml(ingredient.name)}</strong>
                – ${formatNumber(ingredient.amount)} ${ingredient.unit}
            </span>

            <button
                type="button"
                class="remove-ingredient-button"
            >
                Entfernen
            </button>
        `;

    const removeButton = ingredientElement.querySelector("button");

    removeButton?.addEventListener("click", () => {
      currentIngredients = currentIngredients.filter(
        (currentIngredient) => currentIngredient.id !== ingredient.id,
      );

      renderSelectedIngredients();
    });

    selectedIngredientsContainer.appendChild(ingredientElement);
  });
}

function saveRecipe(event: SubmitEvent): void {
  event.preventDefault();

  const recipeName = recipeNameInput.value.trim();
  const instructions = recipeInstructionsInput.value.trim();

  if (!recipeName) {
    return;
  }

  if (currentIngredients.length === 0) {
    ingredientError.textContent = "Das Rezept benötigt mindestens eine Zutat.";
    return;
  }

  recipes.push({
    id: createId(),
    name: recipeName,
    instructions,
    ingredients: currentIngredients.map((ingredient) => ({
      ...ingredient,
    })),
  });

  saveRecipes();
  renderRecipes();
  closeRecipeModal();
}

function renderRecipes(): void {
  recipeList.innerHTML = "";

  emptyState.classList.toggle("hidden", recipes.length > 0);

  recipes.forEach((recipe) => {
    const recipeCard = document.createElement("article");

    recipeCard.className = "recipe-card";

    recipeCard.innerHTML = `
            <div class="recipe-card-header">
                <h2>${escapeHtml(recipe.name)}</h2>

                <button
                    type="button"
                    class="delete-button"
                    aria-label="Rezept löschen"
                >
                    ×
                </button>
            </div>

            <div class="recipe-content">
                <h3>Zutaten</h3>

                <ul class="ingredient-list">
                    ${createIngredientList(recipe.ingredients)}
                </ul>

                <div class="scale-box">
                    <label>Mengen anpassen</label>

                    <div class="scale-input-row">
                        <select class="scale-ingredient-select">
                            ${recipe.ingredients
                              .map(
                                (ingredient) => `
                                        <option value="${ingredient.id}">
                                            ${escapeHtml(ingredient.name)}
                                        </option>
                                    `,
                              )
                              .join("")}
                        </select>

                        <input
                            class="available-amount-input"
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Vorhandene Menge"
                        >
                    </div>

                    <p class="scale-result">
                        Wähle eine Zutat und gib deine vorhandene Menge ein.
                    </p>
                </div>

                ${
                  recipe.instructions
                    ? `
                            <h3>Zubereitung</h3>
                            <p class="instructions">
                                ${escapeHtml(recipe.instructions)}
                            </p>
                        `
                    : ""
                }
            </div>
        `;

    const deleteButton =
      recipeCard.querySelector<HTMLButtonElement>(".delete-button");

    deleteButton?.addEventListener("click", () => {
      deleteRecipe(recipe.id);
    });

    configureRecipeScaling(recipeCard, recipe);

    recipeList.appendChild(recipeCard);
  });
}

function createIngredientList(ingredients: Ingredient[]): string {
  return ingredients
    .map(
      (ingredient) => `
                <li data-ingredient-id="${ingredient.id}">
                    <span>${escapeHtml(ingredient.name)}</span>

                    <strong class="ingredient-amount">
                        ${formatNumber(ingredient.amount)} ${ingredient.unit}
                    </strong>
                </li>
            `,
    )
    .join("");
}

function configureRecipeScaling(recipeCard: HTMLElement, recipe: Recipe): void {
  const ingredientSelect = recipeCard.querySelector<HTMLSelectElement>(
    ".scale-ingredient-select",
  );

  const availableAmountInput = recipeCard.querySelector<HTMLInputElement>(
    ".available-amount-input",
  );

  const scaleResult = recipeCard.querySelector<HTMLElement>(".scale-result");

  if (!ingredientSelect || !availableAmountInput || !scaleResult) {
    return;
  }

  const updateAmounts = (): void => {
    const selectedIngredient = recipe.ingredients.find(
      (ingredient) => ingredient.id === ingredientSelect.value,
    );

    const availableAmount = Number(availableAmountInput.value);

    if (
      !selectedIngredient ||
      !Number.isFinite(availableAmount) ||
      availableAmount <= 0
    ) {
      resetIngredientAmounts(recipeCard, recipe);

      scaleResult.textContent =
        "Wähle eine Zutat und gib deine vorhandene Menge ein.";

      return;
    }

    const scaleFactor = availableAmount / selectedIngredient.amount;

    recipe.ingredients.forEach((ingredient) => {
      const amountElement = recipeCard.querySelector<HTMLElement>(
        `[data-ingredient-id="${ingredient.id}"] .ingredient-amount`,
      );

      if (!amountElement) {
        return;
      }

      const scaledAmount = ingredient.amount * scaleFactor;

      amountElement.textContent = `${formatNumber(scaledAmount)} ${ingredient.unit}`;
    });

    const percentage = Math.round(scaleFactor * 100);

    scaleResult.textContent = `Das Rezept wurde auf ${percentage} % der ursprünglichen Menge angepasst.`;
  };

  ingredientSelect.addEventListener("change", updateAmounts);
  availableAmountInput.addEventListener("input", updateAmounts);
}

function resetIngredientAmounts(recipeCard: HTMLElement, recipe: Recipe): void {
  recipe.ingredients.forEach((ingredient) => {
    const amountElement = recipeCard.querySelector<HTMLElement>(
      `[data-ingredient-id="${ingredient.id}"] .ingredient-amount`,
    );

    if (amountElement) {
      amountElement.textContent = `${formatNumber(ingredient.amount)} ${ingredient.unit}`;
    }
  });
}

function deleteRecipe(recipeId: string): void {
  const confirmed = window.confirm(
    "Möchtest du dieses Rezept wirklich löschen?",
  );

  if (!confirmed) {
    return;
  }

  recipes = recipes.filter((recipe) => recipe.id !== recipeId);

  saveRecipes();
  renderRecipes();
}

function saveRecipes(): void {
  localStorage.setItem("recipe-app-recipes", JSON.stringify(recipes));
}

function loadRecipes(): Recipe[] {
  const storedRecipes = localStorage.getItem("recipe-app-recipes");

  if (!storedRecipes) {
    return [];
  }

  try {
    return JSON.parse(storedRecipes) as Recipe[];
  } catch {
    return [];
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 2,
  }).format(value);
}

function escapeHtml(value: string): string {
  const element = document.createElement("div");
  element.textContent = value;

  return element.innerHTML;
}
