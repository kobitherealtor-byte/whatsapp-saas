'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useFeatureFlags } from '@/lib/use-feature-flags';

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
]);

export default function MediaUpload({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const features = useFeatureFlags();
  const mediaAllowed = features === null || features.media_upload !== false;

  const upload = async (file: File) => {
    setError('');

    if (!allowedTypes.has(file.type)) {
      setError('סוג הקובץ אינו נתמך. אפשר להעלות תמונה, PDF או MP4.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('הקובץ גדול מדי. המגבלה היא 20MB.');
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('צריך להתחבר מחדש למערכת.');
      }

      const extension = file.name.includes('.')
        ? file.name.split('.').pop()?.toLowerCase()
        : undefined;
      const safeExtension = extension?.replace(/[^a-z0-9]/g, '') || 'bin';
      const path = `${user.id}/${crypto.randomUUID()}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('message-media')
        .upload(path, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('message-media').getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'העלאת הקובץ נכשלה.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className={`inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 ${disabled || uploading || !mediaAllowed ? 'pointer-events-none opacity-50' : ''}`}>
          {uploading ? 'מעלה...' : 'העלה תמונה / קובץ'}
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4"
            disabled={disabled || uploading || !mediaAllowed}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.currentTarget.value = '';
            }}
          />
        </label>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={disabled || uploading || !mediaAllowed}
            className="text-sm font-bold text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            הסר מדיה
          </button>
        )}
      </div>

      {value && (
        <div className="mt-2 break-all rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          קובץ מצורף מוכן לשליחה
        </div>
      )}

      {!mediaAllowed && (
        <div className="mt-2 text-xs font-semibold text-amber-700">
          שליחת מדיה אינה כלולה כרגע בחבילה שלך.
        </div>
      )}
      {error && <div className="mt-2 text-xs font-semibold text-red-600">{error}</div>}
      <div className="mt-2 text-xs text-slate-400">עד 20MB · JPG, PNG, WEBP, GIF, PDF או MP4</div>
    </div>
  );
}
