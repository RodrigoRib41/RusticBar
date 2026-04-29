import { notFound } from "next/navigation";
import { MenuCategoryPage } from "../components/MenuCategoryPage";
import { getMenuSection } from "../menu-data";

export default function ComidasPage() {
  const section = getMenuSection("comidas");

  if (!section) {
    notFound();
  }

  return <MenuCategoryPage section={section} />;
}
