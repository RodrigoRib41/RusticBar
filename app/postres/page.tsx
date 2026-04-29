import { notFound } from "next/navigation";
import { MenuCategoryPage } from "../components/MenuCategoryPage";
import { getMenuSection } from "../menu-data";

export default function PostresPage() {
  const section = getMenuSection("postres");

  if (!section) {
    notFound();
  }

  return <MenuCategoryPage section={section} />;
}
