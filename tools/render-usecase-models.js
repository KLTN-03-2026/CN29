#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT_DIR = process.cwd();
const DEFAULT_INPUT = "docs/usecase-sequence-activity-all.txt";
const INPUT_PATH = path.resolve(ROOT_DIR, process.argv[2] || DEFAULT_INPUT);

const OUT = {
  pumlDir: path.resolve(ROOT_DIR, "docs/usecase/puml"),
  imageDir: path.resolve(ROOT_DIR, "docs/images/usecase"),
  pngDir: path.resolve(ROOT_DIR, "docs/images/usecase/png"),
  pdfDir: path.resolve(ROOT_DIR, "docs/pdf/usecase"),
  renderedDoc: path.resolve(ROOT_DIR, "docs/usecase-models-rendered.md"),
  readme: path.resolve(ROOT_DIR, "docs/README_usecase_models.md"),
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function normalizeSlashes(value) {
  return value.replace(/\\/g, "/");
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

function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function toSentence(text) {
  const normalized = cleanText(text)
    .replace(/[;:]+$/, "")
    .replace(/^\-+\s*/, "");

  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function lowerFirst(text) {
  const clean = cleanText(text);

  if (!clean) {
    return "";
  }

  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

function quoteSafe(text) {
  return String(text || "").replace(/"/g, "'");
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
        title: cleanText(headerMatch[2]),
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

  return useCases.map((item) => {
    const body = item.lines.join("\n");

    return {
      id: item.id,
      title: item.title,
      mermaid: extractBetween(body, "[Mermaid]", "[PlantText]"),
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

function cleanupSection(section) {
  const cutPrompt = section.split("PROMPT GỢI Ý ĐỂ GỬI CHO COPILOT")[0];
  const cutSeparator = cutPrompt.split("================================================================")[0];

  return cutSeparator.trim();
}

function parseMermaidSequence(mermaidText) {
  const lines = mermaidText.split(/\r?\n/);
  const actors = [];
  const actorMap = new Map();
  const messages = [];
  const conditions = [];

  for (const line of lines) {
    const actorMatch = line.match(/^\s*actor\s+([A-Za-z0-9_]+)\s+as\s+(.+?)\s*$/);

    if (actorMatch) {
      const actorId = actorMatch[1];
      const actorLabel = cleanText(actorMatch[2]);

      if (!actorMap.has(actorId)) {
        actorMap.set(actorId, actorLabel);
        actors.push({ id: actorId, label: actorLabel });
      }

      continue;
    }

    const messageMatch = line.match(/^\s*([A-Za-z0-9_]+)\s*[-.]+>>\s*([A-Za-z0-9_]+)\s*:\s*(.+?)\s*$/);

    if (messageMatch) {
      messages.push({
        from: messageMatch[1],
        to: messageMatch[2],
        text: cleanText(messageMatch[3]),
      });
      continue;
    }

    const conditionMatch = line.match(/^\s*(alt|else|opt)\s+(.+?)\s*$/i);

    if (conditionMatch) {
      conditions.push({
        kind: conditionMatch[1].toLowerCase(),
        text: cleanText(conditionMatch[2]),
      });
    }
  }

  return {
    actors,
    actorMap,
    messages,
    conditions,
  };
}

function splitMainTitleAndVariants(rawTitle) {
  const title = cleanText(rawTitle);
  const match = title.match(/^(.+?)\s*\((.+)\)\s*$/);

  if (!match) {
    return { mainTitle: title, variants: [] };
  }

  const inside = match[2];

  if (!inside.includes("/")) {
    return { mainTitle: title, variants: [] };
  }

  const variants = inside
    .split("/")
    .map((item) => cleanText(item))
    .filter(Boolean)
    .slice(0, 4);

  return {
    mainTitle: cleanText(match[1]),
    variants,
  };
}

function inferSearchExtensions(mainTitle, sequenceInfo) {
  if (!/tìm kiếm/i.test(mainTitle)) {
    return [];
  }

  const actorIds = new Set(sequenceInfo.actors.map((actor) => actor.id));
  const firstActorMessage = sequenceInfo.messages.find((msg) => actorIds.has(msg.from));

  if (!firstActorMessage) {
    return [];
  }

  const rawOptions = firstActorMessage.text
    .replace(/^nhập\s+/i, "")
    .split(",")
    .map((item) => cleanText(item))
    .filter((item) => item && item.length < 40)
    .slice(0, 4);

  if (rawOptions.length < 2) {
    return [];
  }

  return rawOptions.map((option) => `${mainTitle} theo ${option}`);
}

function inferUseCaseModel(uc) {
  const sequenceInfo = parseMermaidSequence(uc.mermaid);
  const { mainTitle, variants } = splitMainTitleAndVariants(uc.title);
  const extensionTitles = variants.length
    ? variants.map((variant) => `${mainTitle} - ${variant}`)
    : inferSearchExtensions(mainTitle, sequenceInfo);

  const fullText = sequenceInfo.messages.map((msg) => msg.text).join(" \n ");
  const hasAuthCheck = /kiểm tra đăng nhập|phiên hợp lệ|phiên không hợp lệ|yêu cầu đăng nhập|chuyển đến trang đăng nhập/i.test(
    fullText
  );
  const hasPermissionCheck = /kiểm tra đăng nhập và quyền|kiểm tra quyền|gán vai trò|vai trò|phân quyền/i.test(fullText);

  const includeLogin = !/đăng nhập/i.test(mainTitle) && hasAuthCheck;
  const includePermission = !/phân quyền/i.test(mainTitle) && hasPermissionCheck;

  return {
    id: uc.id,
    originalTitle: uc.title,
    mainTitle,
    sequenceInfo,
    includeLogin,
    includePermission,
    extensionTitles,
  };
}

function buildUseCasePuml(model) {
  const actorLabels = model.sequenceInfo.actors.map((actor) => actor.label);
  const uniqueActors = [...new Set(actorLabels)].filter(Boolean);
  const actors = uniqueActors.length ? uniqueActors : ["Người dùng"];

  const lines = [];

  lines.push("@startuml");
  lines.push("skinparam shadowing false");
  lines.push("left to right direction");
  lines.push(`title UC${model.id} - ${quoteSafe(model.originalTitle)}`);

  actors.forEach((actorLabel, index) => {
    lines.push(`actor \"${quoteSafe(actorLabel)}\" as ACTOR_${index + 1}`);
  });

  lines.push(`usecase \"${quoteSafe(model.mainTitle)}\" as UC_MAIN`);

  actors.forEach((_, index) => {
    lines.push(`ACTOR_${index + 1} --> UC_MAIN`);
  });

  if (model.includeLogin) {
    lines.push('usecase "Đăng nhập" as UC_LOGIN');
    lines.push("UC_MAIN ..> UC_LOGIN : <<include>>");
  }

  if (model.includePermission) {
    lines.push('usecase "Phân quyền" as UC_PERMISSION');
    lines.push("UC_MAIN ..> UC_PERMISSION : <<include>>");
  }

  model.extensionTitles.forEach((extensionTitle, index) => {
    const alias = `UC_EXT_${index + 1}`;
    lines.push(`usecase \"${quoteSafe(extensionTitle)}\" as ${alias}`);
    lines.push(`${alias} ..> UC_MAIN : <<extend>>`);
  });

  lines.push("@enduml");

  return `${lines.join("\n")}\n`;
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

function relFromDocs(absPath) {
  return normalizeSlashes(path.relative(path.resolve(ROOT_DIR, "docs"), absPath));
}

function relFromRoot(absPath) {
  return normalizeSlashes(path.relative(ROOT_DIR, absPath));
}

function buildMainFlow(model) {
  const used = new Set();
  const steps = [];

  if (model.includeLogin) {
    const loginStep = "Hệ thống kiểm tra trạng thái đăng nhập trước khi xử lý chức năng";
    used.add(loginStep.toLowerCase());
    steps.push(loginStep);
  }

  if (model.includePermission) {
    const permissionStep = "Hệ thống kiểm tra quyền truy cập của tác nhân";
    if (!used.has(permissionStep.toLowerCase())) {
      used.add(permissionStep.toLowerCase());
      steps.push(permissionStep);
    }
  }

  for (const message of model.sequenceInfo.messages) {
    const sentence = toSentence(message.text);

    if (!sentence) {
      continue;
    }

    const key = sentence.toLowerCase();

    if (used.has(key)) {
      continue;
    }

    used.add(key);
    steps.push(sentence);

    if (steps.length >= 6) {
      break;
    }
  }

  if (!steps.length) {
    steps.push(`Người dùng thực hiện ${lowerFirst(model.mainTitle)}`);
    steps.push("Hệ thống xử lý và trả kết quả");
  }

  return steps;
}

function buildAlternativeFlows(model) {
  const alternatives = [];

  for (const condition of model.sequenceInfo.conditions) {
    if (!condition.text) {
      continue;
    }

    const text = condition.text;

    if (condition.kind === "alt") {
      alternatives.push(`Trường hợp ${lowerFirst(text)}, hệ thống rẽ nhánh xử lý tương ứng`);
      continue;
    }

    if (condition.kind === "else") {
      alternatives.push(`Nếu ${lowerFirst(text)}, hệ thống trả thông báo phù hợp`);
      continue;
    }

    if (condition.kind === "opt") {
      alternatives.push(`Tùy chọn ${lowerFirst(text)} khi điều kiện phù hợp`);
    }
  }

  if (!alternatives.length) {
    const negativeSignalPattern = /(?:^|\s)(sai|lỗi|không|chưa|thiếu)(?:\s|$|[\.,;:])|bị\s+khóa/i;
    const fallback = model.sequenceInfo.messages.find((msg) => negativeSignalPattern.test(msg.text));

    if (fallback) {
      alternatives.push(`Nếu ${lowerFirst(fallback.text)}, hệ thống trả thông báo cho người dùng`);
    }
  }

  return alternatives.length ? alternatives.slice(0, 3) : ["Không có"];
}

function buildSpecificRequirements(model) {
  const text = model.sequenceInfo.messages.map((msg) => msg.text).join(" \n ");
  const requirements = [];

  if (/2fa/i.test(text)) {
    requirements.push("Hỗ trợ xác thực 2FA khi tài khoản bật cơ chế bảo mật nâng cao");
  }

  if (/captcha/i.test(text)) {
    requirements.push("Có thể yêu cầu CAPTCHA với phiên đăng nhập rủi ro");
  }

  if (/socket|realtime/i.test(text)) {
    requirements.push("Yêu cầu cơ chế realtime để đồng bộ dữ liệu tức thời");
  }

  if (/tải tệp|logo|ảnh|đính kèm|storage|tải ảnh/i.test(text)) {
    requirements.push("Hỗ trợ tải tệp đính kèm khi nghiệp vụ có yêu cầu");
  }

  if (/phân trang/i.test(text)) {
    requirements.push("Danh sách dữ liệu cần hỗ trợ phân trang");
  }

  return requirements.length ? requirements : ["Không có"];
}

function buildPrecondition(model) {
  if (/đăng ký/i.test(model.mainTitle)) {
    return "Người dùng chưa có tài khoản trùng thông tin đăng ký";
  }

  if (/đăng nhập/i.test(model.mainTitle)) {
    return "Người dùng có tài khoản hợp lệ trong hệ thống";
  }

  if (model.includeLogin) {
    return "Người dùng đã đăng nhập vào hệ thống";
  }

  return "Người dùng có quyền truy cập chức năng";
}

function buildPostcondition(model) {
  const lastMessage = model.sequenceInfo.messages[model.sequenceInfo.messages.length - 1];

  if (lastMessage && lastMessage.text) {
    const sentence = toSentence(lastMessage.text);
    return sentence.endsWith(".") ? sentence : `${sentence}.`;
  }

  return `Hệ thống ghi nhận và hoàn tất chức năng ${lowerFirst(model.mainTitle)}.`;
}

function buildUseCaseTable(model) {
  const actors = model.sequenceInfo.actors.length
    ? model.sequenceInfo.actors.map((actor) => actor.label).join(", ")
    : "Người dùng";

  const purpose = `Thực hiện nghiệp vụ ${lowerFirst(model.mainTitle)} theo phạm vi chức năng của hệ thống.`;
  const description = `Mô tả tương tác giữa tác nhân và hệ thống khi thực hiện ${lowerFirst(model.mainTitle)}.`;

  const mainFlow = buildMainFlow(model)
    .map((step, index) => `${index + 1}. ${step}`)
    .join("<br>");

  const alternatives = buildAlternativeFlows(model).join("<br>");
  const requirements = buildSpecificRequirements(model).join("<br>");
  const precondition = buildPrecondition(model);
  const postcondition = buildPostcondition(model);

  return [
    "| Trường | Nội dung |",
    "|---|---|",
    `| Use case | ${model.mainTitle} |`,
    `| Tác nhân | ${actors} |`,
    `| Mục đích | ${purpose} |`,
    `| Mô tả chung | ${description} |`,
    `| Luồng sự kiện chính | ${mainFlow} |`,
    `| Luồng thay thế | ${alternatives} |`,
    `| Các yêu cầu cụ thể | ${requirements} |`,
    `| Điều kiện trước | ${precondition} |`,
    `| Điều kiện sau | ${postcondition} |`,
  ];
}

function buildReadme(rows) {
  const lines = [];

  lines.push("# Use Case Models");
  lines.push("");
  lines.push("File nguồn: docs/usecase-sequence-activity-all.txt");
  lines.push("");
  lines.push("## Danh sách use case");
  lines.push("");
  lines.push("| Use case | PlantUML code | Ảnh SVG | Ảnh PNG | PDF | Trạng thái render | ");
  lines.push("|---|---|---|---|---|---|");

  for (const row of rows) {
    const status = row.error ? `Lỗi: ${row.error}` : "OK";
    lines.push(
      `| ${row.label} | [${row.pumlPath}](${row.pumlPath}) | [${row.imagePath}](${row.imagePath}) | [${row.pngPath}](${row.pngPath}) | [${row.pdfPath}](${row.pdfPath}) | ${status} |`
    );
  }

  lines.push("");
  lines.push("## Chạy lại render");
  lines.push("");
  lines.push("- Lệnh: `npm run render:usecase`.");
  lines.push("- Script sẽ tự parse toàn bộ UC, sinh code PlantUML và render SVG/PNG/PDF qua Kroki.");

  return `${lines.join("\n")}\n`;
}

function buildRenderedDoc(rows) {
  const lines = [];

  lines.push("# Use Case Models Rendered");
  lines.push("");
  lines.push("Mỗi use case gồm: ảnh UML use case và bảng đặc tả ngắn gọn.");
  lines.push("");

  for (const row of rows) {
    lines.push(`## ${row.label}`);
    lines.push("");
    lines.push(`![${row.label}](${row.imagePath})`);
    lines.push("");
    lines.push(`- PlantUML code: [${row.pumlPath}](${row.pumlPath})`);
    lines.push(`- PNG: [${row.pngPath}](${row.pngPath})`);
    lines.push(`- PDF: [${row.pdfPath}](${row.pdfPath})`);
    lines.push("");
    lines.push(...row.tableLines);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Input file not found: ${relFromRoot(INPUT_PATH)}`);
  }

  ensureDir(OUT.pumlDir);
  ensureDir(OUT.imageDir);
  ensureDir(OUT.pngDir);
  ensureDir(OUT.pdfDir);

  const rawText = fs.readFileSync(INPUT_PATH, "utf8");
  const useCases = splitUseCases(rawText).filter((item) => item.id && item.title);

  if (!useCases.length) {
    throw new Error("No use case blocks found in input.");
  }

  const rows = [];
  let svgSuccess = 0;
  let pngSuccess = 0;
  let pdfSuccess = 0;

  for (const uc of useCases) {
    if (!uc.mermaid || !uc.mermaid.includes("sequenceDiagram")) {
      throw new Error(`Missing Mermaid block in UC${uc.id} - ${uc.title}`);
    }

    const model = inferUseCaseModel(uc);
    const baseName = `uc${uc.id}-${slugifyVietnamese(model.mainTitle || uc.title)}`;

    const pumlAbs = path.join(OUT.pumlDir, `${baseName}.puml`);
    const imageAbs = path.join(OUT.imageDir, `${baseName}.svg`);
    const pngAbs = path.join(OUT.pngDir, `${baseName}.png`);
    const pdfAbs = path.join(OUT.pdfDir, `${baseName}.pdf`);

    const pumlContent = buildUseCasePuml(model);
    fs.writeFileSync(pumlAbs, pumlContent, "utf8");

    const renderErrors = [];

    try {
      const rendered = await postToKroki("plantuml", "svg", pumlContent);
      fs.writeFileSync(imageAbs, rendered);
      svgSuccess += 1;
    } catch (error) {
      renderErrors.push(`SVG: ${error.message}`);
    }

    try {
      const rendered = await postToKroki("plantuml", "png", pumlContent);
      fs.writeFileSync(pngAbs, rendered);
      pngSuccess += 1;
    } catch (error) {
      renderErrors.push(`PNG: ${error.message}`);
    }

    try {
      const rendered = await postToKroki("plantuml", "pdf", pumlContent);
      fs.writeFileSync(pdfAbs, rendered);
      pdfSuccess += 1;
    } catch (error) {
      renderErrors.push(`PDF: ${error.message}`);
    }

    if (renderErrors.length) {
      console.error(`[WARN] UC${uc.id} render failed: ${renderErrors.join(" | ")}`);
    }

    const row = {
      label: `UC${uc.id} - ${uc.title}`,
      pumlPath: relFromDocs(pumlAbs),
      imagePath: relFromDocs(imageAbs),
      pngPath: relFromDocs(pngAbs),
      pdfPath: relFromDocs(pdfAbs),
      tableLines: buildUseCaseTable(model),
      error: renderErrors.join(" | "),
    };

    rows.push(row);
    console.log(`[OK] Processed UC${uc.id} - ${uc.title}`);
  }

  fs.writeFileSync(OUT.readme, buildReadme(rows), "utf8");
  fs.writeFileSync(OUT.renderedDoc, buildRenderedDoc(rows), "utf8");

  const failed = rows.filter((row) => row.error).length;

  console.log("----------------------------------------");
  console.log(`Total use cases: ${rows.length}`);
  console.log(`SVG success: ${svgSuccess}/${rows.length}`);
  console.log(`PNG success: ${pngSuccess}/${rows.length}`);
  console.log(`PDF success: ${pdfSuccess}/${rows.length}`);
  console.log(`All-format success: ${rows.length - failed}`);
  console.log(`Render failed: ${failed}`);
  console.log(`Readme: ${relFromRoot(OUT.readme)}`);
  console.log(`Rendered doc: ${relFromRoot(OUT.renderedDoc)}`);

  if (failed > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message}`);
  process.exitCode = 1;
});
