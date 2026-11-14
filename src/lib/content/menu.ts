/**
 * Demo mission pantry. A real mission would load its own manifest. Items are generic
 * descriptions (no brands) used by Menu Fatigue Radar to suggest rotations.
 */
export interface MenuItem {
  name: string;
  category: "main" | "side" | "breakfast" | "snack" | "drink" | "dessert";
  emoji: string;
}

export const MENU: MenuItem[] = [
  { name: "Beef stew", category: "main", emoji: "🍲" },
  { name: "Chicken curry", category: "main", emoji: "🍛" },
  { name: "Vegetable lasagna", category: "main", emoji: "🍝" },
  { name: "Teriyaki salmon", category: "main", emoji: "🐟" },
  { name: "Black bean chili", category: "main", emoji: "🌶️" },
  { name: "Lemon pepper tuna", category: "main", emoji: "🐟" },
  { name: "Sweet and sour pork", category: "main", emoji: "🥡" },
  { name: "Lentil dal", category: "main", emoji: "🥘" },
  { name: "Macaroni and cheese", category: "side", emoji: "🧀" },
  { name: "Rehydrated rice", category: "side", emoji: "🍚" },
  { name: "Green beans with mushrooms", category: "side", emoji: "🥗" },
  { name: "Tortillas", category: "side", emoji: "🌮" },
  { name: "Scrambled eggs", category: "breakfast", emoji: "🍳" },
  { name: "Oatmeal with raisins", category: "breakfast", emoji: "🥣" },
  { name: "Granola", category: "breakfast", emoji: "🥣" },
  { name: "Mixed nuts", category: "snack", emoji: "🥜" },
  { name: "Dried apricots", category: "snack", emoji: "🍑" },
  { name: "Crackers", category: "snack", emoji: "🍘" },
  { name: "Lemonade", category: "drink", emoji: "🍋" },
  { name: "Coffee", category: "drink", emoji: "☕" },
  { name: "Chocolate pudding", category: "dessert", emoji: "🍮" },
  { name: "Shortbread cookies", category: "dessert", emoji: "🍪" },
];

export const MENU_EMOJI = Object.fromEntries(MENU.map((m) => [m.name, m.emoji]));
