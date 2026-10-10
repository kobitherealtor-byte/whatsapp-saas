'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MediaUpload from '@/components/MediaUpload';
import { createBroadcastCampaign } from '@/app/actions/broadcasts';
import { createClient } from '@/lib/supabase/client';

type Recipient = {
  name?: string;
  phone: string;
};

function splitLine(line: string): Recipient | null {
  const clean = line.trim();
  if (!clean) return null;

  const delimiter = clean.includes('\t')
    ? '\t'
    : clean.includes(';')
      ? ';'
      : clean.includes(',')
        ? ','
        : null;

  if (!delimiter) return { phone: clean };

  const parts = clean.split(delimiter).map((part) => part.trim());
  if (parts.length === 1) return { phone: parts[0] };

  const firstHasDigits = /\d/.test(parts[0]);
  const secondHasDigits = /\d/.test(parts[1]);

  if (firstHasDigits && !secondHasDigits) {
    return { phone: parts[0], name: parts[1] };
  }

  return { name: parts[0], phone: parts[1] };
}

function parseRecipientText(text: string) {
  const raw = text
    .split(/\r?\n/)
    .map(splitLine)
    .filter((item): item is Recipient => Boolean(item));

  const valid: Recipient[] = [];
  const seen = new Set<string>();
  let invalid = 0;
  let duplicates = 0;

  for (const item of raw) {
    let digits = item.phone.replace(/\D/g, '');
    if (digits.startsWith('00972')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = `972${digits.slice(1)}`;

    if (digits.length < 10 || digits.length > 15) {
      invalid += 1;
      continue;
    }

    if (seen.has(digits)) {
      duplicates += 1;
      continue;
    }

    seen.add(digits);
    valid.push(item);
  }

  return {
    valid,
    invalid,
    duplicates,
    total: raw.length,
  };
}

export default function NewBroadcastForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [recipientsText, setRecipientsText] = useState('');
  const [sendNow, setSendNow] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [intervalSeconds, setIntervalSeconds] = useState(3);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importingFile, setImportingFile] = useState(false);
  const [error, setError] = useState('');

  const parsed = useMemo(
    () => parseRecipientText(recipientsText),
    [recipientsText],
  );

  const importFile = async (file: File) => {
    setError('');
    setImportingFile(true);

    try {
      if (/\.(csv|txt)$/i.test(file.name)) {
        const text = await file.text();
        setRecipientsText(text);
        setFileName(file.name);
        return;
      }

      if (/\.xlsx$/i.test(file.name)) {
        const supabase = createClient();
        const form = new FormData();
        form.append('file', file);

        const { data, error: functionError } = await supabase.functions.invoke(
          'parse-broadcast-xlsx',
          { body: form },
        );

        if (functionError) throw functionError;

        const rows = (data?.rows ?? []) as Array<{ name?: string; phone: string }>;
        if (!rows.length) {
          throw new Error('לא נמצאו מספרי טלפון תקינים בקובץ ה-Excel.');
        }

        setRecipientsText(
          rows
            .map((row) =>
              row.name?.trim()
                ? `${row.name.trim()}, ${row.phone}`
                : row.phone,
            )
            .join('\n'),
        );
        setFileName(file.name);
        return;
      }

      throw new Error('אפשר לייבא קובצי XLSX, CSV או TXT.');
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'ייבוא הקובץ נכשל.',
      );
    } finally {
      setImportingFile(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (parsed.valid.length === 0) {
        throw new Error('לא נמצאו נמענים תקינים.');
      }

      let scheduledAt: string;
      if (sendNow) {
        scheduledAt = new Date(Date.now() + 30_000).toISOString();
      } else {
        if (!date || !time) throw new Error('בחר תאריך ושעת שליחה.');
        scheduledAt = `${date}T${time}`;
      }

      const result = await createBroadcastCampaign({
        name,
        message,
        mediaUrl,
        scheduledAt,
        intervalSeconds,
        recipients: parsed.valid,
      });

      router.push(`/broadcasts/${result.id}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'יצירת הקמפיין נכשלה.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black">1. נמענים</h2>
        <p className="mt-1 text-sm text-slate-500">
          הדבק מספר בכל שורה, או שם ומספר מופרדים בפסיק / נקודה-פסיק / Tab.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
            {importingFile ? 'מייבא...' : 'העלה Excel / CSV / TXT'}
            <input
              type="file"
              accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
              className="hidden"
              disabled={importingFile}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
                event.currentTarget.value = '';
              }}
            />
          </label>
          {fileName && (
            <span className="text-xs font-semibold text-slate-500">
              {fileName}
            </span>
          )}
        </div>

        <textarea
          value={recipientsText}
          onChange={(event) => setRecipientsText(event.target.value)}
          rows={10}
          placeholder={'0541234567\nיוסי כהן, 0521234567\nשרון; 0501234567'}
          className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none focus:border-emerald-500"
        />

        {parsed.valid.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-black">תצוגה מקדימה</div>
              <div className="text-xs text-slate-400">
                מציג עד 20 נמענים ראשונים
              </div>
            </div>
            <div className="space-y-2">
              {parsed.valid.slice(0, 20).map((recipient, index) => (
                <div
                  key={`${recipient.phone}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold">
                      {recipient.name || 'ללא שם'}
                    </div>
                    <div className="text-xs text-slate-400">{recipient.phone}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const normalizedTarget = recipient.phone.replace(/\D/g, '');
                      const lines = recipientsText.split(/\r?\n/);
                      const next = lines.filter((line) => {
                        const parsedLine = splitLine(line);
                        if (!parsedLine) return true;
                        return parsedLine.phone.replace(/\D/g, '') !== normalizedTarget;
                      });
                      setRecipientsText(next.join('\n'));
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-800"
                  >
                    הסר
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xl font-black">{parsed.total}</div>
            <div className="text-xs text-slate-500">שורות שנקלטו</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <div className="text-xl font-black text-emerald-800">
              {parsed.valid.length}
            </div>
            <div className="text-xs text-emerald-700">מוכנים לשליחה</div>
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <div className="text-xl font-black text-amber-800">
              {parsed.duplicates}
            </div>
            <div className="text-xs text-amber-700">כפולים הוסרו</div>
          </div>
          <div className="rounded-xl bg-red-50 p-3">
            <div className="text-xl font-black text-red-800">
              {parsed.invalid}
            </div>
            <div className="text-xs text-red-700">לא תקינים</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black">2. ההודעה</h2>

        <label className="mt-4 block text-sm font-bold text-slate-700">
          שם הקמפיין
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={120}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
          />
        </label>

        <label className="mt-4 block text-sm font-bold text-slate-700">
          תוכן ההודעה
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            rows={6}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-500"
          />
        </label>

        <div className="mt-4">
          <div className="mb-2 text-sm font-bold text-slate-700">מדיה</div>
          <MediaUpload
            value={mediaUrl}
            onChange={setMediaUrl}
            disabled={loading}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black">3. מתי ובאיזה קצב</h2>

        <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={sendNow}
            onChange={(event) => setSendNow(event.target.checked)}
          />
          <span className="font-bold">שלח מיד אחרי האישור</span>
        </label>

        {!sendNow && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              תאריך
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required={!sendNow}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
              />
            </label>
            <label className="text-sm font-bold text-slate-700">
              שעה
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                required={!sendNow}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
              />
            </label>
          </div>
        )}

        <label className="mt-4 block text-sm font-bold text-slate-700">
          מרווח בין הודעות
          <select
            value={intervalSeconds}
            onChange={(event) => setIntervalSeconds(Number(event.target.value))}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal"
          >
            <option value={2}>מהיר — 2 שניות</option>
            <option value={3}>רגיל — 3 שניות</option>
            <option value={5}>רגוע — 5 שניות</option>
            <option value={10}>איטי — 10 שניות</option>
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-400">
            השליחות יוצאות כהודעות אישיות נפרדות לכל נמען.
          </span>
        </label>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="font-black">מוכן לאישור</div>
        <div className="mt-2 text-sm text-emerald-900">
          {parsed.valid.length} נמענים ·{' '}
          {sendNow
            ? 'שליחה מידית'
            : date && time
              ? `${date} בשעה ${time}`
              : 'טרם נבחר מועד'}
          {' · '}
          מרווח {intervalSeconds} שניות
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Link
          href="/broadcasts"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center font-bold text-slate-600"
        >
          ביטול
        </Link>
        <button
          type="submit"
          disabled={loading || parsed.valid.length === 0}
          className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'יוצר קמפיין...' : `צור קמפיין ל-${parsed.valid.length} נמענים`}
        </button>
      </div>
    </form>
  );
}
