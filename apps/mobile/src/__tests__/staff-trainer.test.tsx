import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StaffDirectoryScreen } from '../features/staff/screens/StaffDirectoryScreen';
import { TrainerDirectoryScreen } from '../features/trainer/screens/TrainerDirectoryScreen';
import { TrainerProfileScreen } from '../features/trainer/screens/TrainerProfileScreen';
import { TrainerClientsScreen } from '../features/trainer/screens/TrainerClientsScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

let mockRouteParams: any = { trainerId: 'tr_marcus_vance_001' };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

// Mock staffService
jest.mock('../features/staff/services/staffService', () => ({
  staffService: {
    getAllStaff: jest.fn().mockResolvedValue([]),
    inviteStaff: jest.fn().mockResolvedValue({ id: 'staff_new' }),
    transitionStatus: jest.fn().mockResolvedValue({ id: 'staff_1', employmentStatus: 'ON_LEAVE' }),
    getOutletAssignments: jest.fn().mockResolvedValue([]),
  },
}));

// Mock trainerService
jest.mock('../features/trainer/services/trainerService', () => ({
  trainerService: {
    getAllTrainers: jest.fn().mockResolvedValue([]),
    getTrainerById: jest.fn().mockResolvedValue(null),
    getTrainerClients: jest.fn().mockResolvedValue([]),
    addCertification: jest.fn().mockResolvedValue({ id: 'cert_new' }),
    assignClient: jest.fn().mockResolvedValue({ id: 'asgn_new' }),
    reassignClient: jest.fn().mockResolvedValue({ id: 'asgn_reassigned' }),
  },
}));

describe('Day 11 — Staff and Trainer Management Mobile Screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('StaffDirectoryScreen', () => {
    it('renders staff list with employee details and status badges', async () => {
      const { getByText } = render(<StaffDirectoryScreen />);

      expect(getByText('Staff Directory')).toBeTruthy();
      expect(getByText('Marcus Vance')).toBeTruthy();
      expect(getByText('Sarah Miller')).toBeTruthy();
      expect(getByText('EMP-SW-004')).toBeTruthy();
      expect(getByText('EMP-SW-002')).toBeTruthy();
    });

    it('filters staff directory when search query is entered', async () => {
      const { getByPlaceholderText, queryByText } = render(<StaffDirectoryScreen />);

      expect(queryByText('Marcus Vance')).toBeTruthy();
      const searchInput = getByPlaceholderText(/search by name/i);
      fireEvent.changeText(searchInput, 'Marcus');

      expect(queryByText('Marcus Vance')).toBeTruthy();
      expect(queryByText('Sarah Miller')).toBeNull();
    });
  });

  describe('TrainerDirectoryScreen', () => {
    it('renders trainer directory with specialties, experience, and action buttons', async () => {
      const { getByText, getAllByText } = render(<TrainerDirectoryScreen />);

      expect(getByText('Marcus Vance')).toBeTruthy();
      expect(getByText('8 yrs exp')).toBeTruthy();
      expect(getAllByText('Strength & Conditioning').length).toBeGreaterThan(0);
      expect(getAllByText('Olympic Weightlifting').length).toBeGreaterThan(0);
      expect(getAllByText('Profile & Certs').length).toBeGreaterThan(0);
      expect(getAllByText('Clients Roster').length).toBeGreaterThan(0);
    });
  });

  describe('TrainerProfileScreen', () => {
    it('renders trainer profile details, philosophy, and verified certifications', async () => {
      const { getByText } = render(<TrainerProfileScreen />);

      expect(getByText('Marcus Vance')).toBeTruthy();
      expect(getByText('BIOGRAPHY & PHILOSOPHY')).toBeTruthy();
      expect(getByText('COACHING STYLE')).toBeTruthy();
      expect(getByText('VERIFIED CERTIFICATIONS')).toBeTruthy();
      expect(getByText('CSCS - Certified Strength and Conditioning Specialist')).toBeTruthy();
      expect(getByText('National Strength and Conditioning Association (NSCA)')).toBeTruthy();
      expect(getByText(/Expiring within 90 days/i)).toBeTruthy();
      expect(getByText('Manage Assigned Clients')).toBeTruthy();
    });
  });

  describe('TrainerClientsScreen', () => {
    it('renders assigned client list with primary trainer badge and details', async () => {
      const { getByText, getAllByText } = render(<TrainerClientsScreen />);

      expect(getByText('Alex Mercer')).toBeTruthy();
      expect(getAllByText('PRIMARY').length).toBeGreaterThan(0);
      expect(getByText('member@secondwind.com.au')).toBeTruthy();
      expect(getAllByText('Reassign Coach').length).toBeGreaterThan(0);
      expect(getAllByText('End Assignment').length).toBeGreaterThan(0);
    });
  });
});
