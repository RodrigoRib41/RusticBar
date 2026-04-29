import { notFound } from "next/navigation";
import { MenuCategoryPage } from "../components/MenuCategoryPage";
import { getMenuSection } from "../menu-data";

export default function BebidasPage() {
  const section = getMenuSection("bebidas");

  if (!section) {
    notFound();
  }

  return <MenuCategoryPage section={section} />;
}
