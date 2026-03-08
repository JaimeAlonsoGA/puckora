// Platform-specific types that don't exist in the database

/** Supported application languages */
export type AppLanguage = 'en' | 'es'

/** All supported locale codes (must match i18n routing) */
export const SUPPORTED_LOCALES = ['en', 'es'] as const satisfies readonly AppLanguage[]

/** Fallback locale when no preference is set or detected */
export const DEFAULT_LANGUAGE: AppLanguage = 'en'

/** Fallback marketplace when no preference is set */
export const DEFAULT_MARKETPLACE = 'US' as const

/** Amazon marketplace identifiers */
export type AmazonMarketplace =
  | 'US' | 'UK' | 'DE' | 'FR' | 'IT' | 'ES'
  | 'CA' | 'JP' | 'MX' | 'BR' | 'AU' | 'IN'
  | 'SG' | 'AE' | 'SA' | 'NL' | 'SE' | 'PL'
  | 'BE' | 'TR'

/** Marketplace metadata for display */
export type MarketplaceInfo = {
  id: AmazonMarketplace
  name: string
  flag: string
  domain: string
  currency: string
}

/** All available marketplaces with their metadata */
export const MARKETPLACES: readonly MarketplaceInfo[] = [
  { id: 'US', name: 'United States', flag: '🇺🇸', domain: 'amazon.com', currency: 'USD' },
  { id: 'UK', name: 'United Kingdom', flag: '🇬🇧', domain: 'amazon.co.uk', currency: 'GBP' },
  { id: 'DE', name: 'Germany', flag: '🇩🇪', domain: 'amazon.de', currency: 'EUR' },
  { id: 'FR', name: 'France', flag: '🇫🇷', domain: 'amazon.fr', currency: 'EUR' },
  { id: 'IT', name: 'Italy', flag: '🇮🇹', domain: 'amazon.it', currency: 'EUR' },
  { id: 'ES', name: 'Spain', flag: '🇪🇸', domain: 'amazon.es', currency: 'EUR' },
  { id: 'CA', name: 'Canada', flag: '🇨🇦', domain: 'amazon.ca', currency: 'CAD' },
  { id: 'JP', name: 'Japan', flag: '🇯🇵', domain: 'amazon.co.jp', currency: 'JPY' },
  { id: 'MX', name: 'Mexico', flag: '🇲🇽', domain: 'amazon.com.mx', currency: 'MXN' },
  { id: 'BR', name: 'Brazil', flag: '🇧🇷', domain: 'amazon.com.br', currency: 'BRL' },
  { id: 'AU', name: 'Australia', flag: '🇦🇺', domain: 'amazon.com.au', currency: 'AUD' },
  { id: 'IN', name: 'India', flag: '🇮🇳', domain: 'amazon.in', currency: 'INR' },
  { id: 'SG', name: 'Singapore', flag: '🇸🇬', domain: 'amazon.sg', currency: 'SGD' },
  { id: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', domain: 'amazon.ae', currency: 'AED' },
  { id: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', domain: 'amazon.sa', currency: 'SAR' },
  { id: 'NL', name: 'Netherlands', flag: '🇳🇱', domain: 'amazon.nl', currency: 'EUR' },
  { id: 'SE', name: 'Sweden', flag: '🇸🇪', domain: 'amazon.se', currency: 'SEK' },
  { id: 'PL', name: 'Poland', flag: '🇵🇱', domain: 'amazon.pl', currency: 'PLN' },
  { id: 'BE', name: 'Belgium', flag: '🇧🇪', domain: 'amazon.com.be', currency: 'EUR' },
  { id: 'TR', name: 'Turkey', flag: '🇹🇷', domain: 'amazon.com.tr', currency: 'TRY' },
] as const
