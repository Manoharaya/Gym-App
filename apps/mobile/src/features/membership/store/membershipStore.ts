import { create } from 'zustand';

interface MembershipUIState {
  selectedCategory: string;
  selectedOutletId: string | null;
  isCancelModalVisible: boolean;
  selectedMembershipIdForCancel: string | null;

  setSelectedCategory: (category: string) => void;
  setSelectedOutletId: (outletId: string | null) => void;
  openCancelModal: (membershipId: string) => void;
  closeCancelModal: () => void;
}

export const useMembershipStore = create<MembershipUIState>((set) => ({
  selectedCategory: 'ALL',
  selectedOutletId: null,
  isCancelModalVisible: false,
  selectedMembershipIdForCancel: null,

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedOutletId: (outletId) => set({ selectedOutletId: outletId }),
  openCancelModal: (membershipId) =>
    set({ isCancelModalVisible: true, selectedMembershipIdForCancel: membershipId }),
  closeCancelModal: () =>
    set({ isCancelModalVisible: false, selectedMembershipIdForCancel: null }),
}));
