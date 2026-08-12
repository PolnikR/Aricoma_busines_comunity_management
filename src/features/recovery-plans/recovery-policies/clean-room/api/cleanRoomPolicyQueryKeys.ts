export const cleanRoomPolicyKeys = {
  all: ['clean-room-policies'] as const,
  list: () => [...cleanRoomPolicyKeys.all, 'list'] as const,
}
