export interface Facet extends Record<string, unknown> {
  /** type discriminator for the facet */
  type: string
}

export interface StaticContentFacet extends Facet {
  /** path within the managed repository to write the content */
  path: string

  /** source containing the static content */
  source: string

  type: 'static-content'
}

export interface SpawnPointConfig {
  /** set of blueprint IDs to inherit from */
  extends: string[]

  /** individual facets enabled by this configuration */
  facets: Facet[]
}
