export type PaginationItem = number | "gap";

export function paginationItems(currentPage: number, totalPages: number, windowSize = 2): PaginationItem[] {
  if (!Number.isInteger(currentPage) || !Number.isInteger(totalPages) || totalPages < 1 || currentPage < 1 || currentPage > totalPages) return [];
  const items: PaginationItem[] = [];
  let previous = 0;
  for (let page = 1; page <= totalPages; page += 1) {
    const keep = page === 1 || page === totalPages || Math.abs(page - currentPage) <= windowSize;
    if (!keep) continue;
    if (previous && page - previous > 1) items.push("gap");
    items.push(page);
    previous = page;
  }
  return items;
}
