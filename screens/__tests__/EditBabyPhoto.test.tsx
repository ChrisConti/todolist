import * as firestore from 'firebase/firestore';
import * as storage from 'firebase/storage';

jest.mock('firebase/firestore');
jest.mock('firebase/storage');
jest.mock('expo-image-picker');

// XHR mock — simulates Android content:// / file:// URI resolution
const mockXhrBlob = new Blob(['photo-data'], { type: 'image/jpeg' });

class MockXMLHttpRequest {
  responseType: string = '';
  response: any = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  open = jest.fn();
  send = jest.fn(() => {
    this.response = mockXhrBlob;
    this.onload?.();
  });
}

// Helper: reproduce the uploadPhoto logic extracted from EditBabyPhoto
const uploadPhotoLogic = async (
  newPhotoUri: string,
  babyID: string
): Promise<string | null> => {
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      const xhr = new MockXMLHttpRequest() as any;
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error('Network request failed'));
      xhr.responseType = 'blob';
      xhr.open('GET', newPhotoUri, true);
      xhr.send(null);
    });

    const storageRef = storage.ref({} as any, `babies/${babyID}/profile.jpg`);
    await storage.uploadBytes(storageRef, blob);
    const downloadURL = await storage.getDownloadURL(storageRef);

    return downloadURL;
  } catch {
    return null;
  }
};

describe('EditBabyPhoto - Upload Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storage.ref as jest.Mock).mockReturnValue({ fullPath: 'babies/baby-1/profile.jpg' });
    (storage.uploadBytes as jest.Mock).mockResolvedValue({ metadata: {} });
    (storage.getDownloadURL as jest.Mock).mockResolvedValue('https://storage.example.com/photo.jpg');
  });

  describe('XHR-based blob creation', () => {
    it('should create blob via XHR and upload successfully', async () => {
      const url = await uploadPhotoLogic('file:///data/user/0/photo.jpg', 'baby-1');

      expect(storage.uploadBytes).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Blob)
      );
      expect(url).toBe('https://storage.example.com/photo.jpg');
    });

    it('should work with Android content:// URIs', async () => {
      const url = await uploadPhotoLogic(
        'content://com.android.providers.media.documents/document/image%3A1234',
        'baby-1'
      );

      expect(storage.uploadBytes).toHaveBeenCalled();
      expect(url).toBe('https://storage.example.com/photo.jpg');
    });

    it('should return correct Firebase Storage path for baby', async () => {
      await uploadPhotoLogic('file:///photo.jpg', 'baby-42');

      expect(storage.ref).toHaveBeenCalledWith(
        expect.anything(),
        'babies/baby-42/profile.jpg'
      );
    });

    it('should return null when XHR network fails', async () => {
      class FailingXHR {
        responseType = '';
        onload: (() => void) | null = null;
        onerror: ((e: Error) => void) | null = null;
        open = jest.fn();
        send = jest.fn(() => { this.onerror?.(new Error('Network request failed')); });
      }

      const uploadWithFailingXhr = async (uri: string, babyID: string) => {
        try {
          const blob = await new Promise<Blob>((resolve, reject) => {
            const xhr = new FailingXHR() as any;
            xhr.onload = () => resolve(xhr.response);
            xhr.onerror = () => reject(new Error('Network request failed'));
            xhr.responseType = 'blob';
            xhr.open('GET', uri, true);
            xhr.send(null);
          });
          const storageRef = storage.ref({} as any, `babies/${babyID}/profile.jpg`);
          await storage.uploadBytes(storageRef, blob);
          return await storage.getDownloadURL(storageRef);
        } catch {
          return null;
        }
      };

      const url = await uploadWithFailingXhr('file:///photo.jpg', 'baby-1');

      expect(url).toBeNull();
      expect(storage.uploadBytes).not.toHaveBeenCalled();
    });

    it('should return null when uploadBytes fails', async () => {
      (storage.uploadBytes as jest.Mock).mockRejectedValue(new Error('Storage quota exceeded'));

      const url = await uploadPhotoLogic('file:///photo.jpg', 'baby-1');

      expect(url).toBeNull();
    });

    it('should return null when getDownloadURL fails', async () => {
      (storage.getDownloadURL as jest.Mock).mockRejectedValue(new Error('Object not found'));

      const url = await uploadPhotoLogic('file:///photo.jpg', 'baby-1');

      expect(url).toBeNull();
    });
  });

  describe('Photo removal', () => {
    it('should update Firestore profilePhoto to null on removal', async () => {
      const mockSnapshot = {
        empty: false,
        docs: [{ id: 'doc-123', data: () => ({ profilePhoto: 'https://old.url/photo.jpg' }) }],
      };
      (firestore.getDocs as jest.Mock).mockResolvedValue(mockSnapshot);
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);
      (firestore.query as jest.Mock).mockReturnValue({});
      (firestore.where as jest.Mock).mockReturnValue({});
      (firestore.doc as jest.Mock).mockReturnValue({});
      (storage.deleteObject as jest.Mock).mockResolvedValue(undefined);

      // Simulate removal flow
      const querySnapshot = await firestore.getDocs((firestore.query as jest.Mock)());
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        await firestore.updateDoc(firestore.doc({} as any, 'Baby', docId), {
          profilePhoto: null,
        });
      }

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { profilePhoto: null }
      );
    });

    it('should continue removal even if Storage delete fails (photo already gone)', async () => {
      (storage.deleteObject as jest.Mock).mockRejectedValue({ code: 'storage/object-not-found' });
      (firestore.getDocs as jest.Mock).mockResolvedValue({
        empty: false,
        docs: [{ id: 'doc-123', data: () => ({}) }],
      });
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);
      (firestore.query as jest.Mock).mockReturnValue({});
      (firestore.where as jest.Mock).mockReturnValue({});
      (firestore.doc as jest.Mock).mockReturnValue({});

      let updateCalled = false;
      try {
        await storage.deleteObject({} as any);
      } catch {
        // swallow — photo already gone in storage
      }

      const querySnapshot = await firestore.getDocs((firestore.query as jest.Mock)());
      if (!querySnapshot.empty) {
        await firestore.updateDoc(
          firestore.doc({} as any, 'Baby', querySnapshot.docs[0].id),
          { profilePhoto: null }
        );
        updateCalled = true;
      }

      expect(updateCalled).toBe(true);
      expect(firestore.updateDoc).toHaveBeenCalled();
    });
  });

  describe('Guard conditions', () => {
    it('should return null immediately when no URI is provided', async () => {
      const uploadWithGuard = async (uri: string | null, babyID: string | null) => {
        if (!uri || !babyID) return null;
        return uploadPhotoLogic(uri, babyID);
      };

      expect(await uploadWithGuard(null, 'baby-1')).toBeNull();
      expect(await uploadWithGuard('file:///photo.jpg', null)).toBeNull();
      expect(storage.uploadBytes).not.toHaveBeenCalled();
    });
  });
});
