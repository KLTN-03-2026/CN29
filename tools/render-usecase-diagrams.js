#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT_DIR = process.cwd();
const DEFAULT_INPUT = "docs/usecase-sequence-activity-all.txt";
const INPUT_PATH = path.resolve(ROOT_DIR, process.argv[2] || DEFAULT_INPUT);

const OUT = {
  sequenceSourceDir: path.resolve(ROOT_DIR, "docs/sequence"),
  activitySourceDir: path.resolve(ROOT_DIR, "docs/activity"),
  sequenceImageDir: path.resolve(ROOT_DIR, "docs/images/sequence"),
  activityImageDir: path.resolve(ROOT_DIR, "docs/images/activity"),
  renderedMarkdown: path.resolve(ROOT_DIR, "docs/usecase-diagrams-rendered.md"),
  readmeMarkdown: path.resolve(ROOT_DIR, "docs/README_usecase_diagrams.md"),
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeSlashes(input) {
  return input.replace(/\\/g, "/");
}

function slugifyVietnamese(text) {
  const rawSlug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return rawSlug || "use-case";
}

function splitUseCases(rawText) {
  const lines = rawText.split(/\r?\n/);
  const useCases = [];
  let current = null;

  for (const line of lines) {
    const headerMatch = line.match(/^UC(\d{2})\s*-\s*(.+)\s*$/);

    if (headerMatch) {
      if (current) {
        useCases.push(current);
      }

      current = {
        id: headerMatch[1],
        title: headerMatch[2].trim(),
        lines: [],
      };
      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("PROMPT GỢI Ý ĐỂ GỬI CHO COPILOT")) {
      break;
    }

    current.lines.push(line);
  }

  if (current) {
    useCases.push(current);
  }

  return useCases.map((useCase) => {
    const body = useCase.lines.join("\n");
    const mermaid = extractBetween(body, "[Mermaid]", "[PlantText]");
    const plant = extractAfter(body, "[PlantText]");

    return {
      id: useCase.id,
      title: useCase.title,
      mermaid,
      plant,
    };
  });
}

function extractBetween(content, startToken, endToken) {
  const startIndex = content.indexOf(startToken);
  if (startIndex < 0) {
    return "";
  }

  const remainder = content.slice(startIndex + startToken.length);
  const endIndex = remainder.indexOf(endToken);
  const section = endIndex >= 0 ? remainder.slice(0, endIndex) : remainder;

  return cleanupSection(section);
}

function extractAfter(content, startToken) {
  const startIndex = content.indexOf(startToken);
  if (startIndex < 0) {
    return "";
  }

  const section = content.slice(startIndex + startToken.length);
  return cleanupSection(section);
}

function cleanupSection(section) {
  const cutPrompt = section.split("PROMPT GỢI Ý ĐỂ GỬI CHO COPILOT")[0];
  const cutSeparator = cutPrompt.split("================================================================")[0];
  return cutSeparator.trim();
}

function postToKroki(diagramType, format, source) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(source, "utf8");

    const request = https.request(
      {
        hostname: "kroki.io",
        method: "POST",
        path: `/${diagramType}/${format}`,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Length": payload.length,
          Accept: "*/*",
        },
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks);

          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(body);
            return;
          }

          reject(
            new Error(
              `Kroki ${diagramType} failed (${response.statusCode}): ${body
                .toString("utf8")
                .slice(0, 400)}`
            )
          );
        });
      }
    );

    request.setTimeout(30000, () => {
      request.destroy(new Error(`Kroki ${diagramType} request timed out`));
    });

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, `${content.trim()}\n`, "utf8");
}

function relFromDocs(absPath) {
  return normalizeSlashes(path.relative(path.resolve(ROOT_DIR, "docs"), absPath));
}

function relFromRoot(absPath) {
  return normalizeSlashes(path.relative(ROOT_DIR, absPath));
}

function buildReadme(rows) {
  const lines = [];

  lines.push("# Use Case Diagrams");
  lines.push("");
  lines.push("File nguồn: docs/usecase-sequence-activity-all.txt");
  lines.push("");
  lines.push("## Danh sách use case và file");
  lines.push("");
  lines.push("| Use case | Mermaid (.mmd) | PlantUML (.puml) | Ảnh sequence | Ảnh activity | Render |");
  lines.push("|---|---|---|---|---|---|");

  for (const row of rows) {
    const renderStatus = row.errors.length ? `Lỗi (${row.errors.length})` : "OK";
    lines.push(
      `| ${row.label} | [${row.seqSource}](${row.seqSource}) | [${row.actSource}](${row.actSource}) | [${row.seqImage}](${row.seqImage}) | [${row.actImage}](${row.actImage}) | ${renderStatus} |`
    );
  }

  lines.push("");
  lines.push("## Hướng dẫn render nhanh");
  lines.push("");
  lines.push("- Tạo/tách lại toàn bộ file và ảnh: `npm run render:usecases`.");
  lines.push("- Sequence dùng Mermaid, Activity dùng PlantUML.");
  lines.push("- Script gọi Kroki API để render ảnh SVG, không cần cài thêm CLI riêng.");

  return `${lines.join("\n")}\n`;
}

