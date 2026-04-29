/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Search, Trash2, StickyNote, FileEdit } from 'lucide-react';
import { Note } from '../types';
import { cn, generateId } from '../lib/utils';

interface NotesViewProps {
  records: Note[];
  onAdd: (note: Note) => void;
  onDelete: (id: string) => void;
}

export function NotesView({ records, onAdd, onDelete }: NotesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const filteredNotes = records.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    const note: Note = {
      id: generateId(),
      type: 'note',
      title: newNoteTitle,
      dateCreated: new Date().toISOString(),
      ownerId: '' // Will be set by useData hook
    };

    onAdd(note);
    setNewNoteTitle('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Bloco de Notas</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Anotações rápidas e lembretes do dia a dia.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl font-bold text-sm shadow-md shadow-brand/10 hover:bg-brand-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          Nova Nota
        </button>
      </div>

      <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
        <input 
          type="text" 
          placeholder="Pesquisar nas notas..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdding && (
          <div className="bg-orange-50 dark:bg-orange-900/10 border-2 border-dashed border-orange-200 dark:border-orange-900/30 p-6 rounded-3xl animate-pulse">
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileEdit className="w-4 h-4 text-brand" />
                <span className="text-xs font-bold text-brand uppercase tracking-wider">Nova Anotação</span>
              </div>
              <textarea 
                autoFocus
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="O que você está pensando?"
                className="w-full bg-transparent border-none outline-none text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 min-h-[100px] resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 bg-brand text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        )}

        {filteredNotes.length > 0 ? filteredNotes.map(note => (
          <div 
            key={note.id} 
            className="group relative bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-brand/30 transition-all flex flex-col h-full"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <StickyNote className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              </div>
              <button 
                onClick={() => {
                  if(window.confirm('Excluir esta nota?')) onDelete(note.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed flex-1 whitespace-pre-wrap">{note.title}</p>
            <div className="mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-800">
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase">
                {new Date(note.dateCreated).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </p>
            </div>
            
            {/* Visual accent */}
            <div className="absolute top-0 right-12 w-6 h-1 bg-brand rounded-b-full opacity-10 group-hover:opacity-100 transition-opacity" />
          </div>
        )) : !isAdding && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
            <StickyNote className="w-12 h-12 opacity-10 mb-4" />
            <p className="font-medium">Nenhuma nota encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
