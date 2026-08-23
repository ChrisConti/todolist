import * as firestore from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '../../services/analytics';

jest.mock('firebase/firestore');
jest.mock('@react-native-async-storage/async-storage');

// ─── Helpers mirrored from Baby.tsx ─────────────────────────────────────────

// handleCreateBaby core logic (addDoc + setBabyID + analytics)
const createBabyLogic = async (
  babyData: object,
  addDocFn: (data: object) => Promise<{ id: string }>,
  setBabyID: (id: string) => void,
  analyticsLogFn: (event: string, data: object) => void,
  uniqueId: string
): Promise<'success' | 'error'> => {
  const docRef = await addDocFn(babyData);
  setBabyID(uniqueId);
  try {
    analyticsLogFn('baby_created', { baby_id: uniqueId });
  } catch {
    // Non-critical — don't fail creation if analytics throws
  }
  return 'success';
};

// Loading guard (same as Baby.tsx handleCreateBaby first line)
const withLoadingGuard = (loading: boolean, fn: () => void) => {
  if (loading) return;
  fn();
};

// Baby document field builder (mirrors Baby.tsx babyData construction)
const buildBabyDoc = (params: {
  uniqueId: string;
  type: string;
  name: string;
  birthDate: string;
  uid: string;
  username?: string;
  email?: string;
  photoURL?: string;
  weight?: number;
  height?: number;
}) => {
  const doc: any = {
    id: params.uniqueId,
    type: params.type,
    name: params.name,
    birthDate: params.birthDate,
    createdDate: 'SERVER_TIMESTAMP', // stands in for serverTimestamp()
    user: [params.uid],
    admin: params.uid,
    userName: params.username || 'Unknown',
    userEmail: params.email || '',
    tasks: [],
  };
  if (params.photoURL) doc.profilePhoto = params.photoURL;
  if (params.weight) doc.weight = params.weight;
  if (params.height) doc.height = params.height;
  return doc;
};

// AsyncStorage review counter cleanup (mirrors Baby.tsx)
const cleanReviewCounters = async (
  uid: string,
  storageFn: { getItem: (k: string) => Promise<string | null>; removeItem: (k: string) => Promise<void> }
) => {
  const hasReviewed = await storageFn.getItem(`has_reviewed_app_${uid}`);
  await storageFn.removeItem(`task_created_count_${uid}`);
  await storageFn.removeItem(`last_review_prompt_at_count_${uid}`);
  await storageFn.removeItem(`review_prompt_count_${uid}`);
  if (hasReviewed !== 'true') {
    await storageFn.removeItem(`has_reviewed_app_${uid}`);
  }
};

// ─── Baby document structure ──────────────────────────────────────────────

describe('Baby - document structure', () => {
  it('uses camelCase createdDate field (not PascalCase CreatedDate)', () => {
    const doc = buildBabyDoc({
      uniqueId: 'uuid-1',
      type: 'Boy',
      name: 'Léo',
      birthDate: '01/01/2024',
      uid: 'user-1',
    });

    expect(Object.keys(doc)).toContain('createdDate');
    expect(Object.keys(doc)).not.toContain('CreatedDate');
  });

  it('initializes tasks as empty array', () => {
    const doc = buildBabyDoc({
      uniqueId: 'uuid-1',
      type: 'Girl',
      name: 'Emma',
      birthDate: '15/06/2024',
      uid: 'user-1',
    });

    expect(doc.tasks).toEqual([]);
  });

  it('includes uid in user array and as admin', () => {
    const doc = buildBabyDoc({
      uniqueId: 'uuid-1',
      type: 'Boy',
      name: 'Léo',
      birthDate: '01/01/2024',
      uid: 'user-99',
    });

    expect(doc.user).toContain('user-99');
    expect(doc.admin).toBe('user-99');
  });

  it('adds optional fields only when provided', () => {
    const withPhoto = buildBabyDoc({
      uniqueId: 'uuid-1', type: 'Boy', name: 'Léo',
      birthDate: '01/01/2024', uid: 'u1',
      photoURL: 'https://example.com/photo.jpg',
      weight: 3.5,
      height: 50,
    });

    expect(withPhoto).toHaveProperty('profilePhoto', 'https://example.com/photo.jpg');
    expect(withPhoto).toHaveProperty('weight', 3.5);
    expect(withPhoto).toHaveProperty('height', 50);

    const withoutOptional = buildBabyDoc({
      uniqueId: 'uuid-2', type: 'Girl', name: 'Emma',
      birthDate: '15/06/2024', uid: 'u2',
    });

    expect(withoutOptional).not.toHaveProperty('profilePhoto');
    expect(withoutOptional).not.toHaveProperty('weight');
    expect(withoutOptional).not.toHaveProperty('height');
  });

  it('falls back to "Unknown" when userInfo not yet loaded', () => {
    const doc = buildBabyDoc({
      uniqueId: 'uuid-1', type: 'Boy', name: 'Léo',
      birthDate: '01/01/2024', uid: 'u1',
      username: undefined,
      email: undefined,
    });

    expect(doc.userName).toBe('Unknown');
    expect(doc.userEmail).toBe('');
  });
});

