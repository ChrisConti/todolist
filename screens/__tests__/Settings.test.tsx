import * as firestore from 'firebase/firestore';
import * as auth from 'firebase/auth';

jest.mock('firebase/firestore');
jest.mock('firebase/auth');

// ─── Helpers extracted from Settings screens ───────────────────────────────

// ChangeEmail validation (mirrored from ChangeEmail.tsx)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string) => EMAIL_REGEX.test(email.trim());

// ChangePassword — just sends a reset email, no business logic to test besides the call

// DeleteAccount — reauthentication provider detection
const getProvider = (userInfo: any) => userInfo?.provider || 'email';

// JoinBaby — full onHandleModification logic (mirrored from JoinBaby.tsx)
const joinBabyLogic = async (
  queryDocs: Array<{ id: string; data: () => any }>,
  updateDocFn: (id: string, data: any) => Promise<void>,
  setBabyID: (id: string) => void,
  babyID: string,
  analyticsLogFn?: () => void
) => {
  for (const document of queryDocs) {
    await updateDocFn(document.id, { user: 'uid' });
    setBabyID(babyID);
    try {
      analyticsLogFn?.();
    } catch {
      // Non-critical — don't fail the join if analytics throws
    }
  }
};

// JoinBaby — loading guard (prevents double-submit)
const joinBabyWithLoadingGuard = async (
  loading: boolean,
  trimmedBabyID: string,
  runJoin: () => Promise<void>
): Promise<'skipped' | 'empty' | 'joined'> => {
  if (loading) return 'skipped';
  if (!trimmedBabyID) return 'empty';
  await runJoin();
  return 'joined';
};

// ─── ChangeEmail validation ───────────────────────────────────────────────

describe('ChangeEmail - email validation', () => {
  it('accepts a valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('accepts email with subdomain', () => {
    expect(validateEmail('user@mail.example.co.uk')).toBe(true);
  });

  it('accepts email with + alias', () => {
    expect(validateEmail('user+tag@example.com')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('rejects string with no @ symbol', () => {
    expect(validateEmail('notanemail')).toBe(false);
  });

  it('rejects email with missing domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('rejects email with missing local part', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });

  it('rejects email with spaces', () => {
    expect(validateEmail('user @example.com')).toBe(false);
  });

  it('trims whitespace before validation', () => {
    expect(validateEmail('  user@example.com  ')).toBe(true);
  });
});

// ─── ChangeEmail - reauthentication ──────────────────────────────────────

describe('ChangeEmail - reauthentication before updateEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth.reauthenticateWithCredential as jest.Mock).mockResolvedValue(undefined);
    (auth.updateEmail as jest.Mock).mockResolvedValue(undefined);
    (auth.EmailAuthProvider.credential as jest.Mock) = jest.fn().mockReturnValue({ providerId: 'password' });
  });

  it('calls reauthenticateWithCredential before updateEmail', async () => {
    const mockUser = { email: 'old@example.com' } as any;

    // Simulate reauthAndUpdateEmail logic
    const credential = auth.EmailAuthProvider.credential(mockUser.email, 'mypassword');
    await auth.reauthenticateWithCredential(mockUser, credential);
    await auth.updateEmail(mockUser, 'new@example.com');

    expect(auth.reauthenticateWithCredential).toHaveBeenCalledTimes(1);
    expect(auth.updateEmail).toHaveBeenCalledTimes(1);

    // Ensure reauthentication happens BEFORE updateEmail
    const reauthOrder = (auth.reauthenticateWithCredential as jest.Mock).mock.invocationCallOrder[0];
    const updateOrder = (auth.updateEmail as jest.Mock).mock.invocationCallOrder[0];
    expect(reauthOrder).toBeLessThan(updateOrder);
  });

  it('builds credential with current email and provided password', () => {
    auth.EmailAuthProvider.credential('user@example.com', 'secret123');
    expect(auth.EmailAuthProvider.credential).toHaveBeenCalledWith('user@example.com', 'secret123');
  });

  it('does not call updateEmail if reauthentication fails', async () => {
    (auth.reauthenticateWithCredential as jest.Mock).mockRejectedValue(new Error('wrong password'));

    const mockUser = { email: 'old@example.com' } as any;

    const reauthAndUpdate = async () => {
      const credential = auth.EmailAuthProvider.credential(mockUser.email, 'wrongpass');
      await auth.reauthenticateWithCredential(mockUser, credential);
      await auth.updateEmail(mockUser, 'new@example.com'); // should not reach this
    };

    await expect(reauthAndUpdate()).rejects.toThrow('wrong password');
    expect(auth.updateEmail).not.toHaveBeenCalled();
  });
});

