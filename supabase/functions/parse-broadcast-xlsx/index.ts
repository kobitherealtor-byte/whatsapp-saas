import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import ExcelJS from "npm:exceljs@4.4.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && value && "text" in value) {
    return String((value as { text?: unknown }).text ?? "");
  }
  if (typeof value === "object" && value && "result" in value) {
    return String((value as { result?: unknown }).result ?? "");
  }
  return String(value).trim();
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new Error("missing_file");
    }

    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "file_too_large" }), {
        status: 413,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!/\.(xlsx)$/i.test(file.name)) {
      return new Response(JSON.stringify({ error: "unsupported_file" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const workbook = new ExcelJS.Workbook();
    const bytes = new Uint8Array(await file.arrayBuffer());
    await workbook.xlsx.load(bytes);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new Error("empty_workbook");
    }

    const rows: Array<{ name?: string; phone: string }> = [];
    let skippedHeaders = 0;

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rows.length >= 5000) return;

      const values = [
        cellText(row.getCell(1).value),
        cellText(row.getCell(2).value),
        cellText(row.getCell(3).value),
      ].filter(Boolean);

      if (values.length === 0) return;

      const phoneIndex = values.findIndex(looksLikePhone);
      if (phoneIndex === -1) {
        if (rowNumber <= 3) skippedHeaders += 1;
        return;
      }

      const phone = values[phoneIndex];
      const name = values.find((value, index) => index !== phoneIndex && !looksLikePhone(value));

      rows.push({ phone, name: name || undefined });
    });

    return new Response(
      JSON.stringify({
        rows,
        sheetName: sheet.name,
        imported: rows.length,
        skippedHeaders,
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  } catch {
    return new Response(JSON.stringify({ error: "parse_failed" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
