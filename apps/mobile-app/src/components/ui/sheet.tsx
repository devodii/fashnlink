import * as React from 'react';
import BottomSheet, { BottomSheetView, type BottomSheetProps } from '@gorhom/bottom-sheet';

/**
 * @gorhom/bottom-sheet, not @rn-primitives/dialog's plain modal — matches
 * the reference project and is the RN ecosystem standard for this kind of
 * sheet. Bridges its imperative ref API to a controlled open/onOpenChange
 * prop so call sites read the same as the web Dialog's API shape.
 */
type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  snapPoints?: BottomSheetProps['snapPoints'];
};

function Sheet({ open, onOpenChange, children, snapPoints = ['50%'] }: SheetProps) {
  const sheetRef = React.useRef<BottomSheet>(null);

  React.useEffect(() => {
    if (open) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [open]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={() => onOpenChange(false)}
    >
      <BottomSheetView className="flex-1 p-4">{children}</BottomSheetView>
    </BottomSheet>
  );
}

export { Sheet };