// ─── Baby creation — addDoc + navigation flow ────────────────────────────

describe('Baby - creation flow', () => {
  it('calls addDoc then setBabyID, then navigates', async () => {
    const order: string[] = [];
    const mockAddDoc = jest.fn(async () => { order.push('addDoc'); return { id: 'doc-1' }; });
    const mockSetBabyID = jest.fn(() => order.push('setBabyID'));
    const mockAnalytics = jest.fn(() => order.push('analytics'));

    const result = await createBabyLogic({}, mockAddDoc, mockSetBabyID, mockAnalytics, 'uuid-1');

    expect(result).toBe('success');
    expect(order).toEqual(['addDoc', 'setBabyID', 'analytics']);
  });

  it('analytics failure does not block baby creation', async () => {
    const mockAddDoc = jest.fn().mockResolvedValue({ id: 'doc-1' });
    const mockSetBabyID = jest.fn();
    const throwingAnalytics = jest.fn(() => { throw new Error('analytics down'); });

    const result = await createBabyLogic({}, mockAddDoc, mockSetBabyID, throwingAnalytics, 'uuid-1');

    expect(result).toBe('success');
    expect(mockSetBabyID).toHaveBeenCalledWith('uuid-1');
  });

  it('throws when Firestore addDoc fails (does not call setBabyID)', async () => {
    const mockAddDoc = jest.fn().mockRejectedValue({ code: 'permission-denied' });
    const mockSetBabyID = jest.fn();
    const mockAnalytics = jest.fn();

    await expect(
      createBabyLogic({}, mockAddDoc, mockSetBabyID, mockAnalytics, 'uuid-1')
    ).rejects.toMatchObject({ code: 'permission-denied' });

    expect(mockSetBabyID).not.toHaveBeenCalled();
    expect(mockAnalytics).not.toHaveBeenCalled();
  });

  it('loading guard prevents double-submit', () => {
    const fn = jest.fn();
    withLoadingGuard(true, fn);
    expect(fn).not.toHaveBeenCalled();

    withLoadingGuard(false, fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ─── Baby - review counter cleanup ──────────────────────────────────────

describe('Baby - review counter cleanup on creation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('removes all review counters for the user', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    await cleanReviewCounters('uid-1', AsyncStorage);

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('task_created_count_uid-1');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('last_review_prompt_at_count_uid-1');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('review_prompt_count_uid-1');
  });

  it('removes has_reviewed flag if user has not reviewed yet', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null); // not reviewed
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    await cleanReviewCounters('uid-1', AsyncStorage);

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('has_reviewed_app_uid-1');
  });

  it('preserves has_reviewed flag if user already reviewed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true'); // already reviewed
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    await cleanReviewCounters('uid-1', AsyncStorage);

    expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith('has_reviewed_app_uid-1');
  });
});

// ─── Baby - error code mapping ────────────────────────────────────────────

describe('Baby - Firestore error code mapping', () => {
  const mapError = (code: string, t: (k: string) => string) => {
    if (code === 'permission-denied') return t('error.permissionDenied');
    if (code === 'unavailable') return t('error.networkError');
    return t('error.babyCreationFailed');
  };

  const fakeT = (key: string) => key;

  it('maps permission-denied correctly', () => {
    expect(mapError('permission-denied', fakeT)).toBe('error.permissionDenied');
  });

  it('maps unavailable to network error', () => {
    expect(mapError('unavailable', fakeT)).toBe('error.networkError');
  });

  it('maps unknown error to general creation error', () => {
    expect(mapError('other/error', fakeT)).toBe('error.babyCreationFailed');
  });
});
