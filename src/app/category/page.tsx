// CHANGE: Category is now its own page (no local tab state).
// CHANGE: Use the global store for category; selecting here updates the app-wide category.

"use client";
import CategorySelector from "@/features/category/CategorySelector";
import { useSessionStore } from "@/store/sessionStore";

export default function CategoryPage() {
  const category = useSessionStore((s) => s.category);       // CHANGE
  const setCategory = useSessionStore((s) => s.setCategory);  // CHANGE
  return <CategorySelector value={category} onChange={setCategory} />;
}
