/**
 * URL of a category's page (breadcrumbs, "See all →", JSON-LD). Same slug
 * rule as site/category/category-data `categorySlug`. A plain module so
 * both server and client components can call it.
 */
export const categoryAnchor = (category: string) =>
  `/tools/category/${category.toLowerCase().replace(/\./g, "-")}`;
