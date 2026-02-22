/**
 * Notes Store - Zustand store for managing notes
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesState {
  notes: Note[];
  addNote: (content: string, title?: string) => Note;
  updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => void;
  deleteNote: (id: string) => void;
  getNote: (id: string) => Note | undefined;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const generateTitle = (content: string): string => {
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length > 0) {
    return firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine;
  }
  return 'Новая заметка';
};

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],

      addNote: (content: string, title?: string) => {
        const now = new Date().toISOString();
        const newNote: Note = {
          id: generateId(),
          title: title || generateTitle(content),
          content,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          notes: [newNote, ...state.notes],
        }));
        return newNote;
      },

      updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content'>>) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? {
                  ...note,
                  ...updates,
                  title: updates.content ? generateTitle(updates.content) : updates.title || note.title,
                  updatedAt: new Date().toISOString(),
                }
              : note
          ),
        }));
      },

      deleteNote: (id: string) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
        }));
      },

      getNote: (id: string) => {
        return get().notes.find((note) => note.id === id);
      },
    }),
    {
      name: 'reword-notes-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Sanitize notes on hydration to prevent crashes from corrupted data
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.notes = state.notes
            .filter((note: Note) => note && typeof note.id === 'string')
            .map((note: Note) => ({
              ...note,
              title: note.title ?? 'Новая заметка',
              content: note.content ?? '',
              createdAt: note.createdAt ?? new Date().toISOString(),
              updatedAt: note.updatedAt ?? new Date().toISOString(),
            }));
        }
      },
    }
  )
);
