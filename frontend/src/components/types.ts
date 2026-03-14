export type AppPage = 'onboarding' | 'runtime' | 'seed' | 'items'

export type MappingFeedback = {
  mappingId: number
  kind: 'success' | 'error'
  message: string
}
