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
      <ScrollArea className="min-h-0 flex-1 px-6">{children}</ScrollArea>
      {footer && <DialogFooter className="p-6 pt-4">{footer}</DialogFooter>}
    </DialogContent>
  </Dialog>
);
