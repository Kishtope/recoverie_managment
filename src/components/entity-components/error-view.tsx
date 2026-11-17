import { AlertTriangleIcon } from "lucide-react";
import { Button } from "../ui/button";

interface ErrorViewProps{
    message?: string,
    // When given, shows a "Try again" button that calls it.
    onRetry?: () => void,
}

/**
 * Displays a centered error indicator with an optional message and retry button.
 * @param {ErrorViewProps} props Component properties.
 * @param {string} [props.message] Optional error description to surface.
 * @param {() => void} [props.onRetry] Optional retry handler.
 */
export const ErrorView = ({
    message,
    onRetry,
} : ErrorViewProps)=> {
    return (
        <div className=" flex justify-center items-center h-full flex-1 flex-col gap-y-4">
            <AlertTriangleIcon className="text-primary size-8" />

            {!!message && <p className="text-sm text-muted-foreground">{message}</p>}
            {!!onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}
        </div>
    )
}
