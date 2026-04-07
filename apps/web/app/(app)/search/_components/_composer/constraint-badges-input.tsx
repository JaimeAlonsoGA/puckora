'use client'

import { CONSTRAINT_FIELDS, type ConstraintFieldId } from '@/constants/search'
import { type AmazonCategoryId } from '@/constants/amazon-categories'
import { ConstraintBadge, type ConstraintEntry } from './constraint-badge'
import { CategoryBadge } from './category-badge'

export function ConstraintBadgesInput({
    constraints,
    onUpdate,
    categories,
    onToggleCategory,
    onSelectAllCategories,
    onResetCategories,
    disabled,
}: {
    constraints: Partial<Record<ConstraintFieldId, ConstraintEntry>>
    onUpdate: (id: ConstraintFieldId, val: ConstraintEntry) => void
    categories: Set<AmazonCategoryId>
    onToggleCategory: (id: AmazonCategoryId) => void
    onSelectAllCategories: () => void
    onResetCategories: () => void
    disabled?: boolean
}) {
    return (
        <div className="flex min-h-10 w-full flex-row flex-wrap items-center gap-2">
            {CONSTRAINT_FIELDS.map(field => (
                <ConstraintBadge
                    key={field.id}
                    field={field}
                    value={constraints[field.id]}
                    onChange={v => onUpdate(field.id, v)}
                    disabled={disabled}
                />
            ))}
            <CategoryBadge
                selected={categories}
                onToggle={onToggleCategory}
                onSelectAll={onSelectAllCategories}
                onReset={onResetCategories}
                disabled={disabled}
            />
        </div>
    )
}
