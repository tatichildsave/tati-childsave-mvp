import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { saveLessons } from "../../src/content/lessons/save";
import { savePreAssessment, savePostAssessment } from "../../src/content/assessments/save-junior";
import { schoolReopeningScenario } from "../../src/content/scenarios/school-reopening";

const root = fileURLToPath(new URL("../../", import.meta.url));
const originalHashes: Record<string, string> = {
  "checkin-20": "d391f2f9394ae1fefab417d89295e6e052bd4168fadb198f99766d035bd8c199",
  "checkin-21": "e3ceb3a32e50618ab049acde8dfe9103ea3526284de9fcc731817bd5638d1d6a",
  "checkin-22": "337795e9c240975a025f52782c3ba0d7334a82825f254e334d1efcd264fab29b",
  "journey-hero": "be3c3f6b1f4f8c48d40279ad6c5fef69c0ff9714a00842213792c04c6cb33702",
  "scene-77": "449b5dae54fbe8e9a340515e1f78b07cc5e447d37fab4371c0ab20afd9ecfca7",
  "scene-78": "f579cb1beabdb01f7f39f41e0570cd7c58995cb4edeec1465d6479f1ad364e63",
  "scene-79": "a329fc8b66321dcc94a5393222dce529e141f78d20f6c49c85fb412bf62569fd",
  "scene-83": "63cbd3fda2131427c01778f4eb3282f9b560267656a00e83cdf9cda561a01e13",
  "scene-84": "ea5826c4b664d88ab72512f1a547edc236516a6e738f270d40efe543ca06ec77",
  "scene-85": "873c414492851283300dd5e63e335a18060a3e12e81bd0cc35b7f21bec8b3c3c",
  "tati-avatars": "8f01c8e65fe74f3353b11665fd33853064af213b951187199ada08a89ba94326",
};

describe("local TATI artwork", () => {
  it.each(Object.entries(originalHashes))(
    "preserves and resolves %s without a CDN",
    (name, hash) => {
      const metadata: { url: string; size: number; content_type: string } = JSON.parse(
        readFileSync(join(root, "src", "assets", `${name}.png.asset.json`), "utf8"),
      );
      expect(metadata.url).toBe(`/assets/${name}.jpeg`);
      const bytes = readFileSync(join(root, "public", metadata.url));
      expect(bytes.length).toBe(metadata.size);
      expect(metadata.content_type).toBe("image/jpeg");
      expect(bytes.subarray(0, 3).toString("hex")).toBe("ffd8ff");
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(hash);
    },
  );

  it("has exactly eleven metadata files with distinct image contents", () => {
    expect(
      readdirSync(join(root, "src", "assets")).filter((name) => name.endsWith(".asset.json")),
    ).toHaveLength(11);
    expect(new Set(Object.values(originalHashes)).size).toBe(11);
  });

  it("wires local imagery into current SAVE lessons, assessments and scenario content", () => {
    const content = JSON.stringify([
      saveLessons,
      savePreAssessment,
      savePostAssessment,
      schoolReopeningScenario,
    ]);
    for (const name of Object.keys(originalHashes).filter(
      (name) => name !== "tati-avatars" && name !== "journey-hero",
    )) {
      expect(content).toContain(`/assets/${name}.jpeg`);
    }
    expect(readFileSync(join(root, "src", "components", "tati", "Avatar.tsx"), "utf8")).toContain(
      "tati-avatars.png.asset.json",
    );
    expect(
      readFileSync(
        join(root, "src", "routes", "_authenticated", "learn.$childId.index.tsx"),
        "utf8",
      ),
    ).toContain("journey-hero.png.asset.json");
  });
});
