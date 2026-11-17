import { SearchIcon } from 'lucide-react';
import React from 'react'
import { Input } from '../ui/input';

interface Props {
    value : string;
    onChange : (value : string) => void;
    placeholder? : string
}

/**
 * Lightweight search input for filtering entity lists.
 * @param value Current search query.
 * @param onChange Callback fired with the updated query text.
 * @param [placeholder="search"] Optional input placeholder.
 * @example
 * ```tsx
 * <EntitySearch value={query} onChange={setQuery} placeholder="Find workflow" />
 * ```
 */
export const EntitySearch = ({
    value,
    onChange,
    placeholder = "search"
} : Props) => {
    return (
        // Right-aligned and allowed to shrink (min 8rem, max 200px) so it stays on the filter row when "Clear filters" appears, instead of wrapping to a new line.
        <div className=' relative w-full basis-full sm:ml-auto sm:w-auto sm:min-w-32 sm:max-w-50 sm:flex-1 sm:basis-32'>
            <SearchIcon className=' size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
            <Input
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className=' pl-8 sm:max-w-[200px] bg-background shadow-none border-border ' 
            />
        </div>
    )
}
