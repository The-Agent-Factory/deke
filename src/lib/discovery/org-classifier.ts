/**
 * Organization Classifier
 *
 * Classifies organizations by type based on keywords in the name/location.
 * Used to find similar organizations for lead discovery.
 */

export type OrgType =
  | 'UNIVERSITY'
  | 'COLLEGE'
  | 'HIGH_SCHOOL'
  | 'MIDDLE_SCHOOL'
  | 'ELEMENTARY_SCHOOL'
  | 'THEATRE'
  | 'THEATER'
  | 'CHOIR'
  | 'BARBERSHOP'
  | 'A_CAPPELLA_GROUP'
  | 'GOSPEL_CHOIR'
  | 'COMMUNITY_CHORUS'
  | 'YOUTH_CHOIR'
  | 'CHURCH'
  | 'SYNAGOGUE'
  | 'TEMPLE'
  | 'MOSQUE'
  | 'COMMUNITY_CENTER'
  | 'ARTS_CENTER'
  | 'MUSIC_SCHOOL'
  | 'CONSERVATORY'
  | 'PERFORMING_ARTS'
  | 'FESTIVAL'
  | 'CONFERENCE'
  | 'CONVENTION'
  | 'CORPORATE'
  | 'NONPROFIT'
  | 'UNKNOWN'

interface OrgPattern {
  type: OrgType
  keywords: string[]
  priority: number // Higher priority wins in case of multiple matches
}

// Organization patterns ordered by priority
const ORG_PATTERNS: OrgPattern[] = [
  // Educational institutions (highest priority for specificity)
  {
    type: 'UNIVERSITY',
    keywords: ['university', 'universidad', 'universidade'],
    priority: 10,
  },
  {
    type: 'COLLEGE',
    keywords: ['college', 'collegiate', 'community college'],
    priority: 9,
  },
  {
    type: 'HIGH_SCHOOL',
    keywords: ['high school', 'secondary school', 'preparatory', 'prep school'],
    priority: 8,
  },
  {
    type: 'MIDDLE_SCHOOL',
    keywords: ['middle school', 'junior high', 'intermediate school'],
    priority: 8,
  },
  {
    type: 'ELEMENTARY_SCHOOL',
    keywords: ['elementary', 'primary school', 'grade school'],
    priority: 8,
  },

  // Music and arts institutions (high priority for targeted music orgs)
  {
    type: 'BARBERSHOP',
    keywords: ['barbershop chorus', 'barbershop quartet', 'barbershop singers', 'sweet adelines', 'sai', 'harmony inc', 'harmony incorporated', 'spebsqsa', 'bhs chorus'],
    priority: 12,
  },
  {
    type: 'A_CAPPELLA_GROUP',
    keywords: ['a cappella', 'acappella', 'a-cappella', 'casa'],
    priority: 11,
  },
  {
    type: 'GOSPEL_CHOIR',
    keywords: ['gospel choir', 'gospel singers', 'gospel ensemble'],
    priority: 11,
  },
  {
    type: 'YOUTH_CHOIR',
    keywords: ['youth choir', 'children choir', 'children\'s choir', 'junior choir', 'student choir'],
    priority: 10,
  },
  {
    type: 'COMMUNITY_CHORUS',
    keywords: ['community chorus', 'community choir', 'civic chorus'],
    priority: 10,
  },
  {
    type: 'CONSERVATORY',
    keywords: ['conservatory', 'conservatoire'],
    priority: 9,
  },
  {
    type: 'MUSIC_SCHOOL',
    keywords: ['music school', 'school of music'],
    priority: 8,
  },
  {
    type: 'PERFORMING_ARTS',
    keywords: ['performing arts', 'school of arts', 'arts academy'],
    priority: 8,
  },

  // Venues and organizations
  {
    type: 'THEATRE',
    keywords: ['theatre', 'playhouse', 'opera house'],
    priority: 7,
  },
  {
    type: 'THEATER',
    keywords: ['theater', 'theatrical'],
    priority: 7,
  },
  {
    type: 'CHOIR',
    keywords: ['choir', 'chorale', 'chorus', 'singers', 'vocal ensemble'],
    priority: 9,
  },
  {
    type: 'ARTS_CENTER',
    keywords: ['arts center', 'arts centre', 'cultural center', 'cultural centre'],
    priority: 6,
  },

  // Religious institutions
  {
    type: 'CHURCH',
    keywords: ['church', 'cathedral', 'chapel', 'parish'],
    priority: 6,
  },
  {
    type: 'SYNAGOGUE',
    keywords: ['synagogue', 'temple', 'shul'],
    priority: 6,
  },
  {
    type: 'MOSQUE',
    keywords: ['mosque', 'masjid', 'islamic center'],
    priority: 6,
  },

  // Events
  {
    type: 'FESTIVAL',
    keywords: ['festival', 'fest'],
    priority: 5,
  },
  {
    type: 'CONFERENCE',
    keywords: ['conference', 'summit', 'symposium'],
    priority: 5,
  },
  {
    type: 'CONVENTION',
    keywords: ['convention', 'expo'],
    priority: 5,
  },

  // Organizations
  {
    type: 'COMMUNITY_CENTER',
    keywords: ['community center', 'community centre', 'recreation center', 'rec center'],
    priority: 5,
  },
  {
    type: 'NONPROFIT',
    keywords: ['nonprofit', 'non-profit', 'foundation', 'association'],
    priority: 4,
  },
  {
    type: 'CORPORATE',
    keywords: ['corporation', 'company', 'inc.', 'llc', 'ltd'],
    priority: 4,
  },
]

