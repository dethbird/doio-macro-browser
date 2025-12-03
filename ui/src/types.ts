export interface Application {
  id: number
  name: string
}

export interface Profile {
  id: number
  application_id: number
  name: string
  json_filename: string | null
  json: unknown
}

export interface Translation {
  id: number
  via_macro: string
  application_id: number | null
  human_label: string
}

// VIA JSON structure
export interface ViaProfile {
  name: string
  vendorProductId: number
  macros: string[]
  layers: string[][]
  encoders: string[][][]
}
