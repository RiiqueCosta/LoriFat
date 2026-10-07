/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Check, Pencil, Plus, StickyNote, Trash2, X } from 'lucide-react';
import { AppRecord, Note } from '../types';
import { cn, formatDateLong, generateId, normalizeText } from '../lib/utils';
import { useActions } from '../actions';
import { Button, Card, EmptyState, PageHeader, SearchInput, Textarea } from '../components/ui';

export function NotesView({ records }: { records: AppRecord[] }) {
  const actions = useActions();
  const notes = useMemo(() => records.filter((r): r is Note => r.type === 'note')
    .sort((a, b) => b.dateCreated.localeCompare(a.dateCreated)), [records]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  const filtered = notes.filter(n => !search || normalizeText(n.title).includes(normalizeText(search)));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const ok = await actions.saveNote({ id: generateId(), type: 'note', ownerId: '', title: draft.trim(), dateCreated: new Date().toISOString() });
    if (ok) { setDraft(''); setAdding(false); }
  };

  const saveEdit = async (note: Note) => {
    if (!editing || !editing.text.trim()) return;
    if (await actions.saveNote({ ...note, title: editing.text.trim() })) setEditing(null);
  };

  return (
    <div className="space-y-5 fade-in">
      <PageHeader title="Notas" description="Anotações rápidas e lembretes do dia a dia."
        actions={<Button icon={Plus} onClick={() => setAdding(true)}>Nova nota</Button>} />

      <SearchInput value={search} onChange={setSearch} placeholder="Pesquisar nas notas" className="max-w-md" />

      <div className="columns-1 md:columns-2 xl:columns-3 gap-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {adding && (
          <Card className="p-4 border-brand/40 ring-4 ring-brand/10">
            <form onSubmit={add} className="space-y-3">
              <Textarea autoFocus rows={5} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Escreva sua anotação..."
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add(e); }} />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setDraft(''); }}>Cancelar</Button>
                <Button size="sm" type="submit" disabled={!draft.trim()}>Salvar</Button>
              </div>
            </form>
          </Card>
        )}

        {filtered.map(note => (
          <Card key={note.id} className="group p-4">
            {editing?.id === note.id ? (
              <div className="space-y-3">
                <Textarea autoFocus rows={5} value={editing.text} onChange={e => setEditing({ id: note.id, text: e.target.value })} />
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" icon={X} onClick={() => setEditing(null)}>Cancelar</Button>
                  <Button size="sm" icon={Check} onClick={() => saveEdit(note)}>Salvar</Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">{note.title}</p>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[11px] text-zinc-400">{formatDateLong(note.dateCreated)}</p>
                  <div className={cn('flex gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity')}>
                    <button onClick={() => setEditing({ id: note.id, text: note.title })} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800" aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => actions.remove(note)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" aria-label="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      {!adding && filtered.length === 0 && (
        <Card>
          <EmptyState icon={StickyNote} title={notes.length ? 'Nenhuma nota encontrada' : 'Nenhuma nota ainda'}
            description={notes.length ? undefined : 'Anote senhas de Wi-Fi, pendências e lembretes.'}
            action={!notes.length ? <Button icon={Plus} onClick={() => setAdding(true)}>Criar nota</Button> : undefined} />
        </Card>
      )}
    </div>
  );
}
