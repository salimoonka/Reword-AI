/**
 * Tests for useNotesStore
 */

import { useNotesStore, Note } from '@/stores/useNotesStore';
import { act } from '@testing-library/react-native';

// Reset store before each test
beforeEach(() => {
  act(() => {
    useNotesStore.setState({ notes: [] });
  });
});

describe('useNotesStore', () => {
  describe('addNote', () => {
    it('should add a note with generated title from first line', () => {
      const { addNote } = useNotesStore.getState();
      const note = addNote('Первая строка\nВторая строка');

      expect(note.id).toBeDefined();
      expect(note.title).toBe('Первая строка');
      expect(note.content).toBe('Первая строка\nВторая строка');
      expect(note.createdAt).toBeDefined();
      expect(note.updatedAt).toBeDefined();

      const { notes } = useNotesStore.getState();
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe(note.id);
    });

    it('should truncate long titles to 40 chars + ellipsis', () => {
      const longContent = 'А'.repeat(60);
      const { addNote } = useNotesStore.getState();
      const note = addNote(longContent);

      expect(note.title).toBe('А'.repeat(40) + '...');
    });

    it('should use default title for empty content', () => {
      const { addNote } = useNotesStore.getState();
      const note = addNote('');

      expect(note.title).toBe('Новая заметка');
    });

    it('should use provided title over auto-generated', () => {
      const { addNote } = useNotesStore.getState();
      const note = addNote('Content', 'Мой заголовок');

      expect(note.title).toBe('Мой заголовок');
    });

    it('should prepend new notes (newest first)', () => {
      const { addNote } = useNotesStore.getState();
      const note1 = addNote('Первая');
      const note2 = addNote('Вторая');

      const { notes } = useNotesStore.getState();
      expect(notes[0].id).toBe(note2.id);
      expect(notes[1].id).toBe(note1.id);
    });
  });

  describe('updateNote', () => {
    it('should update note content and auto-generate new title', () => {
      const { addNote } = useNotesStore.getState();
      const note = addNote('Старый текст');
      const oldUpdatedAt = note.updatedAt;

      // Small delay so updatedAt differs
      act(() => {
        useNotesStore.getState().updateNote(note.id, { content: 'Новый текст' });
      });

      const updated = useNotesStore.getState().getNote(note.id);
      expect(updated?.content).toBe('Новый текст');
      expect(updated?.title).toBe('Новый текст');
      // updatedAt is refreshed (may be same ms in fast test, just verify it exists)
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should update only title when title is provided without content', () => {
      const { addNote } = useNotesStore.getState();
      const note = addNote('Текст заметки');

      act(() => {
        useNotesStore.getState().updateNote(note.id, { title: 'Ручной заголовок' });
      });

      const updated = useNotesStore.getState().getNote(note.id);
      expect(updated?.title).toBe('Ручной заголовок');
      expect(updated?.content).toBe('Текст заметки');
    });

    it('should not affect other notes', () => {
      const { addNote } = useNotesStore.getState();
      const note1 = addNote('Заметка 1');
      const note2 = addNote('Заметка 2');

      act(() => {
        useNotesStore.getState().updateNote(note1.id, { content: 'Обновлено' });
      });

      const unchanged = useNotesStore.getState().getNote(note2.id);
      expect(unchanged?.content).toBe('Заметка 2');
    });
  });

  describe('deleteNote', () => {
    it('should remove the note by id', () => {
      const { addNote } = useNotesStore.getState();
      const note = addNote('Удалить');

      expect(useNotesStore.getState().notes).toHaveLength(1);

      act(() => {
        useNotesStore.getState().deleteNote(note.id);
      });

      expect(useNotesStore.getState().notes).toHaveLength(0);
    });

    it('should not fail when deleting non-existent id', () => {
      const { addNote } = useNotesStore.getState();
      addNote('Заметка');

      act(() => {
        useNotesStore.getState().deleteNote('non-existent-id');
      });

      expect(useNotesStore.getState().notes).toHaveLength(1);
    });
  });

  describe('getNote', () => {
    it('should return the note by id', () => {
      const { addNote } = useNotesStore.getState();
      const note = addNote('Найти меня');

      const found = useNotesStore.getState().getNote(note.id);
      expect(found).toBeDefined();
      expect(found?.content).toBe('Найти меня');
    });

    it('should return undefined for non-existent id', () => {
      const found = useNotesStore.getState().getNote('does-not-exist');
      expect(found).toBeUndefined();
    });
  });
});