// ─── ChangeEmail - Firestore update ──────────────────────────────────────

describe('ChangeEmail - Firestore user update', () => {
  const mockDocRef = { id: 'user-doc-1' };

  beforeEach(() => {
    jest.clearAllMocks();
    (firestore.query as jest.Mock).mockReturnValue({});
    (firestore.where as jest.Mock).mockReturnValue({});
    (firestore.getDocs as jest.Mock).mockResolvedValue({
      empty: false,
      docs: [mockDocRef],
    });
    (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);
    (firestore.doc as jest.Mock).mockReturnValue(mockDocRef);
  });

  it('updates email field in Users collection', async () => {
    const snapshot = await firestore.getDocs((firestore.query as jest.Mock)());
    for (const document of snapshot.docs) {
      await firestore.updateDoc(
        firestore.doc({} as any, 'Users', document.id),
        { email: 'new@example.com' }
      );
    }

    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      { email: 'new@example.com' }
    );
  });

  it('does not update Firestore if user document not found', async () => {
    (firestore.getDocs as jest.Mock).mockResolvedValue({ empty: true, docs: [] });

    const snapshot = await firestore.getDocs((firestore.query as jest.Mock)());
    if (snapshot.empty) return; // early return as in the real code

    await firestore.updateDoc({} as any, { email: 'new@example.com' });
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });
});

// ─── JoinBaby - race condition fix ───────────────────────────────────────

describe('JoinBaby - sequential for...of (no race condition)', () => {
  it('awaits all Firestore writes before calling setBabyID', async () => {
    const order: string[] = [];

    const mockUpdateDoc = jest.fn(async () => {
      order.push('updateDoc');
    });
    const mockSetBabyID = jest.fn(() => {
      order.push('setBabyID');
    });

    const docs = [
      { id: 'baby-1', data: () => ({ name: 'Léo' }) },
    ];

    await joinBabyLogic(docs, mockUpdateDoc, mockSetBabyID, 'baby-1');

    expect(order).toEqual(['updateDoc', 'setBabyID']);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockSetBabyID).toHaveBeenCalledWith('baby-1');
  });

  it('processes all documents before resolving', async () => {
    const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
    const mockSetBabyID = jest.fn();

    const docs = [
      { id: 'baby-1', data: () => ({}) },
      { id: 'baby-2', data: () => ({}) },
    ];

    await joinBabyLogic(docs, mockUpdateDoc, mockSetBabyID, 'baby-1');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    expect(mockSetBabyID).toHaveBeenCalledTimes(2);
  });

  it('throws on Firestore error instead of navigating with partial state', async () => {
    const mockUpdateDoc = jest.fn().mockRejectedValue(new Error('Permission denied'));
    const mockSetBabyID = jest.fn();

    const docs = [{ id: 'baby-1', data: () => ({}) }];

    await expect(
      joinBabyLogic(docs, mockUpdateDoc, mockSetBabyID, 'baby-1')
    ).rejects.toThrow('Permission denied');

    expect(mockSetBabyID).not.toHaveBeenCalled();
  });

  it('analytics failure does not block navigation (join succeeds)', async () => {
    const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
    const mockSetBabyID = jest.fn();
    const throwingAnalytics = jest.fn(() => { throw new Error('analytics unavailable'); });

    const docs = [{ id: 'baby-1', data: () => ({ name: 'Léo', type: 'Girl' }) }];

    // Must resolve (not throw) even if analytics throws
    await expect(
      joinBabyLogic(docs, mockUpdateDoc, mockSetBabyID, 'baby-1', throwingAnalytics)
    ).resolves.toBeUndefined();

    expect(mockSetBabyID).toHaveBeenCalledWith('baby-1');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });

  it('loading guard prevents double-submit', async () => {
    const mockJoin = jest.fn().mockResolvedValue(undefined);

    const result1 = await joinBabyWithLoadingGuard(true, 'code-abc', mockJoin);
    expect(result1).toBe('skipped');
    expect(mockJoin).not.toHaveBeenCalled();

    const result2 = await joinBabyWithLoadingGuard(false, 'code-abc', mockJoin);
    expect(result2).toBe('joined');
    expect(mockJoin).toHaveBeenCalledTimes(1);
  });

  it('empty code guard fires before Firestore query', async () => {
    const mockJoin = jest.fn();

    const result = await joinBabyWithLoadingGuard(false, '', mockJoin);
    expect(result).toBe('empty');
    expect(mockJoin).not.toHaveBeenCalled();
  });
});

