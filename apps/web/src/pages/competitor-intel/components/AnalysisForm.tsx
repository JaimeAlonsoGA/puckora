import React from 'react'
import { FormField } from '@/components/form/FormField'
import { FormInput } from '@/components/form/FormInput'
import { Button } from '@/components/building-blocks/Button'
import { IconSearch } from '@tabler/icons-react'
import { useT } from '@/hooks/useT'

export interface AnalysisFormProps {
  onSubmit: (asin: string) => void
  loading?: boolean
  initialAsin?: string
}

export function AnalysisForm({ onSubmit, loading, initialAsin }: AnalysisFormProps) {
  const { t } = useT('competitor')
  const [asin, setAsin] = React.useState(initialAsin ?? '')

  React.useEffect(() => {
    if (initialAsin) setAsin(initialAsin)
  }, [initialAsin])

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(asin) }} className="flex gap-2">
      <FormField label={t('form.asin')} className="flex-1">
        <FormInput
          value={asin}
          onChange={e => setAsin(e.target.value.toUpperCase())}
          placeholder="B0XXXXXXXXXX"
        />
      </FormField>
      <Button type="submit" icon={<IconSearch />} loading={loading} className="self-end">
        {t('form.analyze')}
      </Button>
    </form>
  )
}