function buildRenderedMarkdown(rows) {
  const lines = [];

  lines.push("# Use Case Diagrams Rendered");
  lines.push("");
  lines.push("Mỗi use case bên dưới có ảnh hiển thị ở đầu phần chức năng.");
  lines.push("");

  for (const row of rows) {
    lines.push(`## ${row.label}`);
    lines.push("");
    lines.push(`![${row.label} - Sequence](${row.seqImage})`);
    lines.push("");
    lines.push(`![${row.label} - Activity](${row.actImage})`);
    lines.push("");
    lines.push(`- Mermaid source: [${row.seqSource}](${row.seqSource})`);
    lines.push(`- PlantUML source: [${row.actSource}](${row.actSource})`);

    if (row.errors.length) {
      lines.push(`- Ghi chú render: ${row.errors.join(" | ")}`);
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Input file not found: ${relFromRoot(INPUT_PATH)}`);
  }

  ensureDir(OUT.sequenceSourceDir);
  ensureDir(OUT.activitySourceDir);
  ensureDir(OUT.sequenceImageDir);
  ensureDir(OUT.activityImageDir);

  const rawText = fs.readFileSync(INPUT_PATH, "utf8");
  const useCases = splitUseCases(rawText).filter((item) => item.id && item.title);

  if (!useCases.length) {
    throw new Error("No use case blocks were found in the input file.");
  }

  const rows = [];

  for (const useCase of useCases) {
    const ucCode = `uc${useCase.id}`;
    const slug = slugifyVietnamese(useCase.title);
    const baseName = `${ucCode}-${slug}`;

    const seqSourceAbs = path.join(OUT.sequenceSourceDir, `${baseName}.mmd`);
    const actSourceAbs = path.join(OUT.activitySourceDir, `${baseName}.puml`);
    const seqImageAbs = path.join(OUT.sequenceImageDir, `${baseName}.svg`);
    const actImageAbs = path.join(OUT.activityImageDir, `${baseName}.svg`);

    if (!useCase.mermaid || !useCase.mermaid.includes("sequenceDiagram")) {
      throw new Error(`Mermaid block is missing or invalid in UC${useCase.id} - ${useCase.title}`);
    }

    if (!useCase.plant || !useCase.plant.includes("@startuml") || !useCase.plant.includes("@enduml")) {
      throw new Error(`PlantUML block is missing or invalid in UC${useCase.id} - ${useCase.title}`);
    }

    writeText(seqSourceAbs, useCase.mermaid);
    writeText(actSourceAbs, useCase.plant);

    const errors = [];

    try {
      const seqSvg = await postToKroki("mermaid", "svg", useCase.mermaid);
      fs.writeFileSync(seqImageAbs, seqSvg);
    } catch (error) {
      errors.push(`Sequence: ${error.message}`);
      console.error(`[WARN] ${ucCode} sequence render failed: ${error.message}`);
    }

    try {
      const actSvg = await postToKroki("plantuml", "svg", useCase.plant);
      fs.writeFileSync(actImageAbs, actSvg);
    } catch (error) {
      errors.push(`Activity: ${error.message}`);
      console.error(`[WARN] ${ucCode} activity render failed: ${error.message}`);
    }

    rows.push({
      label: `UC${useCase.id} - ${useCase.title}`,
      seqSource: relFromDocs(seqSourceAbs),
      actSource: relFromDocs(actSourceAbs),
      seqImage: relFromDocs(seqImageAbs),
      actImage: relFromDocs(actImageAbs),
      errors,
    });

    console.log(`[OK] Processed ${ucCode} - ${useCase.title}`);
  }

  fs.writeFileSync(OUT.readmeMarkdown, buildReadme(rows), "utf8");
  fs.writeFileSync(OUT.renderedMarkdown, buildRenderedMarkdown(rows), "utf8");

  const failed = rows.filter((row) => row.errors.length).length;

  console.log("----------------------------------------");
  console.log(`Total use cases: ${rows.length}`);
  console.log(`Render success: ${rows.length - failed}`);
  console.log(`Render failed: ${failed}`);
  console.log(`Readme: ${relFromRoot(OUT.readmeMarkdown)}`);
  console.log(`Rendered preview: ${relFromRoot(OUT.renderedMarkdown)}`);

  if (failed > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message}`);
  process.exitCode = 1;
});
