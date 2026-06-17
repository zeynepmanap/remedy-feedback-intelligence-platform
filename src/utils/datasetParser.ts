import * as XLSX from "xlsx";

export type NormalizedDatasetRow = {
  brand: string;
  title: string;
  text: string;
  date: string;
  category: string;
  sentiment: string;
};

const COLUMN_ALIASES = {
  brand: ["brand", "marka", "company"],
  title: ["title", "baslik", "başlık", "subject", "konu"],
  complaint: [
    "complaint",
    "complaint text",
    "complaint_text",
    "customer complaint",
    "feedback",
    "feedback text",
    "text",
    "description",
    "sikayet",
    "şikayet",
    "sikayet metni",
    "şikayet metni",
    "yorum",
    "comment",
    "review",
    "message",
    "content",
    "icerik",
    "içerik",
    "detail",
    "detay",
    "post",
    "post text",
    "body",
  ],
  date: ["date", "created at", "created_at", "tarih"],
  category: ["category", "kategori", "topic"],
  sentiment: ["sentiment", "duygu"],
} as const;

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replace(/^\uFEFF/, "").trim();
}

function normalizedAliases(aliases: readonly string[]) {
  return aliases.map(normalizeKey);
}

function flattenRecord(
  value: unknown,
  prefix = "",
  output: Record<string, unknown> = {}
) {
  if (value === null || value === undefined) return output;

  if (Array.isArray(value)) {
    if (value.every((item) => item === null || typeof item !== "object")) {
      output[prefix] = value.map(normalizeValue).filter(Boolean).join(" ");
    }
    return output;
  }

  if (typeof value !== "object") {
    if (prefix) output[prefix] = value;
    return output;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, nestedValue]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    if (
      nestedValue !== null &&
      typeof nestedValue === "object" &&
      !Array.isArray(nestedValue)
    ) {
      flattenRecord(nestedValue, path, output);
    } else if (
      Array.isArray(nestedValue) &&
      nestedValue.some((item) => item && typeof item === "object")
    ) {
      return;
    } else {
      flattenRecord(nestedValue, path, output);
    }
  });

  return output;
}

function semanticKeyScore(key: string, aliases: readonly string[]) {
  const normalizedKey = normalizeKey(key.replaceAll(".", " "));
  const leafKey = normalizeKey(key.split(".").pop() || key);
  const keyTokens = new Set(normalizedKey.split(" ").filter(Boolean));

  return Math.max(
    ...normalizedAliases(aliases).map((alias) => {
      const aliasTokens = alias.split(" ").filter(Boolean);

      if (normalizedKey === alias) return 120;
      if (leafKey === alias) return 115;
      if (normalizedKey.endsWith(` ${alias}`)) return 105;
      if (normalizedKey.startsWith(`${alias} `)) return 100;
      if (aliasTokens.every((token) => keyTokens.has(token))) {
        return 88 + Math.min(aliasTokens.length * 3, 9);
      }
      if (alias.length >= 4 && normalizedKey.includes(alias)) return 82;

      const overlap = aliasTokens.filter((token) => keyTokens.has(token)).length;
      return overlap > 0 ? 55 + overlap * 8 : 0;
    })
  );
}

function getRecordValue(
  record: Record<string, unknown>,
  aliases: readonly string[],
  preferLongText = false
) {
  const flattened = flattenRecord(record);
  let bestValue = "";
  let bestScore = 0;

  Object.entries(flattened).forEach(([key, value]) => {
    const normalizedValue = normalizeValue(value);
    if (!normalizedValue) return;

    const semanticScore = semanticKeyScore(key, aliases);
    if (semanticScore < 60) return;

    const textBonus = preferLongText
      ? Math.min(normalizedValue.length / 40, 15)
      : 0;
    const score = semanticScore + textBonus;

    if (score > bestScore) {
      bestScore = score;
      bestValue = normalizedValue;
    }
  });

  return bestValue;
}

function isRecognizedHeader(header: string) {
  return Object.values(COLUMN_ALIASES).some(
    (aliases) => semanticKeyScore(header, aliases) >= 82
  );
}

function inferBrand(fileName: string) {
  const normalized = normalizeKey(fileName);
  const brands = [
    "tesla",
    "togg",
    "bmw",
    "ford",
    "toyota",
    "hyundai",
    "renault",
    "volkswagen",
    "mercedes",
    "audi",
  ];
  const match = brands.find((brand) => normalized.includes(brand));
  return match ? match.toLocaleUpperCase("tr-TR") : "GENEL";
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  const candidates = [",", ";", "\t", "|"];

  return candidates
    .map((delimiter) => ({
      delimiter,
      count: firstLine.split(delimiter).length - 1,
    }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ",";
}

function parseCSVRows(text: string): string[][] {
  let source = text.replace(/^\uFEFF/, "");

  if (source.toLocaleLowerCase("tr-TR").startsWith("sep=")) {
    source = source.split(/\r?\n/).slice(1).join("\n");
  }

  const delimiter = detectDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(current.trim());
      current = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (current || row.length) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = "";
      }

      if (character === "\r" && next === "\n") index += 1;
    } else {
      current += character;
    }
  }

  if (current || row.length) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows.filter((values) => values.some((value) => value.trim()));
}

