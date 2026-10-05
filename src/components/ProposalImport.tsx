/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { FileUp, Type, Mic, Square, Sparkles, Loader2, FileText, Image as ImageIcon, Music, X, ChevronDown, Camera } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { calcTotals } from '../lib/billing';
import {
  extractProposal, ExtractedProposal, ProposalInput,
  ACCEPTED_FILE_TYPES, MAX_FILE_BYTES, pickRecordingMimeType,
} from '../lib/ai';
import { RecordPrefill } from './RecordForm';

type Mode = 'file' | 'text' | 'audio';

interface ProposalImportProps {
  onCancel: () => void;
  onConfirm: (type: 'quote' | 'invoice', prefill: RecordPrefill) => void;
}

const fileIcon = (mime: string) =>
  mime.startsWith('image/') ? ImageIcon : mime.startsWith('audio/') ? Music : FileText;

const formatSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

export function ProposalImport({ onCancel, onConfirm }: ProposalImportProps) {
  const [mode, setMode] = useState<Mode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [audio, setAudio] = useState<{ blob: Blob; mimeType: string; url: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ExtractedProposal | null>(null);
  const [showTranscription, setShowTranscription] = useState(false);

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

  const handleFile = (f: File | undefined | null) => {
    setError('');
    if (!f) return;
    const type = f.type || (f.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
    if (!ACCEPTED_FILE_TYPES.includes(type.split(';')[0])) {
      setError('Formato não suportado. Envie PDF, imagem (JPG/PNG), áudio ou .txt.');
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError(`Arquivo muito grande (${formatSize(f.size)}). O limite é 15 MB.`);
      return;
    }
    setFile(f);
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
          if (s + 1 >= 600 && recorderRef.current?.state === 'recording') recorderRef.current.stop(); // máx. 10 min
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Não foi possível acessar o microfone. Verifique a permissão do navegador.');
      stopStream();
    }
  };

  const stopRecording = () => recorderRef.current?.stop();

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
      setResult(await extractProposal(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const confirm = (type: 'quote' | 'invoice') => {
    if (!result) return;
    onConfirm(type, {
      clientName: result.clientName,
      clientCompany: result.clientCompany,
      clientEmail: result.clientEmail,
      clientPhone: result.clientPhone,
      items: result.items,
      taxPercent: result.taxPercent,
      discount: result.discount,
      notes: result.notes,
      dueDate: result.dueDate || undefined,
    });
  };

  // ---------- Resultado ----------
  if (result) {
    const totals = calcTotals(result.items, result.taxPercent, result.discount);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-green-700">
          <Sparkles className="w-4 h-4" /> Proposta lida com sucesso
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-400 uppercase">Cliente</p>
          <p className="font-bold text-zinc-900">{result.clientName || result.clientCompany || 'Não identificado'}</p>
          <p className="text-xs text-zinc-500">
            {[result.clientCompany !== result.clientName ? result.clientCompany : '', result.clientEmail, result.clientPhone].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 divide-y divide-zinc-100">
          {result.items.length === 0 && <p className="p-4 text-sm text-zinc-500">Nenhum item com valor encontrado. Você poderá adicioná-los no próximo passo.</p>}
          {result.items.map((it, i) => (
            <div key={i} className="p-3 flex justify-between gap-3 text-sm">
              <div>
                <p className="text-zinc-800">{it.description}</p>
                <p className="text-xs text-zinc-400">{it.quantity} × {formatCurrency(it.unitPrice)}</p>
              </div>
              <p className="font-bold text-zinc-900 whitespace-nowrap">{formatCurrency(it.quantity * it.unitPrice)}</p>
            </div>
          ))}
          <div className="p-3 flex justify-between text-sm font-black">
            <span>Total</span><span className="text-brand">{formatCurrency(totals.total)}</span>
          </div>
        </div>

        {result.transcription && (
          <div className="rounded-2xl border border-zinc-200">
            <button type="button" onClick={() => setShowTranscription(v => !v)} className="w-full p-3 flex items-center justify-between text-xs font-bold text-zinc-500 uppercase">
              Transcrição completa
              <ChevronDown className={cn('w-4 h-4 transition-transform', showTranscription && 'rotate-180')} />
            </button>
            {showTranscription && (
              <p className="px-3 pb-3 text-xs text-zinc-600 whitespace-pre-wrap max-h-48 overflow-y-auto">{result.transcription}</p>
            )}
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Criar como</p>
          <div className="grid grid-cols-2 gap-3">
            {(['quote', 'invoice'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => confirm(t)}
                className={cn(
                  'py-3.5 rounded-2xl font-bold text-sm transition-colors',
                  result.suggestedType === t
                    ? 'bg-brand text-white shadow-lg shadow-brand/20 hover:bg-brand-dark'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                )}
              >
                {t === 'quote' ? 'Orçamento' : 'Fatura'}
                {result.suggestedType === t && <span className="block text-[10px] font-medium opacity-80">sugerido pela IA</span>}
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => setResult(null)} className="w-full py-2 text-xs font-bold text-zinc-400 hover:text-zinc-600">
          Ler outra proposta
        </button>
      </div>
    );
  }

  // ---------- Entrada ----------
  const tabs: { id: Mode; label: string; icon: any }[] = [
    { id: 'file', label: 'Arquivo', icon: FileUp },
    { id: 'text', label: 'Texto', icon: Type },
    { id: 'audio', label: 'Gravar áudio', icon: Mic },
  ];
  const FileIcon = file ? fileIcon(file.type) : FileText;
  const canAnalyze = !!currentInput() && !loading && !recording;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Envie uma proposta pronta e a IA transcreve e preenche os itens, valores e dados do cliente para você revisar.
      </p>

      <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 rounded-xl">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" disabled={loading || recording} onClick={() => { setMode(t.id); setError(''); }}
              className={cn('py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                mode === t.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {mode === 'file' && (
        file ? (
          <div className="p-4 rounded-2xl border border-zinc-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center"><FileIcon className="w-5 h-5 text-brand" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-800 truncate">{file.name}</p>
              <p className="text-xs text-zinc-400">{formatSize(file.size)}</p>
            </div>
            <button type="button" onClick={() => setFile(null)} disabled={loading} className="p-2 text-zinc-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="space-y-2">
            <label
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
              className="block p-8 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-brand text-center cursor-pointer transition-colors"
            >
              <FileUp className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
              <p className="text-sm font-bold text-zinc-700">Clique ou arraste o arquivo aqui</p>
              <p className="text-xs text-zinc-400 mt-1">PDF, foto (JPG/PNG), áudio (MP3, WAV, M4A...) ou .txt · até 15 MB</p>
              <input type="file" className="hidden" accept={ACCEPTED_FILE_TYPES.join(',') + ',.pdf,.m4a,.txt'} onChange={e => handleFile(e.target.files?.[0])} />
            </label>
            <label className="sm:hidden w-full py-2.5 rounded-xl bg-zinc-100 text-zinc-600 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer">
              <Camera className="w-4 h-4" /> Tirar foto da proposta
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            </label>
          </div>
        )
      )}

      {mode === 'text' && (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:ring-2 focus:ring-brand outline-none text-sm h-48"
          placeholder="Cole aqui o texto da proposta (e-mail, WhatsApp, documento...)"
        />
      )}

      {mode === 'audio' && (
        <div className="p-6 rounded-2xl border border-zinc-200 text-center space-y-3">
          {recording ? (
            <>
              <div className="flex items-center justify-center gap-2 text-red-500 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                Gravando {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
              </div>
              <button type="button" onClick={stopRecording} className="mx-auto px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold flex items-center gap-2">
                <Square className="w-4 h-4" /> Parar
              </button>
            </>
          ) : audio ? (
            <>
              <audio controls src={audio.url} className="w-full" />
              <button type="button" onClick={() => setAudio(null)} disabled={loading} className="text-xs font-bold text-zinc-400 hover:text-red-500">Descartar e gravar de novo</button>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-500">Descreva a proposta falando: cliente, serviços, quantidades, valores e condições.</p>
              <button type="button" onClick={startRecording} className="mx-auto px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-bold flex items-center gap-2">
                <Mic className="w-4 h-4" /> Começar a gravar
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</p>}

      <div className="pt-2 flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 py-3.5 rounded-2xl bg-zinc-100 text-zinc-600 font-bold text-sm hover:bg-zinc-200 transition-colors">
          Cancelar
        </button>
        <button type="button" onClick={analyze} disabled={!canAnalyze}
          className="flex-[2] py-3.5 rounded-2xl bg-brand text-white font-bold text-sm shadow-lg shadow-brand/20 hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Lendo proposta...</> : <><Sparkles className="w-4 h-4" /> Ler com IA</>}
        </button>
      </div>
    </div>
  );
}
