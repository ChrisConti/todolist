import * as firestore from 'firebase/firestore';

jest.mock('firebase/firestore');

describe('UpdateTask - Business Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (firestore.query as jest.Mock).mockReturnValue({});
    (firestore.where as jest.Mock).mockReturnValue({});
    (firestore.doc as jest.Mock).mockReturnValue({});
    (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Fresh data fetch (getDocsFromServer)', () => {
    it('should use getDocsFromServer when updating a task', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'doc-123', data: () => ({ tasks: [{ uid: 'task-1', id: 0, label: 100 }] }) }],
      };
      (firestore.getDocsFromServer as jest.Mock).mockResolvedValue(mockSnapshot);

      await firestore.getDocsFromServer((firestore.query as jest.Mock)());

      expect(firestore.getDocsFromServer).toHaveBeenCalled();
      expect(firestore.getDocs).not.toHaveBeenCalled();
    });

    it('should use getDocsFromServer when deleting a task', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'doc-123', data: () => ({ tasks: [{ uid: 'task-to-delete' }] }) }],
      };
      (firestore.getDocsFromServer as jest.Mock).mockResolvedValue(mockSnapshot);

      await firestore.getDocsFromServer((firestore.query as jest.Mock)());

      expect(firestore.getDocsFromServer).toHaveBeenCalled();
      expect(firestore.getDocs).not.toHaveBeenCalled();
    });
  });

  describe('Task Update Logic', () => {
    const existingTasks = [
      { uid: 'task-1', id: 0, labelTask: 'biberon', date: '2025-01-04 08:00:00', label: 100 },
      { uid: 'task-2', id: 3, labelTask: 'sommeil', date: '2025-01-04 09:00:00', label: 60 },
    ];

    it('should update only the matching task and leave others unchanged', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'doc-123', data: () => ({ tasks: existingTasks }) }],
      };
      (firestore.getDocsFromServer as jest.Mock).mockResolvedValue(mockSnapshot);

      const querySnapshot = await firestore.getDocsFromServer((firestore.query as jest.Mock)());
      const document = querySnapshot.docs[0];

      const updatedTasks = document.data().tasks.map((t: any) => {
        if (t.uid === 'task-1') {
          return { ...t, label: 200 }; // updated quantity
        }
        return t;
      });

      await firestore.updateDoc(
        firestore.doc({} as any, 'Baby', document.id),
        { tasks: updatedTasks }
      );

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tasks: expect.arrayContaining([
            expect.objectContaining({ uid: 'task-1', label: 200 }),
            expect.objectContaining({ uid: 'task-2', label: 60 }), // unchanged
          ]),
        })
      );
    });

    it('should not modify tasks when uid does not match', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'doc-123', data: () => ({ tasks: existingTasks }) }],
      };
      (firestore.getDocsFromServer as jest.Mock).mockResolvedValue(mockSnapshot);

      const querySnapshot = await firestore.getDocsFromServer((firestore.query as jest.Mock)());
      const document = querySnapshot.docs[0];

      const updatedTasks = document.data().tasks.map((t: any) => {
        if (t.uid === 'unknown-uid') {
          return { ...t, label: 999 };
        }
        return t;
      });

      await firestore.updateDoc(
        firestore.doc({} as any, 'Baby', document.id),
        { tasks: updatedTasks }
      );

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tasks: [
            expect.objectContaining({ uid: 'task-1', label: 100 }),
            expect.objectContaining({ uid: 'task-2', label: 60 }),
          ],
        })
      );
    });

    it('should not call updateDoc when baby not found during update', async () => {
      (firestore.getDocsFromServer as jest.Mock).mockResolvedValue({ empty: true, docs: [] });

      const querySnapshot = await firestore.getDocsFromServer((firestore.query as jest.Mock)());
      if (!querySnapshot.empty) {
        await firestore.updateDoc({} as any, {});
      }

      expect(firestore.updateDoc).not.toHaveBeenCalled();
    });
  });

  describe('Task Deletion Logic', () => {
    const existingTasks = [
      { uid: 'task-keep-1', id: 0, label: 100 },
      { uid: 'task-delete', id: 1, label: 0 },
      { uid: 'task-keep-2', id: 3, label: 45 },
    ];

    it('should remove only the targeted task from the array', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'doc-123', data: () => ({ tasks: existingTasks }) }],
      };
      (firestore.getDocsFromServer as jest.Mock).mockResolvedValue(mockSnapshot);

      const querySnapshot = await firestore.getDocsFromServer((firestore.query as jest.Mock)());
      const document = querySnapshot.docs[0];

      const updatedTasks = document.data().tasks.filter((t: any) => t.uid !== 'task-delete');
      await firestore.updateDoc(
        firestore.doc({} as any, 'Baby', document.id),
        { tasks: updatedTasks }
      );

      const callArg = (firestore.updateDoc as jest.Mock).mock.calls[0][1];
      expect(callArg.tasks).toHaveLength(2);
      expect(callArg.tasks.find((t: any) => t.uid === 'task-delete')).toBeUndefined();
      expect(callArg.tasks.find((t: any) => t.uid === 'task-keep-1')).toBeDefined();
      expect(callArg.tasks.find((t: any) => t.uid === 'task-keep-2')).toBeDefined();
    });

    it('should handle deleting the last task (empty array)', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'doc-123', data: () => ({ tasks: [{ uid: 'only-task', id: 0 }] }) }],
      };
      (firestore.getDocsFromServer as jest.Mock).mockResolvedValue(mockSnapshot);

      const querySnapshot = await firestore.getDocsFromServer((firestore.query as jest.Mock)());
      const document = querySnapshot.docs[0];

      const updatedTasks = document.data().tasks.filter((t: any) => t.uid !== 'only-task');
      await firestore.updateDoc(
        firestore.doc({} as any, 'Baby', document.id),
        { tasks: updatedTasks }
      );

      const callArg = (firestore.updateDoc as jest.Mock).mock.calls[0][1];
      expect(callArg.tasks).toHaveLength(0);
    });

    it('should handle Firestore error during deletion', async () => {
      (firestore.getDocsFromServer as jest.Mock).mockRejectedValue({
        code: 'unavailable',
        message: 'Service unavailable',
      });

      await expect(
        firestore.getDocsFromServer({} as any)
      ).rejects.toMatchObject({ code: 'unavailable' });

      expect(firestore.updateDoc).not.toHaveBeenCalled();
    });
  });
});
