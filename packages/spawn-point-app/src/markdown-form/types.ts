/**
 * A group of option checkboxes extracted from a configuration UI.
 **/
export interface OptionGroup {
  /** option values, keyed by the option name */
  values: Record<string, boolean>
}

export interface MarkdownConfig {
  /** true if the configuration source exists, or false if there is no config */
  exists: boolean

  /** option groups contained in the configuration, will be an empty array of exists == false */
  optionGroups: OptionGroup[]
}
