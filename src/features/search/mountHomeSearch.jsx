import { render } from "preact";

import HomeSearch from "./HomeSearch.jsx";

for (const host of document.querySelectorAll("[data-home-search-host]")) {
  const fallbackNodes = Array.from(host.childNodes, (node) => node.cloneNode(true));
  try {
    const books = JSON.parse(host.dataset.books ?? "[]");
    host.replaceChildren();
    render(
      <HomeSearch
        locale={host.dataset.locale ?? "tr"}
        manifestUrl={host.dataset.manifestUrl ?? ""}
        books={books}
      />,
      host
    );
  } catch {
    host.replaceChildren(...fallbackNodes);
  }
}
