/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera, FileText, FileUp, Image as ImageIcon, Mic, Music, Sparkles, Square, Type, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ACCEPTED_FILE_TYPES, MAX_FILE_BYTES, pickRecordingMimeType, ProposalInput } from '../../lib/ai';
import { Button, Segmented, Textarea } from '../ui';

type Mode = 'file' | 'text' | 'audio';

const fileIcon = (mime: string) => (mime.startsWith('image/') ? ImageIcon : mime.startsWith('audio/') ? Music : FileText);
const formatSize = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

export function AiInputPicker({ intro, allowAudio = true, textPlaceholder, analyzeLabel = 'Ler com IA', loadingLabel = 'Lendo...', onAnalyze, onCancel, fileHint }: {
  intro: React.ReactNode;
  allowAudio?: boolean;
  textPlaceholder: string;
  analyzeLabel?: string;
  loadingLabel?: string;
  fileHint?: string;
  onAnalyze: (input: ProposalInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<Mode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [audio, setAudio] = useState<{ blob: Blob; mimeType: string; url: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    stopStream();
  }, []);
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio.url); }, [audio]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFile = (f: File | undefined | null) => {
    setError('');
    if (!f) return;
    const type = (f.type || (f.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '')).split(';')[0];
    if (!ACCEPTED_FILE_TYPES.includes(type)) {
      setError('Formato não suportado. Envie PDF, imagem (JPG/PNG), áudio ou .txt.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError(`Arquivo muito grande (${formatSize(f.size)}). O limite é 15 MB.`);
      return;
    }
    setFile(f);
    setPreview(type.startsWith('image/') ? URL.createObjectURL(f) : null);
  };

  const startRecording = async () => {
    setError('');
    const mimeType = pickRecordingMimeType();
    if (!navigator.mediaDevices?.getUserMedia || !mimeType) {
      setError('Seu navegador não permite gravar áudio. Envie um arquivo de áudio na aba "Arquivo".');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setAudio({ blob, mimeType, url: URL.createObjectURL(blob) });
        setRecording(false);
        stopStream();
      };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setSeconds(s => {
          if (s + 1 >= 600 && recorderRef.current?.state === 'recording') recorderRef.current.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Não foi possível acessar o microfone. Verifique a permissão do navegador.');
      stopStream();
    }
  };

  const currentInput = (): ProposalInput | null => {
    if (mode === 'text') return text.trim() ? { kind: 'text', text } : null;
    if (mode === 'file') return file ? { kind: 'file', file, mimeType: file.type || 'application/pdf' } : null;
    return audio ? { kind: 'file', file: audio.blob, mimeType: audio.mimeType } : null;
  };

  const analyze = async () => {
    const input = currentInput();
    if (!input) return;
    setLoading(true);
    setError('');
    try {
      await onAnalyze(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const FileIcon = file ? fileIcon(file.type) : FileText;
  const options: { value: Mode; label: React.ReactNode }[] = [
    { value: 'file', label: <><FileUp className="w-3.5 h-3.5" /> Arquivo ou foto</> },
    { value: 'text', label: <><Type className="w-3.5 h-3.5" /> Texto</> },
    ...(allowAudio ? [{ value: 'audio' as Mode, label: <><Mic className="w-3.5 h-3.5" /> Áudio</> }] : []),
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{intro}</p>

      <Segmented options={options} value={mode} onChange={m => { if (!loading && !recording) { setMode(m); setError(''); } }} className="w-full [&>button]:flex-1 [&>button]:justify-center" />

      {mode === 'file' && (
        file ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {preview && <img src={preview} alt="" className="w-full max-h-56 object-contain bg-zinc-50 dark:bg-zinc-800" />}
            <div className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-brand/10 flex items-center justify-center"><FileIcon className="w-5 h-5 text-brand" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{file.name}</p>
                <p className="text-xs text-zinc-400">{formatSize(file.size)}</p>
              </div>
              <button type="button" onClick={() => { setFile(null); setPreview(null); }} disabled={loading} className="p-2 text-zinc-400 hover:text-red-500" aria-label="Remover arquivo">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
              className={cn('block p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors',
                dragOver ? 'border-brand bg-orange-50/60 dark:bg-brand/10' : 'border-zinc-200 dark:border-zinc-700 hover:border-brand/60')}
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <FileUp className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-zinc-400 mt-1">{fileHint || 'PDF, foto (JPG/PNG), áudio ou .txt · até 15 MB'}</p>
              <input type="file" className="hidden" accept={ACCEPTED_FILE_TYPES.join(',') + ',.pdf,.m4a,.txt'} onChange={e => handleFile(e.target.files?.[0])} />
            </label>
            <label className="sm:hidden h-11 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer">
              <Camera className="w-4 h-4" /> Tirar foto agora
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            </label>
          </div>
        )
      )}

      {mode === 'text' && (
        <Textarea value={text} onChange={e => setText(e.target.value)} disabled={loading} rows={8} placeholder={textPlaceholder} />
      )}

      {mode === 'audio' && (
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center space-y-3">
          {recording ? (
            <>
              <div className="flex items-center justify-center gap-2 text-red-500 font-semibold tabular-nums">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                Gravando {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
              </div>
              <Button variant="danger" icon={Square} onClick={() => recorderRef.current?.stop()}>Parar</Button>
            </>
          ) : audio ? (
            <>
              <audio controls src={audio.url} className="w-full" />
              <button type="button" onClick={() => setAudio(null)} disabled={loading} className="text-xs font-semibold text-zinc-400 hover:text-red-500">Descartar e gravar de novo</button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 mx-auto rounded-full bg-orange-50 dark:bg-brand/10 flex items-center justify-center"><Mic className="w-6 h-6 text-brand" /></div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Fale o cliente, os serviços, as quantidades, os valores e as condições.</p>
              <Button icon={Mic} onClick={startRecording}>Começar a gravar</Button>
            </>
          )}
        </div>
      )}

      {error && <p className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm whitespace-pre-line break-words">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button onClick={analyze} disabled={!currentInput() || recording} loading={loading} icon={loading ? undefined : Sparkles} className="flex-[2]">
          {loading ? loadingLabel : analyzeLabel}
        </Button>
      </div>
    </div>
  );
}
