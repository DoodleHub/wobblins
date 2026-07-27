/** Central query key factory — keeps cache keys consistent across hooks so mutations invalidate the right screens. */
export const queryKeys = {
  player: (playerId: string | undefined) => ["player", playerId] as const,
  featuredWobblin: (playerId: string | undefined) => ["featuredWobblin", playerId] as const,
  playerWobblins: (playerId: string | undefined) => ["playerWobblins", playerId] as const,
  wobblin: (id: string | undefined) => ["wobblin", id] as const,
  starterSpecies: () => ["starterSpecies"] as const,
  allSpecies: () => ["allSpecies"] as const,
  myGroups: (playerId: string | undefined) => ["myGroups", playerId] as const,
  publicGroups: () => ["publicGroups"] as const,
  group: (groupId: string | undefined) => ["group", groupId] as const,
  groupMembers: (groupId: string | undefined) => ["groupMembers", groupId] as const,
  groupTasks: (groupId: string | undefined) => ["groupTasks", groupId] as const,
  task: (taskId: string | undefined) => ["task", taskId] as const,
  myActiveTasks: (playerId: string | undefined) => ["myActiveTasks", playerId] as const,
  taskForRewardWobblin: (wobblinId: string | undefined) => ["taskForRewardWobblin", wobblinId] as const,
  submissionPhotoUrl: (path: string | null | undefined) => ["submissionPhotoUrl", path] as const,
  taskApplications: (taskId: string | undefined) => ["taskApplications", taskId] as const,
  myTaskApplication: (taskId: string | undefined, playerId: string | undefined) =>
    ["myTaskApplication", taskId, playerId] as const,
  myEggs: (playerId: string | undefined) => ["myEggs", playerId] as const,
};
