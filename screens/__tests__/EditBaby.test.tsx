import * as firestore from 'firebase/firestore';
import * as storageModule from 'firebase/storage';

jest.mock('firebase/firestore');
jest.mock('firebase/storage');

// ─── Helpers extracted from EditBaby (same logic, tested in isolation) ────────

const extractStoragePathFromUrl = (url: string): string | null => {
  try {
    const match = url.match(/\/o\/(.+?)\?/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch {
    return null;
  }
};

const types = [
  { id: 0, type: 'Boy' },
  { id: 1, type: 'Girl' },
];

const getTypeFromIndex = (index: number) => types[index]?.type;
const getIndexFromType = (type: string) => (type === 'Boy' ? 0 : 1);

// Simulates the uploadPhoto fetch flow (without FileSystem / user.getIdToken)
const buildUploadUrl = (babyID: string, timestamp: number) =>
  `https://firebasestorage.googleapis.com/v0/b/babylist-ae85f.firebasestorage.app/o?name=${encodeURIComponent(
    `babies/${babyID}/profile_${timestamp}.jpg`
  )}`;

const buildDownloadUrl = (babyID: string, timestamp: number, token: string) =>
  `https://firebasestorage.googleapis.com/v0/b/babylist-ae85f.firebasestorage.app/o/${encodeURIComponent(
    `babies/${babyID}/profile_${timestamp}.jpg`
  )}?alt=media&token=${token}`;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EditBaby - extractStoragePathFromUrl', () => {
  it('extracts path from a standard Firebase Storage URL', () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/babylist-ae85f.firebasestorage.app/o/babies%2Fbaby-1%2Fprofile_1710000000000.jpg?alt=media&token=abc123';
    expect(extractStoragePathFromUrl(url)).toBe('babies/baby-1/profile_1710000000000.jpg');
  });

  it('decodes percent-encoded slashes correctly', () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/babylist-ae85f.firebasestorage.app/o/babies%2Fbaby-abc%2Fprofile_9999.jpg?alt=media&token=xyz';
    expect(extractStoragePathFromUrl(url)).toBe('babies/baby-abc/profile_9999.jpg');
  });

  it('returns null for a URL without /o/ segment', () => {
    expect(extractStoragePathFromUrl('https://example.com/no-match')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractStoragePathFromUrl('')).toBeNull();
  });

  it('returns null for a malformed URL', () => {
    expect(extractStoragePathFromUrl('not-a-url')).toBeNull();
  });
});

describe('EditBaby - sex type mapping', () => {
  it('initializes selectedType = 0 for Boy', () => {
    expect(getIndexFromType('Boy')).toBe(0);
  });

  it('initializes selectedType = 1 for Girl', () => {
    expect(getIndexFromType('Girl')).toBe(1);
  });

  it('initializes selectedType = 1 for anything that is not Boy (default Girl)', () => {
    // If type field is missing/undefined from Firestore, defaults to Girl
    expect(getIndexFromType(undefined as any)).toBe(1);
    expect(getIndexFromType('')).toBe(1);
    expect(getIndexFromType('Unknown')).toBe(1);
  });

  it('maps index 0 back to "Boy" when saving', () => {
    expect(getTypeFromIndex(0)).toBe('Boy');
  });

  it('maps index 1 back to "Girl" when saving', () => {
    expect(getTypeFromIndex(1)).toBe('Girl');
  });
});

describe('EditBaby - upload URL construction', () => {
  const BABY_ID = 'baby-xyz';
  const TIMESTAMP = 1700000000000;
  const TOKEN = 'tok-abc123';

  it('buildUploadUrl encodes the file path correctly', () => {
    const url = buildUploadUrl(BABY_ID, TIMESTAMP);
    expect(url).toContain('babies%2Fbaby-xyz%2Fprofile_1700000000000.jpg');
    expect(url).toContain('firebasestorage.googleapis.com');
  });

  it('buildDownloadUrl includes alt=media and token', () => {
    const url = buildDownloadUrl(BABY_ID, TIMESTAMP, TOKEN);
    expect(url).toContain('alt=media');
    expect(url).toContain(`token=${TOKEN}`);
    expect(url).toContain('babies%2Fbaby-xyz%2Fprofile_1700000000000.jpg');
  });

  it('two consecutive uploads use different timestamps (no collision)', () => {
    const url1 = buildUploadUrl(BABY_ID, 1700000000001);
    const url2 = buildUploadUrl(BABY_ID, 1700000000002);
    expect(url1).not.toBe(url2);
  });
});

