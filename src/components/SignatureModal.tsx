import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SignaturePad } from "@/components/SignaturePad";

interface SignatureModalProps {
  open: boolean;
  title: string;
  showExtraFields?: boolean;
  onCancel: () => void;
  onSave: (signatureData: string, extraData?: { name?: string; position?: string }) => void;
}

export const SignatureModal = ({
  open,
  title,
  showExtraFields = false,
  onCancel,
  onSave,
}: SignatureModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <SignaturePad
          title=""
          showExtraFields={showExtraFields}
          onSave={(data, extra) => {
            onSave(data, extra);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
