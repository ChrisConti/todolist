import {
  addBabyTask,
  updateBabyTask,
  removeBabyTask,
  getBabyDocRef,
  WRITE_TIMEOUT_MS,
  __resetBabyDocRefCache,
} from '../babyTasks';

const mockRef = { id: 'docId123' };
const mockFirestore = {
  getDocsFromCache: jest.fn(),
  getDocsFromServer: jest.fn(),
  updateDoc: jest.fn(),
  runTransaction: jest.fn(),
  getDocFromCache: jest.fn(),
  batchCommit: jest.fn(),
};
const mockBatchUpdates: any[] = [];

const mockLogError = jest.fn();
const mockWhere = jest.fn();

jest.mock('../../config.js', () => ({ db: {}, babiesRef: {} }));
jest.mock('../logger', () => ({ log: { error: (...args: any[]) => mockLogError(...args) } }));
jest.mock('firebase/firestore', () => ({
  query: jest.fn(() => 'babyQuery'),
  where: (...args: any[]) => mockWhere(...args),
  arrayUnion: jest.fn((value) => ({ __arrayUnion: value })),
  arrayRemove: jest.fn((value) => ({ __arrayRemove: value })),
  getDocFromCache: (...args: any[]) => mockFirestore.getDocFromCache(...args),
  writeBatch: () => ({
    update: (_ref: any, data: any) => mockBatchUpdates.push(data),
    commit: () => mockFirestore.batchCommit(),
  }),
  getDocsFromCache: (...args: any[]) => mockFirestore.getDocsFromCache(...args),
  getDocsFromServer: (...args: any[]) => mockFirestore.getDocsFromServer(...args),
  updateDoc: (...args: any[]) => mockFirestore.updateDoc(...args),
  runTransaction: (...args: any[]) => mockFirestore.runTransaction(...args),
}));

const found = { empty: false, docs: [{ ref: mockRef }] };
const empty = { empty: true, docs: [] };

// Simule une transaction sur une fiche dont le contenu serveur est `serverTasks`.
function mockTransactionOn(serverTasks: any[] | null) {
  const written: any[] = [];
  mockFirestore.runTransaction.mockImplementation(async (_db, fn) =>
    fn({
      get: async () => ({
        exists: () => serverTasks !== null,
        data: () => ({ tasks: serverTasks }),
      }),
      update: (_ref: any, data: any) => written.push(data),
    }),
  );
  return written;
}

beforeEach(() => {
  jest.useRealTimers();
  __resetBabyDocRefCache();
  Object.values(mockFirestore).forEach((fn) => fn.mockReset());
  mockLogError.mockReset();
  mockWhere.mockReset();
  mockFirestore.getDocsFromCache.mockResolvedValue(found);
  mockBatchUpdates.length = 0;
  // Par défaut, la fiche n'est pas dans le cache : chemin transaction.
  mockFirestore.getDocFromCache.mockRejectedValue(new Error('not in cache'));
});

// Fiche présente dans le cache local (cas normal : Home l'écoute).
function mockCachedTasks(tasks: any[]) {
  mockFirestore.getDocFromCache.mockResolvedValue({ exists: () => true, data: () => ({ tasks }) });
}

describe('getBabyDocRef', () => {
  it('lit le cache sans interroger le serveur quand la fiche y est', async () => {
    expect(await getBabyDocRef('ABC123')).toBe(mockRef);
    expect(mockFirestore.getDocsFromServer).not.toHaveBeenCalled();
  });

  it('cherche la fiche par son code bébé, pas par identifiant de document', async () => {
    await getBabyDocRef('ABC123');
    expect(mockWhere).toHaveBeenCalledWith('id', '==', 'ABC123');
  });

  it('passe par le serveur quand le cache est vide', async () => {
    mockFirestore.getDocsFromCache.mockResolvedValue(empty);
    mockFirestore.getDocsFromServer.mockResolvedValue(found);
    expect(await getBabyDocRef('ABC123')).toBe(mockRef);
  });

  it('passe par le serveur quand la lecture du cache échoue', async () => {
    mockFirestore.getDocsFromCache.mockRejectedValue(new Error('cache miss'));
    mockFirestore.getDocsFromServer.mockResolvedValue(found);
    expect(await getBabyDocRef('ABC123')).toBe(mockRef);
  });

  it('retourne null quand le bébé est introuvable', async () => {
    mockFirestore.getDocsFromCache.mockResolvedValue(empty);
    mockFirestore.getDocsFromServer.mockResolvedValue(empty);
    expect(await getBabyDocRef('ABC123')).toBeNull();
  });

  it('mémorise la référence pour les appels suivants', async () => {
    await getBabyDocRef('ABC123');
    await getBabyDocRef('ABC123');
    expect(mockFirestore.getDocsFromCache).toHaveBeenCalledTimes(1);
  });
});