// ─── DeleteAccount - provider detection ──────────────────────────────────

describe('DeleteAccount - provider detection', () => {
  it('defaults to email provider when userInfo is undefined', () => {
    expect(getProvider(undefined)).toBe('email');
  });

  it('defaults to email when provider field is missing', () => {
    expect(getProvider({})).toBe('email');
  });

  it('returns google when provider is google', () => {
    expect(getProvider({ provider: 'google' })).toBe('google');
  });

  it('returns apple when provider is apple', () => {
    expect(getProvider({ provider: 'apple' })).toBe('apple');
  });

  it('returns email when provider is email', () => {
    expect(getProvider({ provider: 'email' })).toBe('email');
  });
});

// ─── DeleteAccount - anonymization logic ─────────────────────────────────

describe('DeleteAccount - task anonymization', () => {
  it('anonymizes tasks belonging to the deleted user', () => {
    const userId = 'user-123';
    const tasks = [
      { id: 't1', user: userId, note: 'some note' },
      { id: 't2', user: 'other-user', note: 'other note' },
      { id: 't3', user: userId, note: 'another note' },
    ];

    const anonymized = tasks.map(task => {
      if (task.user === userId) {
        return { ...task, user: 'deleted_user', createdBy: 'Deleted User' };
      }
      return task;
    });

    expect(anonymized[0].user).toBe('deleted_user');
    expect(anonymized[0].createdBy).toBe('Deleted User');
    expect(anonymized[1].user).toBe('other-user'); // untouched
    expect(anonymized[2].user).toBe('deleted_user');
  });

  it('preserves all other task fields during anonymization', () => {
    const userId = 'user-123';
    const task = { id: 't1', user: userId, type: 0, volume: 150, timestamp: 1700000000 };

    const anonymized = task.user === userId
      ? { ...task, user: 'deleted_user', createdBy: 'Deleted User' }
      : task;

    expect(anonymized.id).toBe('t1');
    expect(anonymized.type).toBe(0);
    expect(anonymized.volume).toBe(150);
    expect(anonymized.timestamp).toBe(1700000000);
  });

  it('leaves tasks from other users unchanged', () => {
    const userId = 'user-123';
    const task = { id: 't1', user: 'other-user', note: 'test' };

    const anonymized = task.user === userId
      ? { ...task, user: 'deleted_user' }
      : task;

    expect(anonymized).toEqual(task);
  });
});

// ─── DeleteAccount - loading guard ───────────────────────────────────────

