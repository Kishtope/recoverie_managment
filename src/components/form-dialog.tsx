import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/**
 * @component FormDialog
 * @description Dialog with a fixed header and footer and a scrolling body, for create/edit forms.
 * @param footer Buttons (cancel/save), pinned at the bottom.
 */
export const FormDialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={cn("flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-xl", className)}>
      <DialogHeader className="p-6 pb-4">
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      {/* The scroll area sizes its inner wrapper to the widest child; forcing min-w-0 makes wide content wrap instead of spilling out of the dialog. */}
      {/* The dialog only has a max-height, so percentage heights (the viewport's size-full) never resolve. Making the root a flex column and the viewport a flex-1 child lets it shrink to the dialog and scroll with the browser's own overflow. */}
      {/* Side padding lives on an inner wrapper (not the scroll root) so the scrollbar sits at the dialog edge and focus rings are not clipped; x-overflow is hidden so nothing spills sideways. */}
      <ScrollArea className="flex min-h-0 flex-1 flex-col overflow-hidden [&_[data-slot=scroll-area-viewport]]:h-auto! [&_[data-slot=scroll-area-viewport]]:min-h-0 [&_[data-slot=scroll-area-viewport]]:flex-1 [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden! [&_[data-slot=scroll-area-viewport]]:overscroll-contain [&_[data-slot=scroll-area-viewport]>div]:min-w-0!">
        <div className="min-w-0 px-6">{children}</div>
      </ScrollArea>
      {footer && <DialogFooter className="p-6 pt-4">{footer}</DialogFooter>}
    </DialogContent>
  </Dialog>
);