describe('addBabyTask', () => {
  const task = { uid: 'new', id: 5 };

  it('ajoute la seule nouvelle tâche via arrayUnion, sans relire la fiche', async () => {
    mockFirestore.updateDoc.mockResolvedValue(undefined);
    expect(await addBabyTask('ABC123', task)).toBe('saved');
    expect(mockFirestore.updateDoc).toHaveBeenCalledWith(mockRef, { tasks: { __arrayUnion: task } });
    expect(mockFirestore.getDocsFromServer).not.toHaveBeenCalled();
  });

  it("signale un bébé introuvable sans rien écrire", async () => {
    mockFirestore.getDocsFromCache.mockResolvedValue(empty);
    mockFirestore.getDocsFromServer.mockResolvedValue(empty);
    expect(await addBabyTask('ABC123', task)).toBe('babyNotFound');
    expect(mockFirestore.updateDoc).not.toHaveBeenCalled();
  });

  it("propage l'erreur d'une écriture refusée", async () => {
    mockFirestore.updateDoc.mockRejectedValue(Object.assign(new Error('denied'), { code: 'permission-denied' }));
    await expect(addBabyTask('ABC123', task)).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it("répond 'queued' quand le serveur ne confirme pas à temps", async () => {
    jest.useFakeTimers();
    mockFirestore.updateDoc.mockReturnValue(new Promise(() => {}));
    const pending = addBabyTask('ABC123', task);
    await jest.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS);
    expect(await pending).toBe('queued');
  });

  it("journalise l'échec tardif d'une écriture en attente", async () => {
    jest.useFakeTimers();
    let rejectLater: (e: Error) => void = () => {};
    mockFirestore.updateDoc.mockReturnValue(new Promise((_, reject) => { rejectLater = reject; }));
    const pending = addBabyTask('ABC123', task);
    await jest.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS);
    expect(await pending).toBe('queued');
    rejectLater(new Error('late failure'));
    await jest.advanceTimersByTimeAsync(0);
    expect(mockLogError).toHaveBeenCalledWith('Queued task write failed', 'babyTasks', expect.any(Error));
  });
});

describe('updateBabyTask — tâche en cache (cas normal)', () => {
  it("remplace la seule tâche visée, dans l'ordre retrait puis ajout, sans transaction", async () => {
    const old = { uid: 'b', label: 2 };
    mockCachedTasks([{ uid: 'a' }, old]);
    mockFirestore.batchCommit.mockResolvedValue(undefined);
    expect(await updateBabyTask('ABC123', 'b', (t) => ({ ...t, label: 20 }))).toBe('saved');
    expect(mockBatchUpdates).toEqual([
      { tasks: { __arrayRemove: old } },
      { tasks: { __arrayUnion: { uid: 'b', label: 20 } } },
    ]);
    expect(mockFirestore.runTransaction).not.toHaveBeenCalled();
  });

  it("répond 'queued' quand le serveur ne confirme pas à temps", async () => {
    jest.useFakeTimers();
    mockCachedTasks([{ uid: 'b' }]);
    mockFirestore.batchCommit.mockReturnValue(new Promise(() => {}));
    const pending = updateBabyTask('ABC123', 'b', (t) => t);
    await jest.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS);
    expect(await pending).toBe('queued');
  });

  it('passe par la transaction si la tâche manque dans le cache', async () => {
    mockCachedTasks([{ uid: 'a' }]);
    const written = mockTransactionOn([{ uid: 'a' }, { uid: 'b', label: 2 }]);
    expect(await updateBabyTask('ABC123', 'b', (t) => ({ ...t, label: 20 }))).toBe('saved');
    expect(written[0].tasks).toEqual([{ uid: 'a' }, { uid: 'b', label: 20 }]);
    expect(mockFirestore.batchCommit).not.toHaveBeenCalled();
  });
});