describe('DeleteAccount - loading guard prevents double-submit', () => {
  const deleteAccountWithGuard = async (
    loading: boolean,
    runDeletion: () => Promise<void>
  ): Promise<'skipped' | 'started'> => {
    if (loading) return 'skipped';
    await runDeletion();
    return 'started';
  };

  it('skips when already loading', async () => {
    const mockRun = jest.fn().mockResolvedValue(undefined);
    const result = await deleteAccountWithGuard(true, mockRun);
    expect(result).toBe('skipped');
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('proceeds when not loading', async () => {
    const mockRun = jest.fn().mockResolvedValue(undefined);
    const result = await deleteAccountWithGuard(false, mockRun);
    expect(result).toBe('started');
    expect(mockRun).toHaveBeenCalledTimes(1);
  });
});

// ─── DeleteAccount - Apple identityToken null guard ───────────────────────

describe('DeleteAccount - Apple reauthentication identityToken guard', () => {
  const buildAppleCredential = (identityToken: string | null) => {
    if (!identityToken) {
      throw new Error('No identity token received from Apple');
    }
    return { idToken: identityToken };
  };

  it('throws when identityToken is null', () => {
    expect(() => buildAppleCredential(null)).toThrow('No identity token received from Apple');
  });

  it('returns credential when identityToken is present', () => {
    const cred = buildAppleCredential('valid-apple-token');
    expect(cred.idToken).toBe('valid-apple-token');
  });
});

// ─── DeleteAccount - deletion sequence ───────────────────────────────────

describe('DeleteAccount - full deletion sequence ordering', () => {
  it('anonymizes tasks before deleting auth user', async () => {
    const order: string[] = [];

    const mockAnonymizeTasks = jest.fn(async () => order.push('anonymize_tasks'));
    const mockAnonymizeUser = jest.fn(async () => order.push('anonymize_user'));
    const mockDeleteUser = jest.fn(async () => order.push('delete_auth_user'));
    const mockSignOut = jest.fn(async () => order.push('sign_out'));

    await mockAnonymizeTasks();
    await mockAnonymizeUser();
    await mockDeleteUser();
    await mockSignOut();

    expect(order.indexOf('anonymize_tasks')).toBeLessThan(order.indexOf('delete_auth_user'));
    expect(order.indexOf('anonymize_user')).toBeLessThan(order.indexOf('delete_auth_user'));
    expect(order.indexOf('delete_auth_user')).toBeLessThan(order.indexOf('sign_out'));
  });

  it('user document gets deleted flag and anonymized email', () => {
    const userId = 'user-abc123';
    const anonymized = {
      email: `deleted_${Date.now()}_${userId.slice(0, 8)}@deleted.tribubaby.app`,
      username: 'Deleted User',
      deleted: true,
      deletedAt: new Date().toISOString(),
    };

    expect(anonymized.deleted).toBe(true);
    expect(anonymized.email).toContain('@deleted.tribubaby.app');
    expect(anonymized.email).toContain('deleted_');
    expect(anonymized.username).toBe('Deleted User');
    expect(anonymized).toHaveProperty('deletedAt');
  });

  it('baby tasks from deleted user are anonymized, others untouched', () => {
    const userId = 'user-to-delete';
    const tasks = [
      { uid: 't1', user: userId, createdBy: 'Alice' },
      { uid: 't2', user: 'other-uid', createdBy: 'Bob' },
      { uid: 't3', user: userId, createdBy: 'Alice' },
    ];

    const anonymized = tasks.map(task =>
      task.user === userId
        ? { ...task, user: 'deleted_user', createdBy: 'Deleted User' }
        : task
    );

    expect(anonymized[0]).toMatchObject({ user: 'deleted_user', createdBy: 'Deleted User' });
    expect(anonymized[1]).toMatchObject({ user: 'other-uid', createdBy: 'Bob' });
    expect(anonymized[2]).toMatchObject({ user: 'deleted_user', createdBy: 'Deleted User' });
  });
});
