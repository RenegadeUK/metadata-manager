export type AppPage = 'dashboard' | 'onboarding' | 'runtime' | 'scan-jobs' | 'scan-results'

export type MappingFeedback = {
  mappingId: number
  kind: 'success' | 'error'
  message: string
}