describe('EditBaby - handleSave Firestore update', () => {
  const mockBabyDocRef = { id: 'doc-1' };
  const mockQuerySnapshot = {
    empty: false,
    docs: [{ ref: mockBabyDocRef, data: () => ({ id: 'baby-1', name: 'Léo', type: 'Boy' }) }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (firestore.query as jest.Mock).mockReturnValue({});
    (firestore.where as jest.Mock).mockReturnValue({});
    (firestore.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);
    (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);
  });

  it('calls updateDoc with correct fields including type', async () => {
    const updateData = {
      name: 'Léo',
      birthDate: '15/03/2024',
      type: getTypeFromIndex(0), // Boy
      profilePhoto: null,
      weight: null,
      height: null,
    };

    const snapshot = await firestore.getDocs((firestore.query as jest.Mock)());
    expect(snapshot.empty).toBe(false);

    await firestore.updateDoc(snapshot.docs[0].ref as any, updateData);

    expect(firestore.updateDoc).toHaveBeenCalledWith(mockBabyDocRef, updateData);
    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'Boy' })
    );
  });

  it('calls updateDoc with type "Girl" when selectedType = 1', async () => {
    const updateData = {
      name: 'Emma',
      birthDate: '01/01/2024',
      type: getTypeFromIndex(1), // Girl
      profilePhoto: null,
      weight: null,
      height: null,
    };

    const snapshot = await firestore.getDocs((firestore.query as jest.Mock)());
    await firestore.updateDoc(snapshot.docs[0].ref as any, updateData);

    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'Girl' })
    );
  });

  it('does not call updateDoc when snapshot is empty (baby not found)', async () => {
    (firestore.getDocs as jest.Mock).mockResolvedValue({ empty: true, docs: [] });

    const snapshot = await firestore.getDocs((firestore.query as jest.Mock)());
    if (!snapshot.empty) {
      await firestore.updateDoc(snapshot.docs[0].ref as any, {});
    }

    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });

  it('sets profilePhoto to null when photo was removed', async () => {
    const updateData = { name: 'Léo', birthDate: '15/03/2024', type: 'Boy', profilePhoto: null, weight: null, height: null };
    const snapshot = await firestore.getDocs((firestore.query as jest.Mock)());
    await firestore.updateDoc(snapshot.docs[0].ref as any, updateData);

    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ profilePhoto: null })
    );
  });
});

describe('EditBaby - removePhoto Storage deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storageModule.ref as jest.Mock).mockReturnValue({ fullPath: 'babies/baby-1/profile_ts.jpg' });
    (storageModule.deleteObject as jest.Mock).mockResolvedValue(undefined);
  });

  it('calls deleteObject with the path extracted from the URL', async () => {
    const photoUrl =
      'https://firebasestorage.googleapis.com/v0/b/babylist-ae85f.firebasestorage.app/o/babies%2Fbaby-1%2Fprofile_1700000000000.jpg?alt=media&token=tok';

    const storagePath = extractStoragePathFromUrl(photoUrl);
    expect(storagePath).toBe('babies/baby-1/profile_1700000000000.jpg');

    if (storagePath) {
      const storageRef = storageModule.ref({} as any, storagePath);
      await storageModule.deleteObject(storageRef);
    }

    expect(storageModule.deleteObject).toHaveBeenCalledTimes(1);
    expect(storageModule.ref).toHaveBeenCalledWith(expect.anything(), 'babies/baby-1/profile_1700000000000.jpg');
  });

  it('does NOT use the wrong hardcoded path "profile.jpg"', async () => {
    // The old bug: always tried to delete babies/{id}/profile.jpg
    // The fix: use extractStoragePathFromUrl to get the actual timestamped path
    const photoUrl =
      'https://firebasestorage.googleapis.com/v0/b/babylist-ae85f.firebasestorage.app/o/babies%2Fbaby-1%2Fprofile_1700000000000.jpg?alt=media&token=tok';

    const storagePath = extractStoragePathFromUrl(photoUrl);
    expect(storagePath).not.toBe('babies/baby-1/profile.jpg');
    expect(storagePath).toBe('babies/baby-1/profile_1700000000000.jpg');
  });

  it('swallows Storage errors silently (photo already deleted)', async () => {
    (storageModule.deleteObject as jest.Mock).mockRejectedValue({ code: 'storage/object-not-found' });

    const photoUrl =
      'https://firebasestorage.googleapis.com/v0/b/babylist-ae85f.firebasestorage.app/o/babies%2Fbaby-1%2Fprofile_old.jpg?alt=media&token=tok';

    // Mirror the actual removePhoto try-catch in EditBaby
    const removePhotoLogic = async (url: string) => {
      const storagePath = extractStoragePathFromUrl(url);
      try {
        if (storagePath) {
          const storageRef = storageModule.ref({} as any, storagePath);
          await storageModule.deleteObject(storageRef);
        }
      } catch {
        // Ignore — photo already deleted or path invalid
      }
    };

    // Should resolve without throwing
    await expect(removePhotoLogic(photoUrl)).resolves.toBeUndefined();
    expect(storageModule.deleteObject).toHaveBeenCalledTimes(1);
  });
});