/**
 * Classify an organization based on its name or location text
 *
 * @param text - Organization name or location string
 * @returns The classified organization type
 *
 * @example
 * ```typescript
 * classifyOrganization('UCLA University') // 'UNIVERSITY'
 * classifyOrganization('Lincoln High School Choir') // 'HIGH_SCHOOL'
 * classifyOrganization('Community Theatre') // 'THEATRE'
 * ```
 */
export function classifyOrganization(text: string): OrgType {
  if (!text || text.trim().length === 0) {
    return 'UNKNOWN'
  }

  const normalizedText = text.toLowerCase().trim()

  // Find all matching patterns
  const matches = ORG_PATTERNS.filter((pattern) =>
    pattern.keywords.some((keyword) => normalizedText.includes(keyword))
  )

  // Return the highest priority match
  if (matches.length > 0) {
    matches.sort((a, b) => b.priority - a.priority)
    return matches[0].type
  }

  return 'UNKNOWN'
}

/**
 * Extract organization type from a booking location string
 *
 * @param location - Booking location (e.g., "UCLA, Los Angeles, CA")
 * @returns The classified organization type
 */
export function classifyFromLocation(location: string | null | undefined): OrgType {
  if (!location) {
    return 'UNKNOWN'
  }

  // Try to extract organization name from location
  // Typically format: "Organization Name, City, State"
  const parts = location.split(',')
  if (parts.length > 0) {
    return classifyOrganization(parts[0].trim())
  }

  return classifyOrganization(location)
}

/**
 * Get search keywords for finding similar organizations
 *
 * @param orgType - The organization type to find similar organizations for
 * @returns Array of keywords to search for
 */
export function getSimilarOrgKeywords(orgType: OrgType): string[] {
  const pattern = ORG_PATTERNS.find((p) => p.type === orgType)
  return pattern ? pattern.keywords : []
}

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  UNIVERSITY: 'University',
  COLLEGE: 'College',
  HIGH_SCHOOL: 'High School',
  MIDDLE_SCHOOL: 'Middle School',
  ELEMENTARY_SCHOOL: 'Elementary School',
  THEATRE: 'Theatre',
  THEATER: 'Theater',
  CHOIR: 'Choir',
  BARBERSHOP: 'Barbershop',
  A_CAPPELLA_GROUP: 'A Cappella Group',
  GOSPEL_CHOIR: 'Gospel Choir',
  COMMUNITY_CHORUS: 'Community Chorus',
  YOUTH_CHOIR: 'Youth Choir',
  CHURCH: 'Church',
  SYNAGOGUE: 'Synagogue',
  TEMPLE: 'Temple',
  MOSQUE: 'Mosque',
  COMMUNITY_CENTER: 'Community Center',
  ARTS_CENTER: 'Arts Center',
  MUSIC_SCHOOL: 'Music School',
  CONSERVATORY: 'Conservatory',
  PERFORMING_ARTS: 'Performing Arts',
  FESTIVAL: 'Festival',
  CONFERENCE: 'Conference',
  CONVENTION: 'Convention',
  CORPORATE: 'Corporate',
  NONPROFIT: 'Nonprofit',
  UNKNOWN: 'Music Organization',
}

/**
 * Get a human-friendly label for an organization type.
 *
 * @example
 * getOrgTypeLabel('HIGH_SCHOOL') // 'High School'
 * getOrgTypeLabel('A_CAPPELLA_GROUP') // 'A Cappella Group'
 */
export function getOrgTypeLabel(orgType: OrgType): string {
  return ORG_TYPE_LABELS[orgType] ?? 'Music Organization'
}
