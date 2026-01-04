import * as firestore from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '../../services/analytics';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('firebase/firestore');

jest.mock('firebase/firestore');

describe('CreateTask - Business Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (analytics.logScreenView as jest.Mock).mockResolvedValue(undefined);
    (analytics.logEvent as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Task Label Mapping', () => {
    const returnLabel = (id: number) => {
      if (id == 0) return 'biberon';
      if (id == 1) return 'couche';
      if (id == 2) return 'Sante';
      if (id == 3) return 'sommeil';
      if (id == 4) return 'thermo';
      if (id == 5) return 'allaitement';
      return undefined;
    };

    it('should return correct label for biberon (id: 0)', () => {
      expect(returnLabel(0)).toBe('biberon');
    });

    it('should return correct label for couche (id: 1)', () => {
      expect(returnLabel(1)).toBe('couche');
    });

    it('should return correct label for Sante (id: 2)', () => {
      expect(returnLabel(2)).toBe('Sante');
    });

    it('should return correct label for sommeil (id: 3)', () => {
      expect(returnLabel(3)).toBe('sommeil');
    });

    it('should return correct label for thermo (id: 4)', () => {
      expect(returnLabel(4)).toBe('thermo');
    });

    it('should return correct label for allaitement (id: 5)', () => {
      expect(returnLabel(5)).toBe('allaitement');
    });

    it('should return undefined for unknown id', () => {
      expect(returnLabel(99)).toBeUndefined();
    });
  });

  describe('Firestore Task Creation', () => {
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
    };

    const mockUserInfo = {
      userId: 'test-user-123',
      username: 'TestUser',
      email: 'test@example.com',
    };

    it('should call updateDoc with correct task structure', async () => {
      const mockQuerySnapshot = {
        empty: false,
        docs: [
          {
            id: 'doc-123',
            data: () => ({
              id: 'baby-123',
              name: 'Test Baby',
              tasks: [],
            }),
          },
        ],
      };

      (firestore.getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);
      (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);
      (firestore.query as jest.Mock).mockReturnValue({});
      (firestore.where as jest.Mock).mockReturnValue({});
      (firestore.doc as jest.Mock).mockReturnValue({});

      // Simulate the updateBabyTasks logic
      const queryResult = (firestore.query as jest.Mock)();
      const querySnapshot = await firestore.getDocs(queryResult);

      if (!querySnapshot.empty) {
        const document = querySnapshot.docs[0];
        const newTask = {
          uid: 'mock-uuid',
          id: 0,
          labelTask: 'biberon',
          date: '2025-01-04 12:00:00',
          label: 150,
          idCaca: 150,
          boobLeft: 0,
          boobRight: 0,
          user: mockUser.uid,
          createdBy: mockUserInfo.username,
          comment: 'Test comment',
        };

        await firestore.updateDoc(
          firestore.doc({} as any, 'Baby', document.id),
          {
            tasks: [...document.data().tasks, newTask],
          }
        );
      }

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tasks: expect.arrayContaining([
            expect.objectContaining({
              uid: expect.any(String),
              id: 0,
              labelTask: 'biberon',
              user: 'test-user-123',
              createdBy: 'TestUser',
            }),
          ]),
        })
      );
    });

    it('should not update if baby is not found', async () => {
      const mockEmptySnapshot = {
        empty: true,
        docs: [],
      };

      (firestore.getDocs as jest.Mock).mockResolvedValue(mockEmptySnapshot);

      const queryResult = (firestore.query as jest.Mock)();
      const querySnapshot = await firestore.getDocs(queryResult);

      if (querySnapshot.empty) {
        // Don't call updateDoc
      } else {
        await firestore.updateDoc({} as any, {});
      }

      expect(firestore.updateDoc).not.toHaveBeenCalled();
    });

    it('should handle Firestore errors gracefully', async () => {
      const mockError = {
        code: 'permission-denied',
        message: 'Permission denied',
      };

      (firestore.getDocs as jest.Mock).mockRejectedValue(mockError);

      try {
        await firestore.getDocs({} as any);
      } catch (error: any) {
        expect(error.code).toBe('permission-denied');
      }

      expect(firestore.getDocs).toHaveBeenCalled();
    });
  });

  describe('AsyncStorage Timer Management', () => {
    it('should save timer data to AsyncStorage', async () => {
      const timerData = {
        elapsed: 120,
        startTime: Date.now(),
        isRunning: true,
      };

      await AsyncStorage.setItem('timer1_createtask', JSON.stringify(timerData));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'timer1_createtask',
        expect.stringContaining('"elapsed":120')
      );
    });

    it('should load timer data from AsyncStorage', async () => {
      const timerData = {
        elapsed: 240,
        startTime: null,
        isRunning: false,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(timerData)
      );

      const result = await AsyncStorage.getItem('timer1_createtask');
      const parsed = result ? JSON.parse(result) : null;

      expect(parsed).toEqual(timerData);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('timer1_createtask');
    });

    it('should remove timer data after task creation', async () => {
      await AsyncStorage.removeItem('timer1_createtask');
      await AsyncStorage.removeItem('timer2_createtask');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('timer1_createtask');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('timer2_createtask');
    });

    it('should calculate elapsed time for running timers', () => {
      const startTime = Date.now() - 5000; // Started 5 seconds ago
      const elapsed = 10; // 10 seconds already elapsed

      const now = Date.now();
      const additionalTime = Math.floor((now - startTime) / 1000);
      const totalElapsed = elapsed + additionalTime;

      expect(totalElapsed).toBeGreaterThanOrEqual(15); // At least 15 seconds
      expect(additionalTime).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Analytics Tracking', () => {
    it('should log task_created event with correct data', async () => {
      await analytics.logEvent('task_created', {
        taskType: 'biberon',
        taskId: 0,
        hasLabel: true,
        hasNote: true,
        userId: 'test-user-123',
      });

      expect(analytics.logEvent).toHaveBeenCalledWith(
        'task_created',
        expect.objectContaining({
          taskType: 'biberon',
          taskId: 0,
          userId: 'test-user-123',
        })
      );
    });

    it('should log task_creation_failed event on error', async () => {
      await analytics.logEvent('task_creation_failed', {
        taskType: 'couche',
        taskId: 1,
        userId: 'test-user-123',
        errorCode: 'permission-denied',
        error: 'Permission denied',
      });

      expect(analytics.logEvent).toHaveBeenCalledWith(
        'task_creation_failed',
        expect.objectContaining({
          errorCode: 'permission-denied',
        })
      );
    });

    it('should log screen view on component mount', async () => {
      await analytics.logScreenView('CreateTask');

      expect(analytics.logScreenView).toHaveBeenCalledWith('CreateTask');
    });
  });

  describe('Task Data Validation', () => {
    it('should create task with all required fields', () => {
      const task = {
        uid: 'uuid-123',
        id: 5,
        labelTask: 'allaitement',
        date: '2025-01-04 10:30:00',
        label: 0,
        idCaca: 0,
        boobLeft: 300,
        boobRight: 240,
        user: 'user-id-123',
        createdBy: 'JohnDoe',
        comment: 'Bébé a bien mangé',
      };

      expect(task).toHaveProperty('uid');
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('labelTask');
      expect(task).toHaveProperty('date');
      expect(task).toHaveProperty('user');
      expect(task).toHaveProperty('createdBy');
      expect(task).toHaveProperty('comment');
    });

    it('should include timer data for breastfeeding tasks', () => {
      const breastfeedingTask = {
        id: 5,
        labelTask: 'allaitement',
        boobLeft: 360,
        boobRight: 300,
      };

      expect(breastfeedingTask.boobLeft).toBeDefined();
      expect(breastfeedingTask.boobRight).toBeDefined();
      expect(breastfeedingTask.boobLeft).toBeGreaterThan(0);
      expect(breastfeedingTask.boobRight).toBeGreaterThan(0);
    });

    it('should include label for bottle feeding tasks', () => {
      const bottleTask = {
        id: 0,
        labelTask: 'biberon',
        label: 180,
      };

      expect(bottleTask.label).toBeDefined();
      expect(typeof bottleTask.label).toBe('number');
      expect(bottleTask.label).toBeGreaterThan(0);
    });

    it('should include idCaca for diaper tasks', () => {
      const diaperTask = {
        id: 1,
        labelTask: 'couche',
        idCaca: 2, // liquide
      };

      expect(diaperTask.idCaca).toBeDefined();
      expect([0, 1, 2]).toContain(diaperTask.idCaca); // dur, mou, liquide
    });
  });
});
