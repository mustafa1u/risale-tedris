import SearchWorker from "./searchWorker.js?worker";

export function createBrowserSearchWorker() {
  return new SearchWorker();
}
