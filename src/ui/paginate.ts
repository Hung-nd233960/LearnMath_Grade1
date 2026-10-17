/** Split items into pages. Always returns at least one page (possibly empty), so a screen can index page 0. */
export function paginate<T>(items: readonly T[], perPage: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage));
  return pages.length ? pages : [[]];
}

export function clampPage(page: number, pageCount: number): number {
  return Math.max(0, Math.min(pageCount - 1, page));
}
