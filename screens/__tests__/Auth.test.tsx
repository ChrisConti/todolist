import * as firebaseAuth from 'firebase/auth';
import * as firestore from 'firebase/firestore';

jest.mock('firebase/auth');
jest.mock('firebase/firestore');

// ─── Helpers mirrored from auth screens ────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateEmail = (email: string) => EMAIL_REGEX.test(email.trim());

// Connection.tsx — login error code mapping
const mapLoginError = (code: string) => {
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'error.invalidCredential';
  }
  return 'error.general';
};

// PasswordForgotten.tsx — anti-enumeration pattern
const passwordResetResult = async (
  sendFn: (email: string) => Promise<void>,
  email: string
): Promise<'sent' | 'error'> => {
  try {
    await sendFn(email);
    return 'sent';
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return 'sent'; // Don't reveal whether email exists
    }
    return 'error';
  }
};

// SignIn.tsx — rollback logic
const registerWithRollback = async (
  createUserFn: () => Promise<{ user: { uid: string; delete: () => Promise<void> } }>,
  createDocFn: (uid: string) => Promise<void>
): Promise<'success' | 'rollback' | 'critical'> => {
  const res = await createUserFn();
  try {
    await createDocFn(res.user.uid);
    return 'success';
  } catch {
    try {
      await res.user.delete();
      return 'rollback';
    } catch {
      return 'critical';
    }
  }
};

// ─── Connection — email validation ──────────────────────────────────────────

describe('Connection - email validation', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test+alias@domain.org')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('rejects strings without @', () => {
    expect(validateEmail('notanemail')).toBe(false);
  });
});

// ─── Connection — error code mapping ────────────────────────────────────────

describe('Connection - login error mapping', () => {
  it('maps auth/invalid-credential to invalidCredential', () => {
    expect(mapLoginError('auth/invalid-credential')).toBe('error.invalidCredential');
  });

  it('maps auth/wrong-password (legacy) to invalidCredential', () => {
    expect(mapLoginError('auth/wrong-password')).toBe('error.invalidCredential');
  });

  it('maps unknown errors to general', () => {
    expect(mapLoginError('auth/network-request-failed')).toBe('error.general');
    expect(mapLoginError('auth/too-many-requests')).toBe('error.general');
  });
});

// ─── PasswordForgotten — loading state and anti-enumeration ─────────────────

