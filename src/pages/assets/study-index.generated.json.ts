import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function GET() {
  const content = await readFile(resolve(process.cwd(), "src/data/study-index.generated.json"), "utf8");

  return new Response(content, {
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}
