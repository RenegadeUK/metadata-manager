export type AppPage = 'dashboard' | 'onboarding' | 'runtime' | 'seed' | 'items'

export type MappingFeedback = {
  mappingId: number
  kind: 'success' | 'error'
  message: string
}