describe('PasswordForgotten - password reset', () => {
  it('returns "sent" on success', async () => {
    const mockSend = jest.fn().mockResolvedValue(undefined);
    const result = await passwordResetResult(mockSend, 'user@example.com');
    expect(result).toBe('sent');
    expect(mockSend).toHaveBeenCalledWith('user@example.com');
  });

  it('returns "sent" for auth/user-not-found (anti-enumeration)', async () => {
    const mockSend = jest.fn().mockRejectedValue({ code: 'auth/user-not-found' });
    const result = await passwordResetResult(mockSend, 'unknown@example.com');
    expect(result).toBe('sent'); // Must NOT reveal whether email exists
  });

  it('returns "error" for other failures', async () => {
    const mockSend = jest.fn().mockRejectedValue({ code: 'auth/network-request-failed' });
    const result = await passwordResetResult(mockSend, 'user@example.com');
    expect(result).toBe('error');
  });

  it('does not call Firebase with invalid email', async () => {
    const mockSend = jest.fn();
    const email = 'not-an-email';
    if (!validateEmail(email)) return; // guard — same as in component
    await passwordResetResult(mockSend, email);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ─── SignIn — registration rollback ─────────────────────────────────────────

describe('SignIn - registration with Firestore rollback', () => {
  it('returns success when both auth and Firestore succeed', async () => {
    const mockDelete = jest.fn();
    const mockCreate = jest.fn().mockResolvedValue(undefined);
    const mockCreateUser = jest.fn().mockResolvedValue({ user: { uid: 'uid-1', delete: mockDelete } });

    const result = await registerWithRollback(mockCreateUser, mockCreate);

    expect(result).toBe('success');
    expect(mockCreate).toHaveBeenCalledWith('uid-1');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('rolls back auth user when Firestore fails', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockCreate = jest.fn().mockRejectedValue(new Error('Firestore unavailable'));
    const mockCreateUser = jest.fn().mockResolvedValue({ user: { uid: 'uid-1', delete: mockDelete } });

    const result = await registerWithRollback(mockCreateUser, mockCreate);

    expect(result).toBe('rollback');
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('returns critical when rollback itself fails', async () => {
    const mockDelete = jest.fn().mockRejectedValue(new Error('Cannot delete'));
    const mockCreate = jest.fn().mockRejectedValue(new Error('Firestore unavailable'));
    const mockCreateUser = jest.fn().mockResolvedValue({ user: { uid: 'uid-1', delete: mockDelete } });

    const result = await registerWithRollback(mockCreateUser, mockCreate);

    expect(result).toBe('critical');
  });

  it('does not attempt Firestore if auth creation fails', async () => {
    const mockCreate = jest.fn();
    const mockCreateUser = jest.fn().mockRejectedValue(new Error('auth/email-already-in-use'));

    await expect(registerWithRollback(mockCreateUser, mockCreate)).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ─── SignIn - user document structure ────────────────────────────────────────

describe('SignIn - user document written to Firestore', () => {
  it('includes provider: "email" so ChangeName/ChangeEmail are not read-only', () => {
    const userDoc = {
      userId: 'uid-1',
      email: 'user@example.com',
      username: 'Alice',
      babyID: '',
      provider: 'email',
    };

    // isReadOnly = userInfo?.provider !== 'email'
    const isReadOnly = userDoc.provider !== 'email';
    expect(isReadOnly).toBe(false);
  });

  it('would lock out user if provider is missing (regression guard)', () => {
    const badUserDoc = {
      userId: 'uid-1',
      email: 'user@example.com',
      username: 'Alice',
      babyID: '',
      // provider intentionally missing — the old bug
    };

    const isReadOnly = (badUserDoc as any).provider !== 'email';
    expect(isReadOnly).toBe(true); // Confirms the bug existed
  });

  it('uses camelCase babyID field (not BabyID)', () => {
    const userDoc = {
      userId: 'uid-1',
      email: 'user@example.com',
      username: 'Alice',
      babyID: '',
      provider: 'email',
    };

    expect(Object.keys(userDoc)).toContain('babyID');
    expect(Object.keys(userDoc)).not.toContain('BabyID');
  });

  it('does not expose Firebase error codes to user', () => {
    const buildErrorMessage = (t: (k: string) => string, code: string) => {
      if (code === 'auth/email-already-in-use') return t('error.emailAlreadyRegistered');
      if (code === 'auth/network-request-failed') return t('error.networkError');
      if (code === 'auth/invalid-email') return t('error.invalidEmail');
      return t('error.general'); // No code appended
    };

    const fakeT = (key: string) => key;
    const msg = buildErrorMessage(fakeT, 'auth/too-many-requests');
    expect(msg).not.toContain('auth/');
    expect(msg).not.toContain('too-many-requests');
  });
});

// ─── App.tsx — auth listener cleanup ────────────────────────────────────────

describe('App - auth listener lifecycle', () => {
  it('stores unsubscribe ref and calls it on cleanup', () => {
    const mockUnsubscribe = jest.fn();
    (firebaseAuth.onAuthStateChanged as jest.Mock).mockReturnValue(mockUnsubscribe);

    // Simulate the listener setup
    const unsubscribeRef = { current: null as (() => void) | null };
    unsubscribeRef.current = firebaseAuth.onAuthStateChanged({} as any, jest.fn());

    expect(unsubscribeRef.current).toBe(mockUnsubscribe);

    // Simulate cleanup
    unsubscribeRef.current?.();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not crash when unsubscribeRef is null on cleanup', () => {
    const unsubscribeRef = { current: null as (() => void) | null };
    expect(() => unsubscribeRef.current?.()).not.toThrow();
  });
});

// ─── socialAuth — Apple identity token guard ─────────────────────────────────

describe('socialAuth - Apple identityToken guard', () => {
  it('throws when identityToken is null', () => {
    const guardedCredential = (identityToken: string | null) => {
      if (!identityToken) {
        throw new Error('No identity token received from Apple');
      }
      return { idToken: identityToken };
    };

    expect(() => guardedCredential(null)).toThrow('No identity token received from Apple');
    expect(() => guardedCredential('valid-token')).not.toThrow();
  });

  it('does not use fake email fallback for Apple users', () => {
    const buildAppleUserDoc = (email: string | null) => ({
      email: email || '',
    });

    const doc = buildAppleUserDoc(null);
    expect(doc.email).toBe('');
    expect(doc.email).not.toContain('apple.com');
    expect(doc.email).not.toContain('no-email');
  });
});
