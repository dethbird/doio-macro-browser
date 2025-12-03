export interface Application {
  id: number
  name: string
}

export interface Profile {
  id: number
  application_id: number
  name: string
  json: unknown
}
