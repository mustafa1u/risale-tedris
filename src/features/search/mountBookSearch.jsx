import { render } from "preact";

import { initPartFilters } from "@/features/library/bookPageClient.js";
import BookSearch from "./BookSearch.jsx";

for (const host of document.querySelectorAll("[data-book-search-host]")) {
  const fallbackNodes = Array.from(host.childNodes, (node) => node.cloneNode(true));
  try {
    const book = JSON.parse(host.dataset.book ?? "null");
    const grades = JSON.parse(host.dataset.grades ?? "[]");
    if (!book?.slug || !book?.shardUrl) throw new TypeError("Missing current-book search reference");
    host.replaceChildren();
    render(
      <BookSearch
        locale={host.dataset.locale ?? "tr"}
        book={book}
        grades={grades}
      />,
      host
    );
  } catch {
    host.replaceChildren(...fallbackNodes);
  }
}

initPartFilters(document);