describe('updateBabyTask — repli transaction', () => {
  it('ne modifie que la tâche visée', async () => {
    const written = mockTransactionOn([
      { uid: 'a', label: 1 },
      { uid: 'b', label: 2 },
      { uid: 'coparent', label: 3 },
    ]);
    expect(await updateBabyTask('ABC123', 'b', (t) => ({ ...t, label: 20 }))).toBe('saved');
    expect(written[0].tasks).toEqual([
      { uid: 'a', label: 1 },
      { uid: 'b', label: 20 },
      { uid: 'coparent', label: 3 },
    ]);
  });

  it('rejouée sur une fiche modifiée entre-temps, garde la tâche du co-parent', async () => {
    const versions = [
      [{ uid: 'a', label: 1 }],
      [{ uid: 'a', label: 1 }, { uid: 'coparent', label: 3 }],
    ];
    const written: any[] = [];
    // Le SDK rejoue la fonction quand le document a changé depuis sa lecture : seul le
    // dernier passage est validé.
    mockFirestore.runTransaction.mockImplementation(async (_db, fn) => {
      let result;
      for (const tasks of versions) {
        written.length = 0;
        result = await fn({
          get: async () => ({ exists: () => true, data: () => ({ tasks }) }),
          update: (_ref: any, data: any) => written.push(data),
        });
      }
      return result;
    });
    expect(await updateBabyTask('ABC123', 'a', (t) => ({ ...t, label: 10 }))).toBe('saved');
    expect(written[0].tasks).toEqual([{ uid: 'a', label: 10 }, { uid: 'coparent', label: 3 }]);
  });

  it("répond 'timeout' quand la transaction n'aboutit pas à temps", async () => {
    jest.useFakeTimers();
    mockFirestore.runTransaction.mockReturnValue(new Promise(() => {}));
    const pending = updateBabyTask('ABC123', 'a', (t) => t);
    await jest.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS);
    expect(await pending).toBe('timeout');
  });

  it("n'écrit rien si la tâche a disparu", async () => {
    const written = mockTransactionOn([{ uid: 'a' }]);
    expect(await updateBabyTask('ABC123', 'b', (t) => t)).toBe('taskNotFound');
    expect(written).toHaveLength(0);
  });

  it("n'écrit rien si la fiche a disparu", async () => {
    const written = mockTransactionOn(null);
    expect(await updateBabyTask('ABC123', 'b', (t) => t)).toBe('babyNotFound');
    expect(written).toHaveLength(0);
  });
});

describe('removeBabyTask — tâche en cache (cas normal)', () => {
  it("retire la tâche via arrayRemove de l'objet en cache, sans transaction", async () => {
    const target = { uid: 'b', label: 2 };
    mockCachedTasks([{ uid: 'a' }, target]);
    mockFirestore.updateDoc.mockResolvedValue(undefined);
    expect(await removeBabyTask('ABC123', 'b')).toBe('saved');
    expect(mockFirestore.updateDoc).toHaveBeenCalledWith(mockRef, { tasks: { __arrayRemove: target } });
    expect(mockFirestore.runTransaction).not.toHaveBeenCalled();
  });

  it("répond 'queued' quand le serveur ne confirme pas à temps", async () => {
    jest.useFakeTimers();
    mockCachedTasks([{ uid: 'b' }]);
    mockFirestore.updateDoc.mockReturnValue(new Promise(() => {}));
    const pending = removeBabyTask('ABC123', 'b');
    await jest.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS);
    expect(await pending).toBe('queued');
  });
});

describe('removeBabyTask — repli transaction', () => {
  it('retire uniquement la tâche visée', async () => {
    const written = mockTransactionOn([{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }]);
    expect(await removeBabyTask('ABC123', 'b')).toBe('saved');
    expect(written[0].tasks).toEqual([{ uid: 'a' }, { uid: 'c' }]);
  });

  it("ne réécrit pas la fiche si la tâche est déjà supprimée", async () => {
    const written = mockTransactionOn([{ uid: 'a' }]);
    expect(await removeBabyTask('ABC123', 'b')).toBe('taskNotFound');
    expect(written).toHaveLength(0);
  });
});
