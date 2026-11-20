import React from 'react'
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '../ui/spinner';

type Props = {
    title: string;
    description?: string;
    newButtonLabel?: string;
    disabled?: boolean;
    isCreating?: boolean;
    // Extra controls (e.g. an export button) rendered next to the create button.
    actions?: React.ReactNode;
} & (
        | { onNew: () => void; newButtonHref?: never }
        | { newButtonHref: string; onNew?: never }
        | { onNew?: never; newButtonHref?: never }
    )

/**
 * Header block for entity listing screens, optionally rendering creation controls.
 * @param title Main label shown in the heading.
 * @param description Additional context below the title (render support planned downstream).
 * @param onNew Callback triggered when the inline create button is clicked.
 * @param newButtonHref Alternate navigation target for the create button.
 * @param newButtonLabel Copy for the create action button.
 * @param disabled Disables the create interaction while true.
 * @param isCreating Indicates an in-flight creation state (e.g. show spinner in parent).
 * @example
 * ```tsx
 * <EntityHeader
 *   title="Projects"
 *   description="Manage active project spaces"
 *   newButtonLabel="New Project"
 *   onNew={() => setShowCreateModal(true)}
 * />
 * ```
 */
export const EntityHeader = ({
    title,
    description,
    onNew,
    newButtonHref,
    newButtonLabel,
    disabled,
    isCreating,
    actions
}: Props) => {
    return (
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4'>
            <div className='flex min-w-0 flex-1 flex-col'>
                <h1 className='text-lg md:text-xl font-semibold'>{title}</h1>
                {description && (
                    <p className=' text-xs md:text-sm text-muted-foreground'>
                        {description}
                    </p>
                )}
            </div>
            <div className='flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap sm:justify-end'>
            {actions}
            {onNew && !newButtonHref && (
                <Button
                    disabled={isCreating || disabled}
                    size={"sm"}
                    onClick={onNew}
                >
                    {isCreating ? <Spinner className='size-4'/> : <PlusIcon className=' size-4' />}
                    {newButtonLabel}
                </Button>
            )}

            {!onNew && newButtonHref && (
                <Button
                    size={"sm"}
                    nativeButton={false}
                    render={<Link href={newButtonHref} />}
                >
                    <PlusIcon className=' size-4' />
                    {newButtonLabel}
                </Button>
            )}
            </div>
        </div>
    )
}




