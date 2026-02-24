import React from 'react'
import { FormInput } from '@/components/form/FormInput'
import { Button } from '@/components/building-blocks/Button'
import { IconSearch } from '@tabler/icons-react'
import { useT } from '@/hooks/useT'

export interface SemanticSearchProps {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
  loading?: boolean
}

export function SemanticSearch({ value, onChange, onSearch, loading }: SemanticSearchProps) {
  const { t } = useT('categories')
  return (
    <div className="flex gap-2">
      <FormInput value={value} onChange={e => onChange(e.target.value)} placeholder={t('search.placeholder')} className="flex-1" onKeyDown={e => e.key === 'Enter' && onSearch()} />
      <Button icon={<IconSearch />} onClick={onSearch} loading={loading} />
    </div>
  )
}