function csvToRecords(text: string): Record<string, unknown>[] {
  const rows = parseCSVRows(text);
  if (!rows.length) return [];

  const headers = rows[0].map((header, index) => header || `column_${index + 1}`);
  const hasHeader = headers.some(isRecognizedHeader);

  if (!hasHeader) {
    return rows.map((values) => ({
      complaint: values.filter(Boolean).join(" "),
    }));
  }

  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function primitiveFields(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, fieldValue]) =>
        fieldValue === null ||
        fieldValue === undefined ||
        typeof fieldValue !== "object" ||
        (Array.isArray(fieldValue) &&
          fieldValue.every((item) => item === null || typeof item !== "object"))
    )
  );
}

function jsonToRecords(
  value: unknown,
  inherited: Record<string, unknown> = {}
): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => jsonToRecords(item, inherited));
  }

  if (!value || typeof value !== "object") return [];

  const objectValue = value as Record<string, unknown>;
  const currentMetadata = {
    ...inherited,
    ...primitiveFields(objectValue),
  };
  const nestedObjectArrays = Object.values(objectValue).filter(
    (nestedValue) =>
      Array.isArray(nestedValue) &&
      nestedValue.some((item) => item && typeof item === "object")
  );

  if (nestedObjectArrays.length > 0) {
    return nestedObjectArrays.flatMap((nestedValue) =>
      jsonToRecords(nestedValue, currentMetadata)
    );
  }

  const containsComplaint =
    Boolean(getRecordValue(objectValue, COLUMN_ALIASES.complaint, true)) ||
    Boolean(getRecordValue(objectValue, COLUMN_ALIASES.title));

  if (containsComplaint) {
    return [{ ...inherited, ...objectValue }];
  }

  const nestedCollections = Object.values(objectValue).filter(
    (nestedValue) =>
      nestedValue &&
      typeof nestedValue === "object" &&
      !Array.isArray(nestedValue)
  );

  if (nestedCollections.length > 0) {
    const nestedRecords = nestedCollections.flatMap((nestedValue) =>
      jsonToRecords(nestedValue, currentMetadata)
    );

    if (nestedRecords.length > 0) return nestedRecords;
  }

  return [{ ...inherited, ...objectValue }];
}

function normalizeRecords(records: Record<string, unknown>[], fileName: string) {
  const fallbackBrand = inferBrand(fileName);

  return records
    .map((record) => {
      const title = getRecordValue(record, COLUMN_ALIASES.title);
      const complaint = getRecordValue(record, COLUMN_ALIASES.complaint, true);
      const text = complaint || title;

      if (text.trim().length < 4) return null;

      return {
        brand: getRecordValue(record, COLUMN_ALIASES.brand) || fallbackBrand,
        title: title || text.slice(0, 120),
        text,
        date: getRecordValue(record, COLUMN_ALIASES.date),
        category: getRecordValue(record, COLUMN_ALIASES.category),
        sentiment: getRecordValue(record, COLUMN_ALIASES.sentiment),
      } satisfies NormalizedDatasetRow;
    })
    .filter((row): row is NormalizedDatasetRow => row !== null);
}

function escapeCSV(value: string) {
  const escaped = value.replaceAll('"', '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function normalizedRowsToCSV(rows: NormalizedDatasetRow[]) {
  const headers: (keyof NormalizedDatasetRow)[] = [
    "brand",
    "title",
    "text",
    "date",
    "category",
    "sentiment",
  ];

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCSV(row[header])).join(",")),
  ].join("\n");
}

export async function parseAndNormalizeDataset(file: File) {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase("tr-TR");
  let records: Record<string, unknown>[] = [];

  if (extension === "xlsx") {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    records = firstSheet
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          defval: "",
          raw: false,
        })
      : [];
  } else if (extension === "json") {
    const parsed = JSON.parse(await file.text());
    records = jsonToRecords(parsed);
  } else {
    records = csvToRecords(await file.text());
  }

  const rows = normalizeRecords(records, file.name);

  return {
    rows,
    csv: normalizedRowsToCSV(rows),
    brand: rows.find((row) => row.brand)?.brand || inferBrand(file.name),
  };
}
