export { amazonCategoryVectorSource, amazonKeywordVectorSource, amazonProductVectorSource } from './amazon'

import {
    amazonCategoryVectorSource,
    amazonKeywordVectorSource,
    amazonProductVectorSource,
} from './amazon'

export const defaultVectorSources = [
    amazonProductVectorSource,
    amazonKeywordVectorSource,
    amazonCategoryVectorSource,
] as const