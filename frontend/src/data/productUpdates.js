// Dates describe the evidence, not inferred deployment times. See design/CONTENT_MAINTENANCE_AUDIT.md.
export const productUpdates = [{
  date: '2026-10-14',
  dateLabel: 'availabilityVerified',
  commit: '6be6e3505c35e6d16f01a20f4edbc5600f523f0b',
  title: 'redesignRelease',
  changes: 'redesignChanges',
}, {
  date: '2026-10-09',
  dateLabel: 'availabilityVerified',
  commit: '94a6c61305198e9d0163bfb193189076cd022e11',
  title: 'accountRelease',
  changes: 'accountChanges',
}, {
  date: '2026-10-07',
  dateLabel: 'launchDate',
  commit: '3ccb8e409e7ab44c40e4da0763ed4f660c245c6d',
  title: 'mvpRelease',
  changes: 'mvpChanges',
}]

export const productRoadmap = {
  completed: ['career-ranking', 'skill-gaps', 'learning-roadmaps', 'career-comparison', 'course-discovery', 'private-accounts', 'community-feedback', 'guided-demo', 'ai-preview'],
  inProgress: [],
  planned: [],
  exploring: ['market-refresh', 'more-careers', 'recommendation-quality'],
}
