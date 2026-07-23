import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const root = new URL("../", import.meta.url);
const packageVersion = "4.1.13";
const projectPaths = [
  "services/Rissor.Augmentation.Export/Rissor.Augmentation.Export.csproj",
  "scripts/study-preselector/StudyPreselector.csproj"
];

async function readProject(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

describe("QAGeneratorLib dependency distribution", () => {
  it("uses the local compiled package by default without user-specific paths", async () => {
    for (const projectPath of projectPaths) {
      const source = await readProject(projectPath);

      assert.doesNotMatch(source, /C:\\Users|UserProfile/);
      assert.match(source, /<TargetFramework>net9\.0<\/TargetFramework>/);
      assert.match(
        source,
        new RegExp(
          `<PackageReference\\s+Include="QAGeneratorLib"\\s+Version="${packageVersion}"\\s+Condition="'\\$\\(QAGeneratorLibProject\\)' == ''"\\s*/>`
        )
      );
    }
  });

  it("retains an explicit source-project override for QAGeneratorLib development", async () => {
    for (const projectPath of projectPaths) {
      const source = await readProject(projectPath);

      assert.match(source, /QAGENERATOR_LIB_PROJECT/);
      assert.match(
        source,
        /<ProjectReference\s+Include="\$\(QAGeneratorLibProject\)"\s+Condition="'\$\(QAGeneratorLibProject\)' != '' and Exists\('\$\(QAGeneratorLibProject\)'\)"\s*\/>/
      );
    }
  });

  it("keeps the compiled package in the repository-local NuGet feed", async () => {
    const nugetConfig = await readProject("NuGet.config");
    const packagePath = new URL(`packages/QAGeneratorLib.${packageVersion}.nupkg`, root);
    const checksumPath = new URL(`packages/QAGeneratorLib.${packageVersion}.nupkg.sha256`, root);

    assert.match(nugetConfig, /<add key="local-qagenerator" value="\.\/packages"\s*\/>/);
    await access(packagePath);

    const expectedChecksum = (await readFile(checksumPath, "utf8")).trim();
    const actualChecksum = createHash("sha256").update(await readFile(packagePath)).digest("hex").toUpperCase();
    assert.equal(actualChecksum, expectedChecksum);
  });
});
